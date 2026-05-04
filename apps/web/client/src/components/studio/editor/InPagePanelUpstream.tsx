'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorEngine } from '@/components/store/editor';
import { CodeTab } from '@/app/project/[id]/_components/left-panel/code-panel/code-tab';
import { getStudioResponsiveLayer } from '../host';
import { auth } from '../auth/Auth';
import { useStore } from './state/use-store';
import { useUndoStore } from './state/use-undo';
import { usePageBridge } from './state/use-page-bridge';
import { useResponsiveBridge } from './ResponsiveView/use-responsive-bridge';
import { useKeyframesScrape } from './state/use-keyframes-scrape';
import { useMcpDirect } from './state/use-mcp-direct';
import { useElementPicker } from './state/use-element-picker';
import { useElementDraw } from './state/use-element-draw';
import { useInlineEdit } from './state/use-inline-edit';
import { useFlexDrag } from './state/use-flex-drag';
import { useAbsDrag } from './state/use-abs-drag';
import { useTreeDrag } from './state/use-tree-drag';
import { getId, selectElements } from './state/dom-bridge';
import {
    activateVariantControls,
    deactivateVariantControls,
    setVariantCallbacks,
    setVariantSelectorMode,
} from './state/variant-controls';
import { useKeyboardShortcuts } from './InPagePanel/use-keyboard-shortcuts';
import { useUndoApply } from './InPagePanel/use-undo-apply';
import { useDomOperations } from './InPagePanel/use-dom-operations';
import { PROTECTED_TAGS4, getElementInfoById } from './InPagePanel/element-info';
import { findNodeInTree } from './utils/find-node';
import { Toolbar } from './Toolbar';
import { Panel, panelStyles } from './Panel';
import { PropertiesPanel, FilterContext } from './PropertiesPanel';
import { DomTree } from './DomTree';
import { MetadataPanel } from './MetadataPanel';
import { AnimationsPanel } from './AnimationsPanel';
import { ContextMenu } from './ContextMenu';
import { ChatTray } from './ChatTray';
import { TaskOverlays } from './TaskOverlays';
import { ResponsiveView } from './ResponsiveView';
import type { ChatAttachment, DraftImage } from './state/slices/chat-slice';

const SearchIcon = Search as any;
const PropertiesPanelComponent = PropertiesPanel as any;
const DomTreeComponent = DomTree as any;
const CodeTabComponent = CodeTab as any;
const TaskOverlaysComponent = TaskOverlays as any;
const FilterProvider = FilterContext.Provider as any;

const LOGIN_URL = 'https://cssstudio.ai/login';

interface InPagePanelUpstreamProps {
    mcpPort?: number;
    mode?: string;
}

interface ContextMenuState {
    nodeId: number;
    x: number;
    y: number;
    source: 'canvas' | 'tree';
}

function buildAttachments(nodeIds: number[]): ChatAttachment[] {
    return nodeIds.map((nodeId) => ({
        nodeId,
        label: getElementInfoById(nodeId).element,
    }));
}

function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

