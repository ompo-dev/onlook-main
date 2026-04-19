import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStore } from './use-store';
import { convertTree } from '../utils/convert-tree';
import { findNodeInTree } from '../utils/find-node';
import { SHORTHAND_CONFIGS, synthesizeShorthand, synthesizeBorderShorthand } from '../utils/css-shorthand';
import {
    initBridge,
    destroyBridge,
    fetchDomTree,
    fetchStyles,
    fetchDesignTokens,
    fetchElementVariables,
    setStyleProperty,
    setAttribute,
    removeAttribute,
    setTextContent,
    highlightElement,
    selectElement,
    setDocumentProperty,
    removeDocumentProperty,
    removeElement,
    detachElement,
    getNextSiblingId,
    reinsertElement,
    replaceTag,
    addChildElement,
    findInsertionSibling,
    addSiblingElement,
    duplicateElement,
    moveElement,
    getParentId,
    getSiblingIds,
    getFlexInfo,
    getChildRectsAndIds,
    showReorderLine,
    hideReorderLine,
    showReorderGhost,
    hideReorderGhost,
    startDragTransform,
    updateDragTransform,
    clearDragTransform,
    getAbsolutePositionInfo,
    getElementRect,
    getElementQuadById,
    startAbsDragTransform,
    clearAbsDragTransform,
    fetchPageMetadata,
    setPageMetadataField,
    startContextMenuListener,
    observeElement,
    observeBody,
    isElementConnected,
    buildElementSelector,
    findReplacementElement,
    purgeDetachedElements,
} from './dom-bridge';
import { refreshControls } from './visual-controls';
import { getTheme } from './dom-bridge';

const AUTO_EXPAND_TAGS = ['html', 'body'];

function autoExpandDefaults(tree: ReturnType<typeof convertTree>) {
    const toExpand: number[] = [tree.id];
    function walk(node: typeof tree) {
        if (AUTO_EXPAND_TAGS.includes(node.localName)) {
            toExpand.push(node.id);
        }
        for (const child of node.children) {
            walk(child as typeof tree);
        }
    }
    walk(tree);
    if (toExpand.length > 0) {
        useStore.setState((state) => {
            const expanded = { ...state.expandedNodes };
            for (const id of toExpand) {
                expanded[id] = true;
            }
            return { expandedNodes: expanded };
        });
    }
}

export interface PageBridgeOptions {
    onContextMenu?: (result: { id: number; x: number; y: number }) => void;
}

