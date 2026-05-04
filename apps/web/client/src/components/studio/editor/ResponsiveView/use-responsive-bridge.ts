import { useCallback, useEffect, useMemo, useRef } from 'react';
import { getStudioControlsLayer } from '../../host';
import { useStore } from '../state/use-store';
import { convertTree } from '../utils/convert-tree';
import { findNodeInTree } from '../utils/find-node';
import { processStyleResult } from '../utils/process-styles';
import { ResponsiveBridgeProxy } from '../state/responsive-bridge-proxy';

function findParentInTree(tree: any, id: number): any | null {
    if (!tree) {
        return null;
    }
    for (const child of tree.children ?? []) {
        if (child.id === id) {
            return tree;
        }
        const found = findParentInTree(child, id);
        if (found) {
            return found;
        }
    }
    return null;
}

export function useResponsiveBridge() {
    const proxiesRef = useRef(new Map<number, ResponsiveBridgeProxy>());
    const userEditsRef = useRef<Record<string, string>>({});

    const setDomTree = useStore((s) => s.setDomTree);
    const setProperties = useStore((s) => s.setProperties);
    const setComputedStyles = useStore((s) => s.setComputedStyles);
    const setParentDisplay = useStore((s) => s.setParentDisplay);
    const setDesignTokens = useStore((s) => s.setDesignTokens);
    const setElementVariables = useStore((s) => s.setElementVariables);
    const bumpResponsiveCacheVersion = useStore((s: any) => s.bumpResponsiveCacheVersion);
    const selectedNodeId = useStore((s) => s.selectedNodeId);

    const childRectsCacheRef = useRef(new Map<number, any[]>());
    const flexInfoCacheRef = useRef(new Map<number, unknown>());
    const absInfoCacheRef = useRef(new Map<number, unknown>());
    const elementRectCacheRef = useRef(new Map<number, DOMRect>());
    const reorderGhostElRef = useRef<HTMLDivElement | null>(null);
    const reorderLineElRef = useRef<HTMLDivElement | null>(null);

    const activeProxy = useCallback(() => {
        const activeBreakpointIndex = (useStore.getState() as any).activeBreakpointIndex ?? 0;
        return proxiesRef.current.get(activeBreakpointIndex) ?? null;
    }, []);

    const registerProxy = useCallback((index: number, proxy: ResponsiveBridgeProxy) => {
        proxiesRef.current.set(index, proxy);
    }, []);

    const unregisterProxy = useCallback((index: number) => {
        proxiesRef.current.delete(index);
    }, []);

    const syncSelection = useCallback((selector: string | null, activeIndex: number) => {
        for (const [index, proxy] of proxiesRef.current) {
            if (index === activeIndex) {
                continue;
            }
            if (selector) {
                proxy.showSyncedSelection(selector);
            } else {
                proxy.clearSyncedSelection();
            }
        }
    }, []);

    const clearAllSyncedSelections = useCallback(() => {
        for (const proxy of proxiesRef.current.values()) {
            proxy.clearSyncedSelection();
        }
    }, []);

    const fetchDomTree = useCallback(async () => {
        const proxy = activeProxy();
        if (!proxy) {
            return null;
        }
        try {
            const raw = await proxy.fetchDomTree();
            const tree = convertTree(raw);
            setDomTree(tree);
            return tree;
        } catch (error) {
            console.error('[css-studio responsive] Failed to fetch DOM tree:', error);
            return null;
        }
    }, [activeProxy, setDomTree]);

    const fetchStyles = useCallback(
        (id: number) => {
            const proxy = activeProxy();
            if (!proxy) {
                return;
            }

            Promise.all([
                proxy.fetchStyles(id),
                proxy.fetchElementVariables(id).catch(() => null),
            ])
                .then(([result, vars]) => {
                    if (result) {
                        const normalized = processStyleResult(result, userEditsRef.current);
                        setProperties(normalized.properties as any);
                        setComputedStyles(normalized.display);
                        setParentDisplay(normalized.parentDisplay);
                    }
                    if (vars) {
                        setElementVariables(vars as any);
                    }
                })
                .catch((error) => {
                    console.error('[css-studio responsive] Failed to fetch styles:', error);
                });
        },
        [activeProxy, setComputedStyles, setElementVariables, setParentDisplay, setProperties],
    );

    const fetchDesignTokens = useCallback(() => {
        const proxy = activeProxy();
        if (!proxy) {
            return;
        }
        proxy
            .fetchDesignTokens()
            .then((tokens) => {
                setDesignTokens(tokens as any);
            })
            .catch((error) => {
                console.error('[css-studio responsive] Failed to fetch design tokens:', error);
            });
    }, [activeProxy, setDesignTokens]);

    const setStyleProperty = useCallback(
        (id: number, property: string, value: string) => {
            userEditsRef.current[property] = value;
            const proxy = activeProxy();
            if (!proxy) {
                return;
            }
            proxy.setStyleProperty(id, property, value);
            const primaryBreakpointIndex = (useStore.getState() as any).primaryBreakpointIndex ?? 0;
            const sourceIndex = (useStore.getState() as any).activeBreakpointIndex ?? 0;
            if (sourceIndex === primaryBreakpointIndex) {
                for (const [index, siblingProxy] of proxiesRef.current) {
                    if (index !== sourceIndex) {
                        siblingProxy.setStyleProperty(id, property, value);
                    }
                }
            }
        },
        [activeProxy],
    );

    const setAttribute = useCallback((id: number, name: string, value: string) => {
        activeProxy()?.setAttribute(id, name, value);
    }, [activeProxy]);

    const removeAttribute = useCallback((id: number, name: string) => {
        activeProxy()?.removeAttribute(id, name);
    }, [activeProxy]);

    const setTextContent = useCallback((id: number, text: string) => {
        activeProxy()?.setTextContent(id, text);
    }, [activeProxy]);

    const highlightElement = useCallback(
        (id: number | null) => {
            const proxy = activeProxy();
            if (!proxy) {
                return;
            }
            if (id === null) {
                proxy.highlightElement(null);
                return;
            }
            proxy.highlightElement(id);
        },
        [activeProxy],
    );

    const selectElement = useCallback((id: number) => {
        activeProxy()?.selectElement(id);
    }, [activeProxy]);

    const setDocumentProperty = useCallback((prop: string, value: string) => {
        for (const proxy of proxiesRef.current.values()) {
            proxy.setDocumentProperty(prop, value);
        }
    }, []);

    const removeDocumentProperty = useCallback((prop: string) => {
        for (const proxy of proxiesRef.current.values()) {
            proxy.removeDocumentProperty(prop);
        }
    }, []);

    const getHostElementRect = useCallback(async (id: number) => {
        const proxy = activeProxy();
        if (!proxy) {
            return null;
        }
        return proxy.getHostElementRect(id);
    }, [activeProxy]);

    const getHostElementQuad = useCallback(async (id: number) => {
        const proxy = activeProxy();
        if (!proxy) {
            return null;
        }
        return proxy.getHostElementQuad(id);
    }, [activeProxy]);

    const getFlexChildRects = useCallback(async (id: number) => {
        const proxy = activeProxy();
        if (!proxy) {
            return [];
        }
        return proxy.getChildRectsAndIdsHost(id);
    }, [activeProxy]);

    const ensureOverlay = useCallback((key: 'ghost' | 'line') => {
        const ref = key === 'ghost' ? reorderGhostElRef : reorderLineElRef;
        if (ref.current) {
            return ref.current;
        }
        const element = document.createElement('div');
        element.style.cssText =
            key === 'ghost'
                ? 'position:fixed;pointer-events:none;background:rgba(111,168,220,0.15);border-radius:4px;display:none;'
                : 'position:fixed;pointer-events:none;background:rgba(111,168,220,0.7);border-radius:1px;display:none;';
        const layer = getStudioControlsLayer() ?? document.documentElement;
        layer.appendChild(element);
        ref.current = element;
        return element;
    }, []);

    const fetchPageMetadata = useCallback(() => {
        const proxy = activeProxy();
        if (!proxy) {
            return {
                title: '',
                description: '',
                charset: '',
                viewport: '',
                ogTitle: '',
                ogDescription: '',
                ogImage: '',
                favicon: '',
            };
        }
        return proxy.fetchPageMetadata();
    }, [activeProxy]);

    const setPageMetadataField = useCallback((field: string, value: string) => {
        for (const proxy of proxiesRef.current.values()) {
            proxy.setPageMetadataField(field, value);
        }
    }, []);

    const fetchElementVariables = useCallback(
        (id: number) => {
            const proxy = activeProxy();
            if (!proxy) {
                return;
            }
            proxy.fetchElementVariables(id).then((vars) => {
                setElementVariables(vars as any);
            });
        },
        [activeProxy, setElementVariables],
    );

    const removeElement = useCallback((id: number) => {
        activeProxy()?.removeElement(id).catch(console.error);
        return true;
    }, [activeProxy]);

    const addChildElement = useCallback((parentId: number, tag: string, beforeId?: number | null) => {
        activeProxy()?.addChildElement(parentId, tag, beforeId ?? null).catch(console.error);
        return null;
    }, [activeProxy]);

    const addSiblingElement = useCallback((siblingId: number, tag: string) => {
        activeProxy()?.addSiblingElement(siblingId, tag).catch(console.error);
        return null;
    }, [activeProxy]);

    const duplicateElement = useCallback((id: number) => {
        activeProxy()?.duplicateElement(id).catch(console.error);
        return null;
    }, [activeProxy]);

    const replaceTag = useCallback((id: number, newTag: string) => {
        activeProxy()?.replaceTag(id, newTag).catch(console.error);
        return null;
    }, [activeProxy]);

    const moveElement = useCallback((id: number, newParentId: number, beforeSiblingId: number | null) => {
        activeProxy()?.moveElement(id, newParentId, beforeSiblingId).catch(console.error);
        return true;
    }, [activeProxy]);

    const getParentId = useCallback((id: number) => {
        const parent = findParentInTree((useStore.getState() as any).domTree, id);
        return parent ? parent.id : null;
    }, []);

    const getNextSiblingId = useCallback((id: number) => {
        const parent = findParentInTree((useStore.getState() as any).domTree, id);
        if (!parent) {
            return null;
        }
        const index = parent.children.findIndex((child: any) => child.id === id);
        if (index < 0 || index === parent.children.length - 1) {
            return null;
        }
        return parent.children[index + 1].id;
    }, []);

    const getSiblingIds = useCallback((parentId: number) => {
        const parent = findNodeInTree((useStore.getState() as any).domTree, parentId) as any;
        if (!parent) {
            return [];
        }
        return parent.children.map((child: any) => child.id);
    }, []);

    const buildSelector = useCallback(async (id: number) => {
        const proxy = activeProxy();
        if (!proxy) {
            return null;
        }
        return proxy.buildSelector(id);
    }, [activeProxy]);

    const prefetchChildRects = useCallback(
        (parentId: number) => {
            const proxy = activeProxy();
            if (!proxy) {
                return Promise.resolve([]);
            }
            return proxy
                .getChildRectsAndIdsHost(parentId)
                .then((items) => {
                    childRectsCacheRef.current.set(parentId, items as any[]);
                    for (const item of items as any[]) {
                        elementRectCacheRef.current.set(item.id, item.rect);
                    }
                    bumpResponsiveCacheVersion();
                    return items;
                })
                .catch(() => []);
        },
        [activeProxy, bumpResponsiveCacheVersion],
    );

    const prefetchFlexInfo = useCallback(
        (id: number) => {
            const proxy = activeProxy();
            if (!proxy) {
                return Promise.resolve(null);
            }
            return proxy
                .getFlexInfo(id)
                .then((info) => {
                    flexInfoCacheRef.current.set(id, info);
                    bumpResponsiveCacheVersion();
                    return info;
                })
                .catch(() => null);
        },
        [activeProxy, bumpResponsiveCacheVersion],
    );

    const prefetchAbsInfo = useCallback(
        (id: number) => {
            const proxy = activeProxy();
            if (!proxy) {
                return Promise.resolve(null);
            }
            return proxy
                .getAbsolutePositionInfo(id)
                .then((info) => {
                    absInfoCacheRef.current.set(id, info);
                    bumpResponsiveCacheVersion();
                    return info;
                })
                .catch(() => null);
        },
        [activeProxy, bumpResponsiveCacheVersion],
    );

    const prefetchElementRect = useCallback(
        (id: number) => {
            const proxy = activeProxy();
            if (!proxy) {
                return Promise.resolve(null);
            }
            return proxy
                .getHostElementRect(id)
                .then((rect) => {
                    if (rect) {
                        elementRectCacheRef.current.set(id, rect as DOMRect);
                        bumpResponsiveCacheVersion();
                    }
                    return rect;
                })
                .catch(() => null);
        },
        [activeProxy, bumpResponsiveCacheVersion],
    );

    const getChildRectsAndIds = useCallback(
        (parentId: number) => {
            const cached = childRectsCacheRef.current.get(parentId);
            if (cached) {
                return cached;
            }
            void prefetchChildRects(parentId);
            return [];
        },
        [prefetchChildRects],
    );

    const getFlexInfo = useCallback((id: number) => {
        return flexInfoCacheRef.current.get(id) ?? null;
    }, []);

    const getAbsolutePositionInfo = useCallback((id: number) => {
        return absInfoCacheRef.current.get(id) ?? null;
    }, []);

    const getElementRect = useCallback((id: number) => {
        return elementRectCacheRef.current.get(id) ?? null;
    }, []);

    const getElementQuad = useCallback(
        (id: number) => {
            const rect = elementRectCacheRef.current.get(id);
            if (!rect) {
                return null;
            }
            const scale = activeProxy()?.getScale() ?? { x: 1, y: 1 };
            return {
                hasTransform: false,
                selfTransformed: false,
                corners: [
                    new DOMPoint(rect.left, rect.top),
                    new DOMPoint(rect.right, rect.top),
                    new DOMPoint(rect.right, rect.bottom),
                    new DOMPoint(rect.left, rect.bottom),
                ],
                width: rect.width,
                height: rect.height,
                untransformedX: rect.left,
                untransformedY: rect.top,
                matrix: new DOMMatrix([scale.x, 0, 0, scale.y, 0, 0]),
                inverseMatrix: new DOMMatrix([
                    1 / (scale.x || 1),
                    0,
                    0,
                    1 / (scale.y || 1),
                    0,
                    0,
                ]),
                cssTransform: 'none',
                scaleX: scale.x,
                scaleY: scale.y,
            };
        },
        [activeProxy],
    );

    const startDragTransform = useCallback((id: number) => {
        activeProxy()?.startDragTransform(id);
    }, [activeProxy]);

    const updateDragTransform = useCallback((id: number, dx: number, dy: number) => {
        activeProxy()?.updateDragTransform(id, dx, dy);
    }, [activeProxy]);

    const clearDragTransform = useCallback((id: number) => {
        activeProxy()?.clearDragTransform(id);
    }, [activeProxy]);

    const startAbsDragTransform = useCallback((id: number) => {
        activeProxy()?.startAbsDragTransform(id);
    }, [activeProxy]);

    const clearAbsDragTransform = useCallback((id: number) => {
        activeProxy()?.clearAbsDragTransform(id);
    }, [activeProxy]);

    const showReorderGhost = useCallback(
        (id: number) => {
            const rect = elementRectCacheRef.current.get(id);
            const el = ensureOverlay('ghost');
            if (!rect) {
                return;
            }
            el.style.display = 'block';
            el.style.left = `${rect.left}px`;
            el.style.top = `${rect.top}px`;
            el.style.width = `${rect.width}px`;
            el.style.height = `${rect.height}px`;
        },
        [ensureOverlay],
    );

    const hideReorderGhost = useCallback(() => {
        if (reorderGhostElRef.current) {
            reorderGhostElRef.current.style.display = 'none';
        }
    }, []);

    const showReorderLine = useCallback(
        (rect: { x: number; y: number; w: number; h: number }) => {
            const el = ensureOverlay('line');
            el.style.display = 'block';
            el.style.left = `${rect.x}px`;
            el.style.top = `${rect.y}px`;
            el.style.width = `${rect.w}px`;
            el.style.height = `${rect.h}px`;
        },
        [ensureOverlay],
    );

    const hideReorderLine = useCallback(() => {
        if (reorderLineElRef.current) {
            reorderLineElRef.current.style.display = 'none';
        }
    }, []);

    useEffect(() => {
        if (selectedNodeId === null) {
            return;
        }
        const parentId = findParentInTree((useStore.getState() as any).domTree, selectedNodeId)?.id ?? null;
        void prefetchAbsInfo(selectedNodeId);
        void prefetchElementRect(selectedNodeId);
        if (parentId !== null) {
            void prefetchFlexInfo(parentId);
            void prefetchChildRects(parentId);
        }
    }, [selectedNodeId, prefetchAbsInfo, prefetchChildRects, prefetchElementRect, prefetchFlexInfo]);

    return useMemo(
        () => ({
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
            detachElement: () => null,
            getNextSiblingId,
            reinsertElement: () => null,
            replaceTag,
            addChildElement,
            findInsertionSibling: () => null,
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
            getElementQuad,
            startAbsDragTransform,
            clearAbsDragTransform,
            fetchPageMetadata,
            setPageMetadataField,
            registerProxy,
            unregisterProxy,
            syncSelection,
            clearAllSyncedSelections,
            getHostElementRect,
            getHostElementQuad,
            getFlexChildRects,
            buildSelector,
            activeProxy,
            prefetchChildRects,
            prefetchFlexInfo,
            prefetchAbsInfo,
            prefetchElementRect,
        }),
        [
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
            getNextSiblingId,
            replaceTag,
            addChildElement,
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
            getElementQuad,
            startAbsDragTransform,
            clearAbsDragTransform,
            fetchPageMetadata,
            setPageMetadataField,
            registerProxy,
            unregisterProxy,
            syncSelection,
            clearAllSyncedSelections,
            getHostElementRect,
            getHostElementQuad,
            getFlexChildRects,
            buildSelector,
            activeProxy,
            prefetchChildRects,
            prefetchFlexInfo,
            prefetchAbsInfo,
            prefetchElementRect,
        ],
    );
}
