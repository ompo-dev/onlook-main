import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Search } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorEngine } from '@/components/store/editor';
import { CodeTab } from '@/app/project/[id]/_components/left-panel/code-panel/code-tab';
import { BrandTab } from '@/app/project/[id]/_components/left-panel/design-panel/brand-tab';
import { BranchesTab } from '@/app/project/[id]/_components/left-panel/design-panel/branches-tab';
import { ImagesTab } from '@/app/project/[id]/_components/left-panel/design-panel/image-tab';
import { PagesTab } from '@/app/project/[id]/_components/left-panel/design-panel/page-tab';
import { useStore } from '../state/use-store';
import { useUndoStore } from '../state/use-undo';
import { usePageBridge } from '../state/use-page-bridge';
import { useKeyframesScrape } from '../state/use-keyframes-scrape';
import { useMcpDirect } from '../state/use-mcp-direct';
import { useElementPicker } from '../state/use-element-picker';
import { useElementDraw } from '../state/use-element-draw';
import { useInlineEdit } from '../state/use-inline-edit';
import { usePromptInput } from '../state/use-prompt-input';
import { useFlexDrag } from '../state/use-flex-drag';
import { useAbsDrag } from '../state/use-abs-drag';
import { useTreeDrag } from '../state/use-tree-drag';
import { getOnlookBridgeRef } from '../state/onlook-bridge-map';
import { selectElements } from '../state/dom-bridge';
import { useKeyboardShortcuts } from './use-keyboard-shortcuts';
import { useUndoApply } from './use-undo-apply';
import { useDomOperations } from './use-dom-operations';
import { PROTECTED_TAGS4 } from './element-info';
import { findNodeInTree } from '../utils/find-node';
import { Toolbar } from '../Toolbar';
import { Panel, panelStyles } from '../Panel';
import { PropertiesPanel, FilterContext } from '../PropertiesPanel';
import { DomTree } from '../DomTree';
import { MetadataPanel } from '../MetadataPanel';
import { ChatPanel } from '../ChatPanel';
import { AnimationsPanel } from '../AnimationsPanel';
import { ContextMenu } from '../ContextMenu';
import { StudioOnlookDocks } from '../docks';
import { auth } from '../../auth/Auth';

const LOGIN_URL = 'https://cssstudio.ai/login';

interface InPagePanelProps {
    mcpPort?: number;
    mode?: string;
}

interface ContextMenuState {
    nodeId: number;
    x: number;
    y: number;
    source: 'canvas' | 'tree';
}