export function usePageBridge(options?: PageBridgeOptions) {
    const userEditsRef = useRef<Record<string, string>>({});
    const contextMenuRef = useRef(options?.onContextMenu);
    contextMenuRef.current = options?.onContextMenu;

    const {
        setDomTree,
        setProperties,
        setComputedStyles,
        setParentDisplay,
        setDesignTokens,
        setElementVariables,
        selectNode,
        setSelectedAttributes,
        setSelectedTextContent,
        setPickingElement,
    } = useStore();

    const fetchDomTree2 = useCallback(() => {
        try {
            const raw = fetchDomTree();
            const tree = convertTree(raw);
            setDomTree(tree);
            autoExpandDefaults(tree);
            return tree;
        } catch (e) {
            console.error('[css-studio] Failed to fetch DOM tree:', e);
            return null;
        }
    }, [setDomTree]);

    const fetchStyles2 = useCallback(
        (id: number) => {
            try {
                const result = fetchStyles(id);
                if (!result) return;
                const properties: { name: string; value: string; source: string; selector?: string }[] = [];
                const computed = result.computed ?? {};
                const authored: Record<string, string> = {};
                if (result.matched) {
                    for (const rule of result.matched) {
                        for (const [name, value] of Object.entries(rule.properties)) {
                            authored[name] = value as string;
                            properties.push({ name, value: value as string, source: 'matched', selector: rule.selector });
                        }
                    }
                }
                if (result.inline) {
                    for (const [name, value] of Object.entries(result.inline)) {
                        if (value) {
                            authored[name] = value as string;
                            properties.push({ name, value: value as string, source: 'inline' });
                        }
                    }
                }
                const display: Record<string, string> = { ...computed };
                for (const [name, value] of Object.entries(authored)) {
                    display[name] = value;
                }
                const AUTO_DEFAULT_PROPS = ['width', 'height', 'min-width', 'min-height', 'top', 'right', 'bottom', 'left'];
                for (const prop of AUTO_DEFAULT_PROPS) {
                    if (!authored[prop] && display[prop]) {
                        display[prop] = 'auto';
                    }
                }
                for (const [shorthand, longhands] of SHORTHAND_CONFIGS) {
                    synthesizeShorthand(display, shorthand, longhands);
                }
                synthesizeBorderShorthand(display);
                for (const [prop, value] of Object.entries(userEditsRef.current)) {
                    if (authored[prop] === value) {
                        delete userEditsRef.current[prop];
                    } else {
                        display[prop] = value;
                    }
                }
                setProperties(properties);
                setComputedStyles(display);
                setParentDisplay(result.parentDisplay);
                try {
                    setElementVariables(fetchElementVariables(id));
                } catch {
                    //
                }
            } catch (e) {
                console.error('[css-studio] Failed to fetch styles:', e);
            }
        },
        [setProperties, setComputedStyles, setParentDisplay, setElementVariables],
    );

    const fetchTokens = useCallback(() => {
        try {
            const tokens = fetchDesignTokens();
            setDesignTokens(tokens);
        } catch (e) {
            console.error('[css-studio] Failed to fetch design tokens:', e);
        }
    }, [setDesignTokens]);

    const setStyle2 = useCallback((id: number, property: string, value: string) => {
        userEditsRef.current[property] = value;
        setStyleProperty(id, property, value);
    }, []);

    const selectedNodeId = useStore((s) => s.selectedNodeId);

    useEffect(() => {
        if (selectedNodeId === null) {
            return;
        }
        userEditsRef.current = {};
        observeElement(selectedNodeId, () => {
            const nodeId = useStore.getState().selectedNodeId;
            if (nodeId !== null) {
                fetchStyles2(nodeId);
                fetchDomTree2();
                refreshControls(useStore.getState().computedStyles, getTheme());
            }
        });
    }, [selectedNodeId, fetchStyles2, fetchDomTree2]);

    useEffect(() => {
        let cancelled = false;
        function handleBodyDirty() {
            const { selectedNodeId: selId } = useStore.getState();
            let selectorForReselect: string | null = null;
            let staleSelection = false;
            if (selId !== null && !isElementConnected(selId)) {
                selectorForReselect = buildElementSelector(selId);
                staleSelection = true;
            }
            const tree = fetchDomTree2();
            if (staleSelection) {
                let newId: number | null = null;
                if (selectorForReselect) {
                    newId = findReplacementElement(selectorForReselect, selId!);
                }
                if (newId !== null) {
                    const store = useStore.getState();
                    store.selectNode(newId);
                    store.expandToNode(newId);
                    selectElement(newId);
                    observeElement(newId);
                    fetchStyles2(newId);
                    if (tree) {
                        const node = findNodeInTree(tree, newId);
                        if (node) {
                            store.setSelectedAttributes(node.attributes ?? {});
                            store.setSelectedTextContent(node.textContent ?? '');
                        }
                    }
                } else {
                    useStore.getState().selectNode(null);
                    selectElement(null);
                }
            }
            purgeDetachedElements();
        }
        function init() {
            initBridge();
            if (cancelled) return;
            startContextMenuListener((result) => {
                if (contextMenuRef.current) contextMenuRef.current(result);
            });
            fetchDomTree2();
            if (cancelled) return;
            fetchTokens();
            observeBody(handleBodyDirty);
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init, { once: true });
        } else {
            init();
        }
        return () => {
            cancelled = true;
            destroyBridge();
        };
    }, [fetchDomTree2, fetchStyles2]);

    return useMemo(
        () => ({
            fetchDomTree: fetchDomTree2,
            fetchStyles: fetchStyles2,
            fetchDesignTokens: fetchTokens,
            fetchElementVariables,
            setStyleProperty: setStyle2,
            setAttribute,
            removeAttribute,
            setTextContent,
            highlightElement,
            selectElement,
            setDocumentProperty,
            removeDocumentProperty,
            removeElement,
            detachElement,
            getNextSiblingId,
            reinsertElement,
            replaceTag,
            addChildElement,
            findInsertionSibling,
            addSiblingElement,
            duplicateElement,
            moveElement,
            getParentId,
            getSiblingIds,
            getFlexInfo,
            getChildRectsAndIds,
            showReorderLine,
            hideReorderLine,
            showReorderGhost,
            hideReorderGhost,
            startDragTransform,
            updateDragTransform,
            clearDragTransform,
            getAbsolutePositionInfo,
            getElementRect,
            getElementQuad: getElementQuadById,
            startAbsDragTransform,
            clearAbsDragTransform,
            fetchPageMetadata,
            setPageMetadataField,
        }),
        [fetchDomTree2, fetchStyles2, fetchTokens, setStyle2],
    );
}

export type PageBridge = ReturnType<typeof usePageBridge>;
