import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../state/use-store';
import { useUndoStore } from '../state/use-undo';
import type { PageBridge } from '../state/use-page-bridge';
import {
    selectElements,
    getElement,
    scrollElementIntoView,
    stopPicker,
    stopDrawMode,
} from '../state/dom-bridge';
import { activateControls, deactivateControls, refreshControls } from '../state/visual-controls';
import { findNodeInTree } from '../utils/find-node';
import { getElementInfoById, getElementInfo, PROTECTED_TAGS4 } from './element-info';
import { getTheme } from '../state/dom-bridge';

interface ContextMenu {
    nodeId: number;
    x: number;
    y: number;
}

export function useDomOperations({
    bridge,
    contextMenu,
    setContextMenu,
}: {
    bridge: PageBridge;
    contextMenu: ContextMenu | null;
    setContextMenu: (cm: ContextMenu | null) => void;
}) {
    const {
        selectedNodeId,
        selectedNodeIds,
        selectNode,
        selectNodes,
        toggleNodeSelection,
        removeFromSelection,
        clearSelection,
        expandToNode,
        addPendingAttachment,
        openChat,
        setSelectedAttributes,
        setSelectedTextContent,
        setComputedStyles,
        setElementVariables,
        queueEdit,
    } = useStore();

    const undoPush = useUndoStore((s) => s.push);
    const undoPushDom = useUndoStore((s) => s.pushDom);
    const undoPushBatch = useUndoStore((s) => s.pushBatch);
    const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handlePropertyChangeRef = useRef<(prop: string, val: string) => void>(() => {});
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastHoveredIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (selectedNodeId === null || selectedNodeIds.length > 1) {
            deactivateControls();
            return;
        }
        const el = getElement(selectedNodeId);
        if (!el) return;
        const cs = useStore.getState().computedStyles;
        activateControls(el, cs, getTheme(), (prop, val) => {
            handlePropertyChangeRef.current(prop, val);
        });
    }, [selectedNodeId, selectedNodeIds.length]);

    const animTimeline = useStore((s) => s.animTimeline);
    const timelineOpen = useStore((s) => s.panels.timeline.open);
    const selectedKeyframesName = useStore((s) => s.selectedKeyframesName);

    useEffect(() => {
        if (selectedNodeId === null) return;
        const cs = useStore.getState().computedStyles;
        refreshControls(cs, getTheme());
    }, [animTimeline, timelineOpen, selectedKeyframesName, selectedNodeId]);

    const handleSelectNode = useCallback(
        (nodeId: number) => {
            selectNode(nodeId);
            expandToNode(nodeId);
            selectElements([nodeId], nodeId);
            bridge.fetchStyles(nodeId);
            const state = useStore.getState();
            const node = findNodeInTree(state.domTree, nodeId);
            if (node) {
                setSelectedAttributes(node.attributes ?? {});
                setSelectedTextContent(node.textContent ?? '');
            }
        },
        [selectNode, expandToNode, bridge, setSelectedAttributes, setSelectedTextContent],
    );

    const handleToggleSelectNode = useCallback(
        (nodeId: number) => {
            toggleNodeSelection(nodeId);
            expandToNode(nodeId);
            const state = useStore.getState();
            const ids = state.selectedNodeIds;
            const primaryId = state.selectedNodeId;
            selectElements(ids, primaryId);
            if (primaryId !== null) {
                bridge.fetchStyles(primaryId);
                const node = findNodeInTree(state.domTree, primaryId);
                if (node) {
                    setSelectedAttributes(node.attributes ?? {});
                    setSelectedTextContent(node.textContent ?? '');
                }
            }
        },
        [toggleNodeSelection, expandToNode, bridge, setSelectedAttributes, setSelectedTextContent],
    );

    const handleSelectNodes = useCallback(
        (nodeIds: number[]) => {
            selectNodes(nodeIds);
            for (const id of nodeIds) expandToNode(id);
            const state = useStore.getState();
            const ids = state.selectedNodeIds;
            const primaryId = state.selectedNodeId;
            selectElements(ids, primaryId);
            if (primaryId !== null) {
                bridge.fetchStyles(primaryId);
                const node = findNodeInTree(state.domTree, primaryId);
                if (node) {
                    setSelectedAttributes(node.attributes ?? {});
                    setSelectedTextContent(node.textContent ?? '');
                }
            }
        },
        [selectNodes, expandToNode, bridge, setSelectedAttributes, setSelectedTextContent],
    );

    const handleInlineTextEdit = useCallback(
        (id: number, oldText: string, newText: string) => {
            undoPush({ type: 'text', nodeId: id, property: 'textContent', oldValue: oldText, newValue: newText });
            setSelectedTextContent(newText);
            queueEdit({ type: 'text', ...getElementInfoById(id), value: `${oldText} → ${newText}` });
        },
        [undoPush, setSelectedTextContent, queueEdit],
    );

    const handlePromptIconClick = useCallback(
        (nodeId: number) => {
            const info = getElementInfoById(nodeId);
            const label = info.element;
            addPendingAttachment({ nodeId, label });
            openChat();
        },
        [addPendingAttachment, openChat],
    );

    const handlePropertyChange = useCallback(
        (property: string, value: string) => {
            if (selectedNodeId === null) return;
            const state = useStore.getState();
            const ids = state.selectedNodeIds;
            const oldValue = state.computedStyles[property] ?? '';
            if (value === oldValue && ids.length <= 1) return;
            if (ids.length > 1) {
                const ops: unknown[] = [];
                for (const id of ids) {
                    bridge.setStyleProperty(id, property, value);
                    const info = getElementInfoById(id);
                    ops.push({ type: 'style', nodeId: id, property, oldValue, newValue: value });
                    queueEdit({ type: 'style', ...info, name: property, value: `${oldValue} → ${value}` });
                }
                undoPushBatch(ops as Parameters<typeof undoPushBatch>[0]);
            } else {
                undoPush({ type: 'style', nodeId: selectedNodeId, property, oldValue, newValue: value });
                bridge.setStyleProperty(selectedNodeId, property, value);
                queueEdit({ type: 'style', ...getElementInfo(), name: property, value: `${oldValue} → ${value}` });
            }
            setComputedStyles({ ...state.computedStyles, [property]: value });
            if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
            refetchTimerRef.current = setTimeout(() => {
                const nodeId = useStore.getState().selectedNodeId;
                if (nodeId !== null) bridge.fetchStyles(nodeId);
            }, 800);
        },
        [selectedNodeId, bridge, setComputedStyles, queueEdit, undoPush, undoPushBatch],
    );

    handlePropertyChangeRef.current = handlePropertyChange;

    const handleAttributeChange = useCallback(
        (name: string, value: string) => {
            if (selectedNodeId === null) return;
            const oldValue = useStore.getState().selectedAttributes[name] ?? '';
            if (value === oldValue) return;
            undoPush({ type: 'attribute', nodeId: selectedNodeId, property: name, oldValue, newValue: value });
            bridge.setAttribute(selectedNodeId, name, value);
            setSelectedAttributes({ ...useStore.getState().selectedAttributes, [name]: value });
            queueEdit({ type: 'attr', ...getElementInfo(), name, value: `${oldValue} → ${value}` });
        },
        [selectedNodeId, bridge, setSelectedAttributes, queueEdit, undoPush],
    );

    const handleAttributeDelete = useCallback(
        (name: string) => {
            if (selectedNodeId === null) return;
            const oldValue = useStore.getState().selectedAttributes[name] ?? '';
            undoPush({ type: 'attribute-delete', nodeId: selectedNodeId, property: name, oldValue, newValue: '' });
            bridge.removeAttribute(selectedNodeId, name);
            const attrs = { ...useStore.getState().selectedAttributes };
            delete attrs[name];
            setSelectedAttributes(attrs);
            queueEdit({ type: 'attr-delete', ...getElementInfo(), name });
        },
        [selectedNodeId, bridge, setSelectedAttributes, queueEdit, undoPush],
    );

    const handleAttributeRename = useCallback(
        (oldName: string, newName: string) => {
            if (selectedNodeId === null) return;
            const value = useStore.getState().selectedAttributes[oldName] ?? '';
            bridge.setAttribute(selectedNodeId, newName, value);
            bridge.removeAttribute(selectedNodeId, oldName);
            const attrs = { ...useStore.getState().selectedAttributes };
            delete attrs[oldName];
            attrs[newName] = value;
            setSelectedAttributes(attrs);
            queueEdit({ type: 'attr-rename', ...getElementInfo(), name: oldName, value: newName });
        },
        [selectedNodeId, bridge, setSelectedAttributes, queueEdit],
    );

    const handleElementVariableChange = useCallback(
        (name: string, value: string, originNodeId: number | null) => {
            const oldValue = useStore.getState().elementVariables.find((v) => v.name === name)?.value ?? '';
            if (value === oldValue) return;
            if (originNodeId !== null) {
                undoPush({ type: 'style', nodeId: originNodeId, property: `--${name}`, oldValue, newValue: value });
                bridge.setStyleProperty(originNodeId, `--${name}`, value);
            } else {
                undoPush({ type: 'token', nodeId: null, property: name, oldValue, newValue: value });
                bridge.setDocumentProperty(`--${name}`, value);
            }
            queueEdit({ type: 'token', name, value: `${oldValue} → ${value}` });
            if (selectedNodeId !== null) {
                setElementVariables(bridge.fetchElementVariables(selectedNodeId));
            }
            bridge.fetchDesignTokens();
        },
        [selectedNodeId, bridge, queueEdit, undoPush, setElementVariables],
    );

    const handleNewElementVariable = useCallback(
        (name: string, value: string) => {
            if (selectedNodeId === null) return;
            undoPush({ type: 'style', nodeId: selectedNodeId, property: `--${name}`, oldValue: '', newValue: value });
            bridge.setStyleProperty(selectedNodeId, `--${name}`, value);
            queueEdit({ type: 'style', ...getElementInfo(), name: `--${name}`, value: `→ ${value}` });
            setElementVariables(bridge.fetchElementVariables(selectedNodeId));
        },
        [selectedNodeId, bridge, queueEdit, undoPush, setElementVariables],
    );

    const handleHoverNode = useCallback(
        (id: number | null) => {
            if (id === lastHoveredIdRef.current) return;
            lastHoveredIdRef.current = id;
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = setTimeout(() => {
                bridge.highlightElement(id);
            }, 50);
        },
        [bridge],
    );

    const handleTreeContextMenu = useCallback(
        (nodeId: number, x: number, y: number) => {
            const state = useStore.getState();
            const node = findNodeInTree(state.domTree, nodeId);
            if (!node || PROTECTED_TAGS4.has(node.localName)) return;
            setContextMenu({ nodeId, x, y });
        },
        [setContextMenu],
    );

    const handleTagChange = useCallback(
        (nodeId: number, newTag: string) => {
            const node = findNodeInTree(useStore.getState().domTree, nodeId);
            if (!node) return;
            const oldTag = node.localName;
            const info = getElementInfoById(nodeId);
            const newId = bridge.replaceTag(nodeId, newTag);
            if (newId === null) return;
            bridge.fetchDomTree();
            selectNode(newId);
            expandToNode(newId);
            bridge.selectElement(newId);
            bridge.fetchStyles(newId);
            queueEdit({ type: 'tag', ...info, value: `${oldTag} → ${newTag}` });
        },
        [bridge, selectNode, expandToNode, queueEdit],
    );

    const deleteElement = useCallback(
        (nodeId: number) => {
            const node = findNodeInTree(useStore.getState().domTree, nodeId);
            if (!node || PROTECTED_TAGS4.has(node.localName)) return;
            const info = getElementInfoById(nodeId);
            const parentId = bridge.getParentId(nodeId);
            const beforeSiblingId = bridge.getNextSiblingId(nodeId);
            const el = getElement(nodeId);
            const removed = bridge.removeElement(nodeId);
            if (!removed) return;
            if (el && parentId !== null) {
                undoPushDom({ type: 'dom', action: 'delete', element: el, parentId, beforeSiblingId, nodeId });
            }
            const state = useStore.getState();
            if (state.selectedNodeIds.length > 1) {
                removeFromSelection(nodeId);
                selectElements(useStore.getState().selectedNodeIds, useStore.getState().selectedNodeId);
            } else if (state.selectedNodeId === nodeId) {
                clearSelection();
                selectElements([], null);
            }
            bridge.fetchDomTree();
            queueEdit({ type: 'delete', ...info });
        },
        [bridge, removeFromSelection, clearSelection, undoPushDom, queueEdit],
    );

    const handleDeleteElement = useCallback(() => {
        if (!contextMenu) return;
        const ids = useStore.getState().selectedNodeIds;
        if (ids.length > 1) {
            for (const id of [...ids].reverse()) deleteElement(id);
        } else {
            deleteElement(contextMenu.nodeId);
        }
    }, [contextMenu, deleteElement]);

    const handleAddChild = useCallback(() => {
        if (!contextMenu) return;
        const { nodeId } = contextMenu;
        const info = getElementInfoById(nodeId);
        const newId = bridge.addChildElement(nodeId, 'div');
        if (newId === null) return;
        const el = getElement(newId);
        if (el) {
            undoPushDom({ type: 'dom', action: 'add', element: el, parentId: nodeId, beforeSiblingId: bridge.getNextSiblingId(newId), nodeId: newId });
        }
        bridge.fetchDomTree();
        expandToNode(nodeId);
        selectNode(newId);
        expandToNode(newId);
        bridge.selectElement(newId);
        bridge.fetchStyles(newId);
        scrollElementIntoView(newId);
        queueEdit({ type: 'add-child', ...info, value: 'div' });
    }, [contextMenu, bridge, expandToNode, selectNode, undoPushDom, queueEdit]);

    const handleAddSibling = useCallback(() => {
        if (!contextMenu) return;
        const { nodeId } = contextMenu;
        const info = getElementInfoById(nodeId);
        const newId = bridge.addSiblingElement(nodeId, 'div');
        if (newId === null) return;
        const parentId = bridge.getParentId(newId);
        const el = getElement(newId);
        if (el && parentId !== null) {
            undoPushDom({ type: 'dom', action: 'add', element: el, parentId, beforeSiblingId: bridge.getNextSiblingId(newId), nodeId: newId });
        }
        bridge.fetchDomTree();
        selectNode(newId);
        expandToNode(newId);
        bridge.selectElement(newId);
        bridge.fetchStyles(newId);
        scrollElementIntoView(newId);
        queueEdit({ type: 'add-sibling', ...info, value: 'div' });
    }, [contextMenu, bridge, selectNode, expandToNode, undoPushDom, queueEdit]);

    const duplicateElement = useCallback(
        (nodeId: number) => {
            const node = findNodeInTree(useStore.getState().domTree, nodeId);
            if (!node || PROTECTED_TAGS4.has(node.localName)) return;
            const info = getElementInfoById(nodeId);
            const newId = bridge.duplicateElement(nodeId);
            if (newId === null) return;
            const parentId = bridge.getParentId(newId);
            const el = getElement(newId);
            if (el && parentId !== null) {
                undoPushDom({ type: 'dom', action: 'add', element: el, parentId, beforeSiblingId: bridge.getNextSiblingId(newId), nodeId: newId });
            }
            bridge.fetchDomTree();
            selectNode(newId);
            expandToNode(newId);
            bridge.selectElement(newId);
            bridge.fetchStyles(newId);
            scrollElementIntoView(newId);
            queueEdit({ type: 'duplicate', ...info });
        },
        [bridge, selectNode, expandToNode, undoPushDom, queueEdit],
    );

    const handleDuplicateElement = useCallback(() => {
        if (!contextMenu) return;
        const ids = useStore.getState().selectedNodeIds;
        if (ids.length > 1) {
            for (const id of ids) duplicateElement(id);
        } else {
            duplicateElement(contextMenu.nodeId);
        }
    }, [contextMenu, duplicateElement]);

    const handleReorder = useCallback(
        (movedId: number, newParentId: number, beforeSiblingId: number | null) => {
            bridge.moveElement(movedId, newParentId, beforeSiblingId);
            bridge.fetchDomTree();
            selectNode(movedId);
            expandToNode(movedId);
            bridge.selectElement(movedId);
            bridge.fetchStyles(movedId);
            queueEdit({ type: 'reorder', ...getElementInfoById(movedId) });
        },
        [bridge, selectNode, expandToNode, queueEdit],
    );

    const handleDrawElement = useCallback(
        (parentId: number, rect: { w: number; h: number }) => {
            const info = getElementInfoById(parentId);
            const beforeId = bridge.findInsertionSibling(parentId, rect);
            const newId = bridge.addChildElement(parentId, 'div', beforeId);
            if (newId === null) return;
            bridge.setStyleProperty(newId, 'width', rect.w + 'px');
            bridge.setStyleProperty(newId, 'height', rect.h + 'px');
            const el = getElement(newId);
            if (el) {
                undoPushDom({ type: 'dom', action: 'add', element: el, parentId, beforeSiblingId: bridge.getNextSiblingId(newId), nodeId: newId });
            }
            bridge.fetchDomTree();
            expandToNode(parentId);
            selectNode(newId);
            expandToNode(newId);
            bridge.selectElement(newId);
            bridge.fetchStyles(newId);
            scrollElementIntoView(newId);
            queueEdit({ type: 'add-child', ...info, value: `div (${rect.w}×${rect.h})` });
        },
        [bridge, expandToNode, selectNode, undoPushDom, queueEdit],
    );

    const handleAbsPositionChange = useCallback(
        (nodeId: number, changes: { property: string; oldValue: string; newValue: string }[]) => {
            for (const { property, oldValue, newValue } of changes) {
                undoPush({ type: 'style', nodeId, property, oldValue, newValue });
            }
            const updated = { ...useStore.getState().computedStyles };
            for (const { property, newValue } of changes) updated[property] = newValue;
            setComputedStyles(updated);
            bridge.fetchStyles(nodeId);
            for (const { property, oldValue, newValue } of changes) {
                queueEdit({ type: 'style', ...getElementInfo(), name: property, value: `${oldValue} → ${newValue}` });
            }
        },
        [undoPush, setComputedStyles, bridge, queueEdit],
    );

    const handleMetadataChange = useCallback(
        (field: string, value: string) => {
            bridge.setPageMetadataField(field, value);
            queueEdit({ type: 'metadata', name: field, value });
        },
        [bridge, queueEdit],
    );

    return {
        handleSelectNode,
        handleSelectNodes,
        handleToggleSelectNode,
        handleInlineTextEdit,
        handlePromptIconClick,
        handlePropertyChange,
        handleAttributeChange,
        handleAttributeDelete,
        handleAttributeRename,
        handleElementVariableChange,
        handleNewElementVariable,
        handleHoverNode,
        handleTreeContextMenu,
        handleTagChange,
        deleteElement,
        handleDeleteElement,
        handleAddChild,
        handleAddSibling,
        duplicateElement,
        handleDuplicateElement,
        handleDrawElement,
        handleReorder,
        handleAbsPositionChange,
        handleMetadataChange,
    };
}
