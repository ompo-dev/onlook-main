import { useCallback, useEffect, useMemo, useRef } from 'react';
import { reaction } from 'mobx';
import { useEditorEngine } from '@/components/store/editor';
import { useStore } from './use-store';
import type { CssProperty } from './slices/styles-slice';
import { convertTree } from '../utils/convert-tree';
import type { DomNode } from '../utils/convert-tree';
import { findNodeInTree } from '../utils/find-node';
import { SHORTHAND_CONFIGS, synthesizeShorthand, synthesizeBorderShorthand } from '../utils/css-shorthand';
import { getOnlookBridgeId, getOnlookBridgeRef } from './onlook-bridge-map';
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
    setBridgeFrameTargetsProvider,
} from './dom-bridge';
import { refreshControls } from './visual-controls';
import { getTheme } from './dom-bridge';
import type { DomElement, LayerNode } from '@onlook/models';
import { EditorAttributes } from '@onlook/constants';

const AUTO_EXPAND_TAGS = ['html', 'body'];
const RESELECT_RETRY_DELAY_MS = 120;
const RESELECT_RETRY_ATTEMPTS = 10;

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
    const editorEngine = useEditorEngine();
    const userEditsRef = useRef<Record<string, string>>({});
    const contextMenuRef = useRef(options?.onContextMenu);
    contextMenuRef.current = options?.onContextMenu;
    const reselectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            if (resolveBridgeFrameTargets().length === 0 && editorEngine.frames.getAll().some((frameData) => !!frameData.view)) {
                const roots = editorEngine.ast.mappings.filteredLayers;
                const buildNode = (layerNode: LayerNode): DomNode => ({
                    id: getOnlookBridgeId(layerNode.frameId, layerNode.domId),
                    localName: layerNode.tagName.toLowerCase(),
                    className: '',
                    attributes: {
                        [EditorAttributes.DATA_ONLOOK_DOM_ID]: layerNode.domId,
                        ...(layerNode.oid ? { [EditorAttributes.DATA_ONLOOK_ID]: layerNode.oid } : {}),
                        ...(layerNode.instanceId ? { [EditorAttributes.DATA_ONLOOK_INSTANCE_ID]: layerNode.instanceId } : {}),
                    },
                    children: (layerNode.children ?? [])
                        .map((childDomId) =>
                            editorEngine.ast.mappings.getLayerNode(layerNode.frameId, childDomId),
                        )
                        .filter((childNode): childNode is LayerNode => !!childNode)
                        .map(buildNode),
                    textContent: layerNode.textContent ?? '',
                    component: layerNode.component ?? undefined,
                    source: {
                        frameId: layerNode.frameId,
                        domId: layerNode.domId,
                    },
                });

                const tree: DomNode = {
                    id: getOnlookBridgeId('__root__', 'html'),
                    localName: 'html',
                    className: '',
                    attributes: {},
                    textContent: '',
                    children: [
                        {
                            id: getOnlookBridgeId('__root__', 'body'),
                            localName: 'body',
                            className: '',
                            attributes: {},
                            textContent: '',
                            children: roots.map(buildNode),
                        },
                    ],
                };

                setDomTree(tree);
                autoExpandDefaults(tree);
                return tree;
            }

            const raw = fetchDomTree();
            if (!raw) {
                return null;
            }
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
            const applyStyleResult = (
                result: {
                    computed?: Record<string, string>;
                    inline?: Record<string, string>;
                    matched?: Array<{ selector: string; properties: Record<string, string> }>;
                    parentDisplay?: string;
                } | null,
                variables: Array<{ name: string; value: string; originNodeId: number | null }> = [],
            ) => {
                if (!result) return;
                const properties: CssProperty[] = [];
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
                setParentDisplay(result.parentDisplay ?? '');
                setElementVariables(variables);
            };

            const localRef = getOnlookBridgeRef(id);
            if (localRef) {
                void (async () => {
                    try {
                        const frameData = editorEngine.frames.get(localRef.frameId);
                        if (!frameData?.view) {
                            return;
                        }

                        const element = (await frameData.view.getElementByDomId(
                            localRef.domId,
                            true,
                        )) as DomElement | null;
                        if (!element) {
                            return;
                        }

                        const parentStyles = element.parent
                            ? ((await frameData.view.getComputedStyleByDomId(
                                  element.parent.domId,
                              )) as Record<string, string> | null)
                            : null;

                        const styleResult = {
                            computed: element.styles?.computed ?? {},
                            inline: element.styles?.defined ?? {},
                            matched: element.styles?.defined
                                ? [{ selector: layerSelector(localRef.domId), properties: element.styles.defined }]
                                : [],
                            parentDisplay: parentStyles?.display ?? '',
                        };

                        applyStyleResult(styleResult, []);
                    } catch (error) {
                        console.error('[css-studio] Failed to fetch styles from Onlook bridge:', error);
                    }
                })();
                return;
            }

            try {
                const result = fetchStyles(id);
                applyStyleResult(result, fetchElementVariables(id));
            } catch (e) {
                console.error('[css-studio] Failed to fetch styles:', e);
            }
        },
        [editorEngine.frames, setProperties, setComputedStyles, setParentDisplay, setElementVariables],
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

    const cancelPendingReselect = useCallback(() => {
        if (reselectTimerRef.current) {
            clearTimeout(reselectTimerRef.current);
            reselectTimerRef.current = null;
        }
    }, []);

    const resolveBridgeFrameTargets = useCallback(() => {
        const selectedFrames = editorEngine.frames.selected;
        const selectedIds = new Set(selectedFrames.map((frameData) => frameData.frame.id));
        const orderedFrames = [
            ...selectedFrames,
            ...editorEngine.frames
                .getAll()
                .filter((frameData) => !selectedIds.has(frameData.frame.id)),
        ];

        return orderedFrames.flatMap((frameData) => {
            const iframe = frameData.view;
            const frameDocument = iframe?.contentDocument;

            if (!iframe || !frameDocument?.documentElement) {
                return [];
            }

            return [
                {
                    document: frameDocument,
                    iframe,
                },
            ];
        });
    }, [editorEngine]);

    const applyRecoveredSelection = useCallback(
        (newId: number, tree: ReturnType<typeof convertTree> | null) => {
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
        },
        [fetchStyles2],
    );

    const scheduleReselect = useCallback(
        (oldId: number, selector: string, attemptsLeft = RESELECT_RETRY_ATTEMPTS) => {
            cancelPendingReselect();
            reselectTimerRef.current = setTimeout(() => {
                const currentSelectedId = useStore.getState().selectedNodeId;
                if (currentSelectedId !== oldId) {
                    cancelPendingReselect();
                    return;
                }

                const tree = fetchDomTree2();
                const newId = findReplacementElement(selector, oldId);
                if (newId !== null) {
                    cancelPendingReselect();
                    applyRecoveredSelection(newId, tree);
                    return;
                }

                if (attemptsLeft <= 1) {
                    cancelPendingReselect();
                    const store = useStore.getState();
                    if (store.selectedNodeId === oldId) {
                        store.selectNode(null);
                        selectElement(null);
                    }
                    return;
                }

                scheduleReselect(oldId, selector, attemptsLeft - 1);
            }, RESELECT_RETRY_DELAY_MS);
        },
        [applyRecoveredSelection, cancelPendingReselect, fetchDomTree2],
    );

    useEffect(() => {
        if (selectedNodeId === null) {
            cancelPendingReselect();
            return;
        }
        userEditsRef.current = {};
        const tree = fetchDomTree2();
        fetchStyles2(selectedNodeId);
        if (tree) {
            const node = findNodeInTree(tree, selectedNodeId);
            if (node) {
                setSelectedAttributes(node.attributes ?? {});
                setSelectedTextContent(node.textContent ?? '');
            }
        }
        refreshControls(useStore.getState().computedStyles, getTheme());
        observeElement(selectedNodeId, () => {
            const nodeId = useStore.getState().selectedNodeId;
            if (nodeId !== null) {
                fetchStyles2(nodeId);
                fetchDomTree2();
                refreshControls(useStore.getState().computedStyles, getTheme());
            }
        });
    }, [
        selectedNodeId,
        fetchStyles2,
        fetchDomTree2,
        cancelPendingReselect,
        setSelectedAttributes,
        setSelectedTextContent,
    ]);

    useEffect(() => {
        setBridgeFrameTargetsProvider(resolveBridgeFrameTargets);

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
                    cancelPendingReselect();
                    applyRecoveredSelection(newId, tree);
                } else if (selectorForReselect && selId !== null) {
                    scheduleReselect(selId, selectorForReselect);
                }
            } else {
                cancelPendingReselect();
            }
            purgeDetachedElements();
        }
        function init() {
            if (resolveBridgeFrameTargets().length === 0 && editorEngine.frames.getAll().some((frameData) => !!frameData.view)) {
                fetchDomTree2();
                fetchTokens();
                return;
            }
            if (resolveBridgeFrameTargets().length === 0) {
                initTimerRef.current = setTimeout(init, 100);
                return;
            }
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
            if (initTimerRef.current) {
                clearTimeout(initTimerRef.current);
                initTimerRef.current = null;
            }
            setBridgeFrameTargetsProvider(null);
            cancelPendingReselect();
            destroyBridge();
        };
    }, [
        applyRecoveredSelection,
        cancelPendingReselect,
        editorEngine.frames,
        fetchDomTree2,
        fetchStyles2,
        fetchTokens,
        resolveBridgeFrameTargets,
        scheduleReselect,
    ]);

    useEffect(() => {
        return reaction(
            () =>
                editorEngine.elements.selected.map((element) => ({
                    frameId: element.frameId,
                    domId: element.domId,
                    textContent: element.tagName,
                })),
            (selectedElements) => {
                if (resolveBridgeFrameTargets().length > 0) {
                    return;
                }

                const ids = selectedElements.map((element) =>
                    getOnlookBridgeId(element.frameId, element.domId),
                );
                const store = useStore.getState();
                store.selectNodes(ids);
                const primaryId = ids.at(-1) ?? null;
                if (primaryId !== null) {
                    store.expandToNode(primaryId);
                    fetchStyles2(primaryId);
                    const tree = fetchDomTree2();
                    const node = tree ? findNodeInTree(tree, primaryId) : null;
                    if (node) {
                        store.setSelectedAttributes(node.attributes ?? {});
                        store.setSelectedTextContent(node.textContent ?? '');
                    }
                } else {
                    store.clearSelection();
                }
            },
            { fireImmediately: true },
        );
    }, [editorEngine.elements, fetchDomTree2, fetchStyles2, resolveBridgeFrameTargets]);

    useEffect(() => {
        return reaction(
            () =>
                editorEngine.ast.mappings.filteredLayers.map((layerNode) => ({
                    frameId: layerNode.frameId,
                    domId: layerNode.domId,
                    children: layerNode.children?.length ?? 0,
                })),
            () => {
                if (resolveBridgeFrameTargets().length === 0) {
                    fetchDomTree2();
                }
            },
            { fireImmediately: true },
        );
    }, [editorEngine.ast.mappings, fetchDomTree2, resolveBridgeFrameTargets]);

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

function layerSelector(domId: string): string {
    return `[${EditorAttributes.DATA_ONLOOK_DOM_ID}="${domId}"]`;
}
