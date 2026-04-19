import { useCallback } from 'react';
import { useStore } from '../state/use-store';
import { useUndoStore } from '../state/use-undo';
import type { PageBridge } from '../state/use-page-bridge';
import { selectElements } from '../state/dom-bridge';
import { getElementInfoById, getElementInfo } from './element-info';

interface DomOperation {
    type: 'dom';
    action: 'add' | 'delete';
    nodeId: number;
    element: Element;
    parentId: number;
    beforeSiblingId: number | null;
}

interface SingleOperation {
    type: 'style' | 'attribute' | 'attribute-delete' | 'text' | 'token' | 'keyframe';
    nodeId: number | null;
    property: string;
    oldValue: string;
    newValue: string;
    oldAnimSnapshot?: unknown;
    newAnimSnapshot?: unknown;
}

interface BatchOperation {
    type: 'batch';
    operations: SingleOperation[];
}

type UndoEntry = SingleOperation | BatchOperation | DomOperation;

export function useUndoApply({ bridge }: { bridge: PageBridge }) {
    const { setComputedStyles, setSelectedAttributes, setSelectedTextContent, setElementVariables, queueEdit, selectNode, clearSelection } = useStore();

    const applyDomOperation = useCallback(
        (op: DomOperation, direction: 'undo' | 'redo') => {
            const shouldRemove =
                (direction === 'undo' && op.action === 'add') ||
                (direction === 'redo' && op.action === 'delete');
            if (shouldRemove) {
                bridge.detachElement(op.nodeId);
                bridge.fetchDomTree();
                clearSelection();
                selectElements([], null);
                queueEdit({ type: 'delete', value: (op.element as HTMLElement).localName });
            } else {
                const newId = bridge.reinsertElement(op.element, op.parentId, op.beforeSiblingId);
                if (newId !== null) {
                    op.nodeId = newId;
                    bridge.fetchDomTree();
                    selectNode(newId);
                    selectElements([newId], newId);
                    bridge.fetchStyles(newId);
                    queueEdit({ type: 'add-child', value: (op.element as HTMLElement).localName });
                }
            }
        },
        [bridge, clearSelection, selectNode, queueEdit],
    );

    const applySingleOperation = useCallback(
        (op: SingleOperation, direction: 'undo' | 'redo') => {
            const value = direction === 'undo' ? op.oldValue : op.newValue;
            const from = direction === 'undo' ? op.newValue : op.oldValue;
            switch (op.type) {
                case 'style':
                    if (op.nodeId !== null) {
                        bridge.setStyleProperty(op.nodeId, op.property, value);
                        if (op.nodeId === useStore.getState().selectedNodeId) {
                            const updated = { ...useStore.getState().computedStyles, [op.property]: value };
                            setComputedStyles(updated);
                        }
                        if (op.property.startsWith('--')) {
                            const selId = useStore.getState().selectedNodeId;
                            if (selId !== null) setElementVariables(bridge.fetchElementVariables(selId));
                        }
                    }
                    break;
                case 'attribute':
                    if (op.nodeId !== null) {
                        bridge.setAttribute(op.nodeId, op.property, value);
                        setSelectedAttributes({ ...useStore.getState().selectedAttributes, [op.property]: value });
                    }
                    break;
                case 'attribute-delete':
                    if (op.nodeId !== null) {
                        if (value) {
                            bridge.setAttribute(op.nodeId, op.property, value);
                            setSelectedAttributes({ ...useStore.getState().selectedAttributes, [op.property]: value });
                        } else {
                            bridge.removeAttribute(op.nodeId, op.property);
                            const attrs = { ...useStore.getState().selectedAttributes };
                            delete attrs[op.property];
                            setSelectedAttributes(attrs);
                        }
                    }
                    break;
                case 'text':
                    if (op.nodeId !== null) {
                        bridge.setTextContent(op.nodeId, value);
                        setSelectedTextContent(value);
                    }
                    break;
                case 'token':
                    if (value === '') {
                        bridge.removeDocumentProperty(`--${op.property}`);
                    } else {
                        bridge.setDocumentProperty(`--${op.property}`, value);
                    }
                    bridge.fetchDesignTokens();
                    {
                        const selId = useStore.getState().selectedNodeId;
                        if (selId !== null) setElementVariables(bridge.fetchElementVariables(selId));
                    }
                    break;
                case 'keyframe': {
                    const snapshot = direction === 'undo' ? op.oldAnimSnapshot : op.newAnimSnapshot;
                    if (snapshot) {
                        useStore.getState().setAnimValueAnimations(structuredClone(snapshot));
                    }
                    break;
                }
            }
            if (op.type === 'keyframe') {
                queueEdit({ type: 'keyframe', name: op.property, value });
            } else {
                const undoType = op.type === 'attribute' ? 'attr' : op.type === 'attribute-delete' ? 'attr-delete' : op.type;
                queueEdit({
                    type: undoType,
                    ...(op.nodeId !== null ? getElementInfoById(op.nodeId) : {}),
                    name: op.property,
                    value: `${from} → ${value}`,
                });
            }
        },
        [bridge, setComputedStyles, setSelectedAttributes, setSelectedTextContent, setElementVariables, queueEdit],
    );

    const applyEntry = useCallback(
        (entry: UndoEntry, direction: 'undo' | 'redo') => {
            if (entry.type === 'batch') {
                for (const op of entry.operations) applySingleOperation(op, direction);
            } else if (entry.type === 'dom') {
                applyDomOperation(entry, direction);
            } else {
                applySingleOperation(entry as SingleOperation, direction);
            }
        },
        [applySingleOperation, applyDomOperation],
    );

    return { applySingleOperation, applyEntry };
}