export function InPagePanel({ mcpPort, mode }: InPagePanelProps) {
    const editorEngine = useEditorEngine();
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    const handleContextMenuEvent = useCallback((result: { id: number; x: number; y: number }) => {
        const node = findNodeInTree(useStore.getState().domTree, result.id);
        if (node && !PROTECTED_TAGS4.has(node.localName)) {
            setContextMenu({ nodeId: result.id, x: result.x, y: result.y, source: 'canvas' });
        }
    }, []);

    const bridge = usePageBridge({ onContextMenu: handleContextMenuEvent });
    useKeyframesScrape();

    const { sendEdit, sendAnswer, sendUserMessage, reconnect } = useMcpDirect(mcpPort, mode);

    const {
        selectedNodeId,
        selectedNodeIds,
        domTree,
        panic,
        clearSelection,
        isAuthenticated,
    } = useStore(useShallow((s) => ({
        selectedNodeId: s.selectedNodeId,
        selectedNodeIds: s.selectedNodeIds,
        domTree: s.domTree,
        panic: s.panic,
        clearSelection: s.clearSelection,
        isAuthenticated: s.isAuthenticated,
    })));

    const navigatorOpen = useStore((s) => s.panels.navigator.open);
    const navigatorTab = useStore((s) => s.panels.navigator.activeTab);
    const timelineOpen = useStore((s) => s.panels.timeline.open);
    const codeOpen = useStore((s) => s.panels.code.open);
    const inspectorTab = useStore((s) => s.panels.inspector.activeTab);
    const setPanelOpen = useStore((s) => s.setPanelOpen);
    const setPanelActiveTab = useStore((s) => s.setPanelActiveTab);
    const openChat = useStore((s) => s.openChat);
    const undoClear = useUndoStore((s) => s.clear);
    const selectedElement = editorEngine.elements.selected[0];

    function handleLogin() {
        window.open(LOGIN_URL, 'cssstudio-auth', 'width=500,height=600');
    }

    const { applyEntry } = useUndoApply({ bridge });
    const ops = useDomOperations({ bridge, contextMenu, setContextMenu });

    const { isPickingElement, togglePicker } = useElementPicker(
        ops.handleSelectNode,
        ops.handleSelectNodes,
    );
    const { isDrawingElement, toggleDraw } = useElementDraw(ops.handleDrawElement);

    useInlineEdit(ops.handleInlineTextEdit, ops.handleSelectNode);
    usePromptInput(ops.handlePromptIconClick, { isAuthenticated, onLogin: handleLogin });
    useFlexDrag({ bridge, onReorder: ops.handleReorder });
    useAbsDrag({ bridge, onPositionChange: ops.handleAbsPositionChange });

    useKeyboardShortcuts({
        applyEntry: (entry, direction) =>
            applyEntry(entry as Parameters<typeof applyEntry>[0], direction),
        sendEdit,
        handleSelectNode: ops.handleSelectNode,
        handleToggleSelectNode: ops.handleToggleSelectNode,
        duplicateElement: ops.duplicateElement,
        deleteElement: ops.deleteElement,
        onLogin: handleLogin,
        isDemo: mode === 'demo',
    });

    const propertiesPanelRef = useRef<{ toggleFilter: () => void }>(null);
    const [navFilter, setNavFilter] = useState('');
    const [navFilterOpen, setNavFilterOpen] = useState(false);
    const navFilterRef = useRef<HTMLInputElement>(null);
    const treeRef = useRef<HTMLDivElement>(null);

    const showPageLine = useCallback(
        (beforeId: number | null, parentId: number) => {
            const items = bridge.getChildRectsAndIds(parentId);
            if (items.length === 0) return;
            if (beforeId !== null) {
                const target = items.find((item: { id: number }) => item.id === beforeId);
                if (target) {
                    bridge.showReorderLine({
                        x: target.rect.left,
                        y: target.rect.top - 1,
                        w: target.rect.width,
                        h: 2,
                    });
                }
            } else {
                const last = items[items.length - 1];
                if (!last) return;
                bridge.showReorderLine({
                    x: last.rect.left,
                    y: last.rect.bottom - 1,
                    w: last.rect.width,
                    h: 2,
                });
            }
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
        if (mode === 'demo') {
            useStore.getState().setIsAuthenticated(true);
            return;
        }
        auth.isAuthenticated().then((authed: boolean) => {
            useStore.getState().setIsAuthenticated(authed);
        });
        function onMessage(e: MessageEvent) {
            if (e.origin === 'https://cssstudio.ai' && (e.data as any)?.type === 'auth-token') {
                auth
                    .storeTokens((e.data as any).token, (e.data as any).refreshToken)
                    .then(() => {
                        auth.markAuthenticated();
                        useStore.getState().setIsAuthenticated(true);
                    });
            }
        }
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [mode]);

    useEffect(() => {
        if (mode === 'demo') return;
        function handleBeforeUnload(e: BeforeUnloadEvent) {
            const { stagedChanges, pendingChangesCopied } = useStore.getState();
            if (stagedChanges.length > 0 && !pendingChangesCopied) {
                e.preventDefault();
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [mode]);

    useEffect(() => {
        if (panic) openChat();
    }, [panic, openChat]);

    useEffect(() => {
        if (inspectorTab === 'variables') {
            setPanelActiveTab('inspector', 'design');
        }
    }, [inspectorTab, setPanelActiveTab]);

    const hasSelection = selectedNodeId !== null;
    const isMultiSelect = selectedNodeIds.length > 1;

    const handleToggleCode = useCallback(async () => {
        const nextOpen = !useStore.getState().panels.code.open;
        setPanelOpen('code', nextOpen);

        if (!nextOpen) {
            return;
        }

        const currentSelected = editorEngine.elements.selected[0];
        const currentOid = currentSelected?.instanceId ?? currentSelected?.oid;
        if (currentOid) {
            await editorEngine.ide.openCodeBlock(currentOid);
            return;
        }

        if (selectedNodeId === null) {
            return;
        }

        const localRef = getOnlookBridgeRef(selectedNodeId);
        if (!localRef) {
            return;
        }

        const frameData = editorEngine.frames.get(localRef.frameId);
        if (!frameData?.view) {
            return;
        }

        const selectedElement = await frameData.view.getElementByDomId(localRef.domId, true);
        if (!selectedElement) {
            return;
        }

        editorEngine.frames.select([frameData.frame]);
        editorEngine.elements.click([selectedElement]);

        const oid = selectedElement.instanceId ?? selectedElement.oid;
        if (!oid) {
            return;
        }

        await editorEngine.ide.openCodeBlock(oid);
    }, [editorEngine, selectedNodeId, setPanelOpen]);

    return (
        <>
            <Toolbar
                isPicking={isPickingElement}
                isDrawing={isDrawingElement}
                onTogglePicker={togglePicker}
                onToggleDraw={toggleDraw}
                onToggleCode={handleToggleCode}
                onLogin={handleLogin}
                onSendEdit={sendEdit}
                onAnswer={sendAnswer}
                onReconnect={reconnect}
                mode={mode}
            />
            <StudioOnlookDocks />

            {hasSelection && (
                <Panel
                    panelId="inspector"
                    tabs={[
                        { id: 'design', label: 'Design' },
                        { id: 'motion', label: 'Motion', disabled: isMultiSelect },
                    ]}
                    headerSlot={
                        <button
                            className={panelStyles.headerButton}
                            onClick={() => propertiesPanelRef.current?.toggleFilter()}
                            title="Filter"
                            aria-label="Filter"
                        >
                            <Search />
                        </button>
                    }
                    onClose={() => {
                        clearSelection();
                        selectElements([], null as never);
                        undoClear();
                    }}
                >
                    <PropertiesPanel
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
                        { id: 'pages', label: 'Pages' },
                        { id: 'images', label: 'Images' },
                        { id: 'brand', label: 'Brand' },
                        { id: 'branches', label: 'Branches' },
                        { id: 'metadata', label: 'Metadata' },
                        { id: 'chat', label: 'Chat', shortcut: 'Alt+T' },
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
                                <Search />
                            </button>
                        ) : undefined
                    }
                    onClose={() => setPanelOpen('navigator', false)}
                >
                    <FilterContext.Provider value={navFilter}>
                        {navigatorTab === 'elements' && navFilterOpen && (
                            <div className="m-0 flex items-center gap-1.5 border-b border-[var(--cs-border)] bg-[var(--cs-layer)] px-2 py-1">
                                <Search
                                    size={12}
                                    className="shrink-0 text-[var(--cs-icon-muted)]"
                                />
                                <input
                                    ref={navFilterRef}
                                    type="text"
                                    className="flex-1 bg-transparent text-xs text-[var(--cs-foreground)] outline-none placeholder:text-[var(--cs-icon-muted)]"
                                    placeholder="Filter elements..."
                                    value={navFilter}
                                    onChange={(e) => setNavFilter(e.target.value)}
                                    onBlur={() => {
                                        if (!navFilter) {
                                            setNavFilterOpen(false);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            setNavFilter('');
                                            setNavFilterOpen(false);
                                        }
                                    }}
                                    autoFocus
                                />
                            </div>
                        )}
                        {navigatorTab === 'elements' && (
                            <DomTree
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
                        {navigatorTab === 'pages' && <PagesTab />}
                        {navigatorTab === 'images' && <ImagesTab />}
                        {navigatorTab === 'brand' && <BrandTab />}
                        {navigatorTab === 'branches' && <BranchesTab />}
                        {navigatorTab === 'metadata' && (
                            <MetadataPanel
                                fetchMetadata={bridge.fetchPageMetadata}
                                onMetadataChange={ops.handleMetadataChange}
                            />
                        )}
                        {navigatorTab === 'chat' && (
                            <ChatPanel
                                onSend={sendUserMessage}
                                mode={mode}
                            />
                        )}
                    </FilterContext.Provider>
                </Panel>
            )}

            {codeOpen && (
                <Panel
                    panelId="code"
                    tabs={[{ id: 'code', label: 'Code' }]}
                    onClose={() => setPanelOpen('code', false)}
                    className="min-w-[420px]"
                >
                    <CodeTab
                        projectId={editorEngine.projectId}
                        branchId={editorEngine.branches.activeBranch.id}
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

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={
                        contextMenu.source === 'tree'
                            ? [
                                  ...(selectedElement?.instanceId
                                      ? [
                                            {
                                                label: 'View instance code',
                                                onClick: () => {
                                                    void editorEngine.ide.openCodeBlock(
                                                        selectedElement.instanceId!,
                                                    );
                                                },
                                                disabled: !selectedElement.instanceId,
                                            },
                                        ]
                                      : []),
                                  {
                                      label: `View ${selectedElement?.instanceId ? 'component' : 'element'} in Code Panel`,
                                      onClick: () => {
                                          const oid = selectedElement?.instanceId ?? selectedElement?.oid;
                                          if (!oid) {
                                              return;
                                          }
                                          void editorEngine.ide.openCodeBlock(oid);
                                      },
                                      disabled: !(selectedElement?.instanceId ?? selectedElement?.oid),
                                  },
                                  {
                                      label: 'Add to AI Chat',
                                      onClick: () => ops.handlePromptIconClick(contextMenu.nodeId),
                                      shortcut: 'Ctrl ⇧ L',
                                      disabled: selectedNodeIds.length === 0,
                                  },
                                  {
                                      label: 'New AI Chat',
                                      onClick: () => {
                                          editorEngine.chat.conversation.startNewConversation();
                                          ops.handlePromptIconClick(contextMenu.nodeId);
                                      },
                                      shortcut: 'Ctrl L',
                                  },
                                  { separator: true },
                                  {
                                      label: 'Group',
                                      onClick: () => {
                                          void editorEngine.group.groupSelectedElements();
                                      },
                                      shortcut: 'Ctrl G',
                                      disabled: !editorEngine.group.canGroupElements(),
                                  },
                                  {
                                      label: 'Ungroup',
                                      onClick: () => {
                                          void editorEngine.group.ungroupSelectedElement();
                                      },
                                      shortcut: 'Ctrl ⇧ G',
                                      disabled: !editorEngine.group.canUngroupElement(),
                                  },
                                  { separator: true },
                                  {
                                      label: 'Edit text',
                                      onClick: () => {
                                          void editorEngine.text.editSelectedElement();
                                      },
                                      shortcut: 'Enter',
                                      disabled: selectedNodeIds.length === 0,
                                  },
                                  {
                                      label: 'Copy',
                                      onClick: () => {
                                          void editorEngine.copy.copy();
                                      },
                                      shortcut: 'Ctrl C',
                                      disabled: selectedNodeIds.length === 0,
                                  },
                                  {
                                      label: 'Paste',
                                      onClick: () => {
                                          void editorEngine.copy.paste();
                                      },
                                      shortcut: 'Ctrl V',
                                      disabled: !editorEngine.copy.copied || selectedNodeIds.length === 0,
                                  },
                                  {
                                      label: 'Cut',
                                      onClick: () => {
                                          void editorEngine.copy.cut();
                                      },
                                      shortcut: 'Ctrl X',
                                      disabled: selectedNodeIds.length === 0,
                                  },
                                  {
                                      label: 'Duplicate',
                                      onClick: () => {
                                          void editorEngine.copy.duplicate();
                                      },
                                      shortcut: 'Ctrl D',
                                      disabled: selectedNodeIds.length === 0,
                                  },
                                  {
                                      label: 'Delete',
                                      onClick: () => {
                                          void editorEngine.elements.delete();
                                      },
                                      danger: true,
                                      shortcut: 'Delete',
                                      disabled: selectedNodeIds.length === 0,
                                  },
                              ]
                            : selectedNodeIds.length > 1
                              ? [
                                    {
                                        label: `Duplicate ${selectedNodeIds.length} elements`,
                                        onClick: ops.handleDuplicateElement,
                                        shortcut: 'Cmd+D',
                                    },
                                    { separator: true },
                                    {
                                        label: `Delete ${selectedNodeIds.length} elements`,
                                        onClick: ops.handleDeleteElement,
                                        danger: true,
                                        shortcut: 'Backspace',
                                    },
                                ]
                            : [
                                  { label: 'Add child element', onClick: ops.handleAddChild },
                                  { label: 'Add sibling element', onClick: ops.handleAddSibling },
                                  {
                                      label: 'Duplicate element',
                                      onClick: ops.handleDuplicateElement,
                                      shortcut: 'Cmd+D',
                                  },
                                  { separator: true },
                                  {
                                      label: 'Delete element',
                                      onClick: ops.handleDeleteElement,
                                      danger: true,
                                      shortcut: 'Backspace',
                                  },
                              ]
                    }
                    onClose={() => setContextMenu(null)}
                />
            )}
        </>
    );
}