export function InPagePanelUpstream({ mcpPort, mode }: InPagePanelUpstreamProps) {
    const editorEngine = useEditorEngine();
    const activeBranch = editorEngine.branches.activeBranchOrNull;
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    const handleContextMenuEvent = useCallback((result: { id: number; x: number; y: number }) => {
        const node = findNodeInTree(useStore.getState().domTree, result.id);
        if (node && !PROTECTED_TAGS4.has(node.localName)) {
            setContextMenu({ nodeId: result.id, x: result.x, y: result.y, source: 'canvas' });
        }
    }, []);

    const responsiveMode = useStore((s: any) => s.responsiveMode);
    const setResponsiveMode = useStore((s: any) => s.setResponsiveMode);
    const setActiveBreakpoint = useStore((s: any) => s.setActiveBreakpoint);
    const pageBridge = usePageBridge({ onContextMenu: handleContextMenuEvent });
    const responsiveBridge = useResponsiveBridge();
    const bridge = responsiveMode ? responsiveBridge : pageBridge;

    useEffect(() => {
        (useStore as typeof useStore & { __responsiveActiveProxy?: unknown }).__responsiveActiveProxy =
            responsiveMode ? responsiveBridge.activeProxy : null;
    }, [responsiveMode, responsiveBridge]);

    useKeyframesScrape();

    const baseMcp = useMcpDirect(mcpPort, mode);

    const mcp = useMemo(() => {
        const sendTaskPrompt = async (text: string, attachments: ChatAttachment[]) => {
            baseMcp.sendUserMessage(text, attachments);
        };

        return {
            ...baseMcp,
            startTask: async (input: { text?: string; nodeIds?: number[] }) => {
                await sendTaskPrompt(input.text ?? '', buildAttachments(input.nodeIds ?? []));
            },
            sendTaskTurn: async (input: { text?: string }) => {
                await sendTaskPrompt(input.text ?? '', []);
            },
            dismissTask: (_taskId: string) => {
                useStore.getState().setActiveTask(null);
            },
            acceptTask: (_taskId: string) => {
                useStore.getState().requestChatFocus();
            },
            addDraftImagesFromFiles: async (files: FileList | File[]) => {
                const list = Array.from(files);
                const store = useStore.getState();
                for (const file of list) {
                    const dataUrl = await readFileAsDataURL(file);
                    const draftImage: DraftImage = {
                        id: crypto.randomUUID(),
                        filename: file.name,
                        dataUrl,
                    };
                    store.addDraftImage(draftImage);
                }
            },
            sendVariantAccepting: (_selector: string) => {},
            sendVariantCancelImplementing: (_selector: string) => {},
            sendAnswer: (_taskId: string, answer: string) => {
                baseMcp.sendAnswer(answer);
            },
        };
    }, [baseMcp]);

    const {
        selectedNodeId,
        selectedNodeIds,
        domTree,
        panic,
        clearSelection,
        requestChatFocus,
    } = useStore(
        useShallow((s: any) => ({
            selectedNodeId: s.selectedNodeId,
            selectedNodeIds: s.selectedNodeIds,
            domTree: s.domTree,
            panic: s.panic,
            clearSelection: s.clearSelection,
            requestChatFocus: s.requestChatFocus,
        })),
    );
    const navigatorOpen = useStore((s: any) => s.panels.navigator.open);
    const navigatorTab = useStore((s: any) => s.panels.navigator.activeTab);
    const timelineOpen = useStore((s: any) => s.panels.timeline.open);
    const codeOpen = useStore((s: any) => s.panels.code.open);
    const setPanelOpen = useStore((s: any) => s.setPanelOpen);
    const setPanelActiveTab = useStore((s: any) => s.setPanelActiveTab);
    const undoClear = useUndoStore((s) => s.clear);

    const handleLogin = useCallback(() => {
        window.open(LOGIN_URL, 'cssstudio-auth', 'width=500,height=600');
    }, []);

    const { applyEntry } = useUndoApply({ bridge: bridge as any });
    const ops = useDomOperations({ bridge: bridge as any, contextMenu, setContextMenu });
    const { isPickingElement, togglePicker } = useElementPicker(
        ops.handleSelectNode,
        ops.handleSelectNodes,
    );
    const { isDrawingElement, toggleDraw } = useElementDraw(ops.handleDrawElement);
    useInlineEdit(ops.handleInlineTextEdit, ops.handleSelectNode);

    useEffect(() => {
        activateVariantControls();
        setVariantCallbacks({
            onAccept: (wrapper, variant) => {
                const selector = wrapper.getAttribute('data-cs-original-element') || '';
                const variantName = variant.getAttribute('data-name') || 'Variant';
                if (selector) {
                    setVariantSelectorMode(selector, 'implementing');
                    mcp.sendVariantAccepting(selector);
                }
                void mcp.sendTaskTurn({ text: `Apply variant "${variantName}" to \`${selector}\`.` });
            },
            onIterate: (wrapper, variant) => {
                const selector = wrapper.getAttribute('data-cs-original-element') || '';
                const variantName = variant.getAttribute('data-name') || 'Variant';
                if (selector) {
                    setVariantSelectorMode(selector, 'iterating');
                }
                void mcp.sendTaskTurn({ text: `Generate more variants based on "${variantName}".` });
            },
            onRetry: (wrapper, variant) => {
                const selector = wrapper.getAttribute('data-cs-original-element') || '';
                const variantName = variant.getAttribute('data-name') || 'Variant';
                if (selector) {
                    setVariantSelectorMode(selector, 'implementing');
                    mcp.sendVariantAccepting(selector);
                }
                void mcp.sendTaskTurn({
                    text: `Retry applying variant "${variantName}" to \`${selector}\`.`,
                });
            },
            onCancel: (wrapper) => {
                const selector = wrapper.getAttribute('data-cs-original-element') || '';
                if (!selector) return;
                setVariantSelectorMode(selector, null);
                mcp.sendVariantCancelImplementing(selector);
            },
        });
        return () => deactivateVariantControls();
    }, [mcp]);

    useFlexDrag({ bridge: bridge as any, onReorder: ops.handleReorder });
    useAbsDrag({ bridge: bridge as any, onPositionChange: ops.handleAbsPositionChange });

    useKeyboardShortcuts({
        applyEntry: applyEntry as (entry: unknown, direction: 'undo' | 'redo') => void,
        sendEdit: baseMcp.sendEdit,
        handleSelectNode: ops.handleSelectNode,
        handleToggleSelectNode: ops.handleToggleSelectNode,
        duplicateElement: ops.duplicateElement,
        deleteElement: ops.handleDeleteElement,
        onLogin: handleLogin,
        isDemo: mode === 'demo',
    });

    const propertiesPanelRef = useRef<{ toggleFilter: () => void } | null>(null);
    const [navFilter, setNavFilter] = useState('');
    const [navFilterOpen, setNavFilterOpen] = useState(false);
    const navFilterRef = useRef<HTMLInputElement | null>(null);
    const treeRef = useRef<HTMLDivElement | null>(null);

    const showPageLine = useCallback(
        (beforeId: number | null, parentId: number) => {
            const items = bridge.getChildRectsAndIds(parentId);
            if (items.length === 0) return;
            if (beforeId !== null) {
                const target = items.find((item) => item.id === beforeId);
                if (target) {
                    bridge.showReorderLine({
                        x: target.rect.left,
                        y: target.rect.top - 1,
                        w: target.rect.width,
                        h: 2,
                    });
                }
                return;
            }
            const last = items.at(-1);
            if (!last) return;
            bridge.showReorderLine({
                x: last.rect.left,
                y: last.rect.bottom - 1,
                w: last.rect.width,
                h: 2,
            });
        },
        [bridge],
    );

    const { draggedNodeId, dropTarget, startDrag } = useTreeDrag({
        containerRef: treeRef as RefObject<HTMLElement>,
        onReorder: ops.handleReorder,
        showPageLine,
        hidePageLine: bridge.hideReorderLine,
    });

    useEffect(() => {
        auth.isAuthenticated()
            .then((authed) => {
                useStore.getState().setIsAuthenticated(authed);
            })
            .catch(() => {
                useStore.getState().setIsAuthenticated(false);
            });

        const onMessage = (event: MessageEvent) => {
            if (event.origin === 'https://cssstudio.ai' && (event.data as any)?.type === 'auth-token') {
                void auth.storeTokens((event.data as any).token, (event.data as any).refreshToken).then(
                    () => {
                        void auth.markAuthenticated();
                        useStore.getState().setIsAuthenticated(true);
                    },
                );
            }
        };

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            const tasks = (useStore.getState() as any).tasks ?? {};
            for (const task of Object.values(tasks) as Array<{ pendingEdits?: unknown[] }>) {
                if ((task.pendingEdits?.length ?? 0) > 0) {
                    event.preventDefault();
                    return;
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    useEffect(() => {
        if (panic) {
            requestChatFocus();
        }
    }, [panic, requestChatFocus]);

    useEffect(() => {
        if (!responsiveMode) return;
        const html = document.documentElement;
        const body = document.body;
        const prevHtml = html.style.overflow;
        const prevBody = body.style.overflow;
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        const store = useStore.getState() as any;
        if (!store.panels.navigator.open) {
            store.setPanelOpen('navigator', true);
            store.setPanelActiveTab('navigator', 'elements');
        }
        return () => {
            html.style.overflow = prevHtml;
            body.style.overflow = prevBody;
        };
    }, [responsiveMode]);

    const handleToggleResponsive = useCallback(() => {
        setResponsiveMode(!responsiveMode);
    }, [responsiveMode, setResponsiveMode]);

    const hasSelection = selectedNodeId !== null && !!domTree;
    const isMultiSelect = selectedNodeIds.length > 1;
    const responsiveLayer = getStudioResponsiveLayer();

    return (
        <>
            <Toolbar
                isPicking={isPickingElement}
                isDrawing={isDrawingElement}
                onTogglePicker={togglePicker}
                onToggleDraw={toggleDraw}
                onToggleCode={() => useStore.getState().togglePanel('code')}
                onLogin={handleLogin}
                onSendEdit={baseMcp.sendEdit}
                onAnswer={(_answer) => {}}
                onReconnect={baseMcp.reconnect}
                mode={mode}
            />

            {responsiveMode &&
                responsiveLayer &&
                createPortal(
                    <ResponsiveView
                        onFrameBridgeReady={(index, proxy) => {
                            responsiveBridge.registerProxy(index, proxy);
                            void responsiveBridge.fetchDomTree();
                            responsiveBridge.fetchDesignTokens();
                        }}
                        onFrameElementPick={async (breakpointIndex, id, selector, additive) => {
                            setActiveBreakpoint(breakpointIndex);
                            await responsiveBridge.fetchDomTree();
                            if (additive) {
                                ops.handleToggleSelectNode(id);
                            } else {
                                ops.handleSelectNode(id);
                            }
                            responsiveBridge.selectElement(id);
                            if (selector) {
                                responsiveBridge.syncSelection(selector, breakpointIndex);
                            }
                        }}
                        onFrameContextMenu={async (breakpointIndex, id, x, y) => {
                            setActiveBreakpoint(breakpointIndex);
                            await responsiveBridge.fetchDomTree();
                            ops.handleSelectNode(id);
                            responsiveBridge.selectElement(id);
                            setContextMenu({ nodeId: id, x, y, source: 'canvas' });
                        }}
                        onFrameElementDraw={(breakpointIndex, parentId, rect) => {
                            setActiveBreakpoint(breakpointIndex);
                            ops.handleDrawElement(parentId, rect);
                        }}
                        onClose={handleToggleResponsive}
                    />,
                    responsiveLayer,
                )}

            {hasSelection && (
                <Panel
                    panelId="inspector"
                    tabs={[
                        { id: 'design', label: 'Design' },
                        { id: 'motion', label: 'Motion', disabled: isMultiSelect },
                        { id: 'variables', label: 'Variables', disabled: isMultiSelect },
                    ]}
                    headerSlot={
                        <button
                            className={panelStyles.headerButton}
                            onClick={() => propertiesPanelRef.current?.toggleFilter()}
                            title="Filter"
                            aria-label="Filter"
                        >
                            <SearchIcon size={14} />
                        </button>
                    }
                    onClose={() => {
                        clearSelection();
                        selectElements([], null as never);
                        undoClear();
                    }}
                >
                    <PropertiesPanelComponent
                        ref={propertiesPanelRef}
                        onPropertyChange={ops.handlePropertyChange}
                        onAttributeChange={ops.handleAttributeChange}
                        onAttributeDelete={ops.handleAttributeDelete}
                        onAttributeRename={ops.handleAttributeRename}
                        onTagChange={ops.handleTagChange}
                    />
                </Panel>
            )}

            {navigatorOpen && (
                <Panel
                    panelId="navigator"
                    tabs={[
                        { id: 'elements', label: 'Elements', shortcut: 'Alt+E' },
                        { id: 'metadata', label: 'Metadata' },
                    ]}
                    headerSlot={
                        navigatorTab === 'elements' ? (
                            <button
                                className={panelStyles.headerButton}
                                onClick={() => {
                                    setNavFilterOpen((open) => !open);
                                    if (navFilterOpen) {
                                        setNavFilter('');
                                    }
                                }}
                                title="Filter"
                                aria-label="Filter"
                            >
                                <SearchIcon size={14} />
                            </button>
                        ) : undefined
                    }
                    onClose={() => setPanelOpen('navigator', false)}
                >
                    <FilterProvider value={navFilter}>
                        {navigatorTab === 'elements' && navFilterOpen && (
                            <div className="m-0 flex items-center gap-1.5 border-b border-[var(--cs-border)] bg-[var(--cs-layer)] px-2 py-1">
                                <SearchIcon
                                    size={12}
                                    className="shrink-0 text-[var(--cs-icon-muted)]"
                                />
                                <input
                                    ref={navFilterRef}
                                    type="text"
                                    className="flex-1 bg-transparent text-xs text-[var(--cs-foreground)] outline-none placeholder:text-[var(--cs-icon-muted)]"
                                    placeholder="Filter elements..."
                                    value={navFilter}
                                    onChange={(event) => setNavFilter(event.target.value)}
                                    onBlur={() => {
                                        if (!navFilter) {
                                            setNavFilterOpen(false);
                                        }
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Escape') {
                                            setNavFilter('');
                                            setNavFilterOpen(false);
                                        }
                                    }}
                                    autoFocus
                                />
                            </div>
                        )}
                        {navigatorTab === 'elements' && (
                            <DomTreeComponent
                                ref={treeRef}
                                onSelectNode={ops.handleSelectNode}
                                onToggleSelectNode={ops.handleToggleSelectNode}
                                onHover={ops.handleHoverNode}
                                onContextMenu={ops.handleTreeContextMenu}
                                onTagChange={ops.handleTagChange}
                                onDragStart={startDrag}
                                draggedNodeId={draggedNodeId}
                                dropTarget={dropTarget}
                            />
                        )}
                        {navigatorTab === 'metadata' && (
                            <MetadataPanel
                                fetchMetadata={bridge.fetchPageMetadata as any}
                                onMetadataChange={ops.handleMetadataChange}
                            />
                        )}
                    </FilterProvider>
                </Panel>
            )}

            {codeOpen && activeBranch && (
                <Panel
                    panelId="code"
                    tabs={[{ id: 'code', label: 'Code' }]}
                    onClose={() => setPanelOpen('code', false)}
                    className="min-w-[420px]"
                >
                    <CodeTabComponent
                        projectId={editorEngine.projectId}
                        branchId={activeBranch.id}
                    />
                </Panel>
            )}

            {timelineOpen && (
                <Panel
                    panelId="timeline"
                    tabs={[{ id: 'animations', label: 'Animations', shortcut: 'Alt+A' }]}
                    onClose={() => setPanelOpen('timeline', false)}
                >
                    <AnimationsPanel />
                </Panel>
            )}

            <TaskOverlaysComponent bridge={bridge} />

            <ChatTray
                mcp={mcp}
                isPicking={isPickingElement}
                isDrawing={isDrawingElement}
                onTogglePicker={togglePicker}
                onToggleDraw={toggleDraw}
                onLogin={handleLogin}
            />

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={
                        selectedNodeIds.length > 1
                            ? [
                                  {
                                      label: `Duplicate ${selectedNodeIds.length} elements`,
                                      onClick: ops.handleDuplicateElement,
                                      shortcut: '⌘D',
                                  },
                                  { separator: true },
                                  {
                                      label: `Delete ${selectedNodeIds.length} elements`,
                                      onClick: ops.handleDeleteElement,
                                      danger: true,
                                      shortcut: '⌫',
                                  },
                              ]
                            : [
                                  { label: 'Add child element', onClick: ops.handleAddChild },
                                  { label: 'Add sibling element', onClick: ops.handleAddSibling },
                                  {
                                      label: 'Duplicate element',
                                      onClick: ops.handleDuplicateElement,
                                      shortcut: '⌘D',
                                  },
                                  { separator: true },
                                  {
                                      label: 'Delete element',
                                      onClick: ops.handleDeleteElement,
                                      danger: true,
                                      shortcut: '⌫',
                                  },
                              ]
                    }
                    onClose={() => setContextMenu(null)}
                />
            )}
        </>
    );
}
