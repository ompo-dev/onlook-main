import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../state/use-store';
import { useShallow } from 'zustand/react/shallow';
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
import { SearchIcon } from '../icons/SearchIcon';
import { auth } from '../../auth/Auth';
import propertiesStyles from '../PropertiesPanel/PropertiesPanel.module.css';

const LOGIN_URL = 'https://cssstudio.ai/login';

interface InPagePanelProps {
    mcpPort?: number;
    mode?: string;
}

interface ContextMenuState {
    nodeId: number;
    x: number;
    y: number;
}

export function InPagePanel({ mcpPort, mode }: InPagePanelProps) {
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    const handleContextMenuEvent = useCallback((result: { id: number; x: number; y: number }) => {
        const node = findNodeInTree(useStore.getState().domTree, result.id);
        if (node && !PROTECTED_TAGS4.has(node.localName)) {
            setContextMenu({ nodeId: result.id, x: result.x, y: result.y });
        }
    }, []);

    const bridge = usePageBridge({ onContextMenu: handleContextMenuEvent });
    useKeyframesScrape();

    const { sendEdit, sendAnswer, sendUserMessage, reconnect } = useMcpDirect(mcpPort, mode);

    const {
        selectedNodeId,
        selectedNodeIds,
        domTree,
        designTokens,
        panic,
        clearSelection,
        isAuthenticated,
    } = useStore(useShallow((s) => ({
        selectedNodeId: s.selectedNodeId,
        selectedNodeIds: s.selectedNodeIds,
        domTree: s.domTree,
        designTokens: s.designTokens,
        panic: s.panic,
        clearSelection: s.clearSelection,
        isAuthenticated: s.isAuthenticated,
    })));

    const navigatorOpen = useStore((s) => s.panels.navigator.open);
    const navigatorTab = useStore((s) => s.panels.navigator.activeTab);
    const timelineOpen = useStore((s) => s.panels.timeline.open);
    const setPanelOpen = useStore((s) => s.setPanelOpen);
    const openChat = useStore((s) => s.openChat);
    const undoClear = useUndoStore((s) => s.clear);

    function handleLogin() {
        window.open(LOGIN_URL, 'cssstudio-auth', 'width=500,height=600');
    }

    const { applyEntry } = useUndoApply({ bridge });
    const ops = useDomOperations({ bridge, contextMenu, setContextMenu });

    const { isPickingElement, togglePicker } = useElementPicker(ops.handleSelectNode, ops.handleSelectNodes);
    const { isDrawingElement, toggleDraw } = useElementDraw(ops.handleDrawElement);

    useInlineEdit(ops.handleInlineTextEdit, ops.handleSelectNode);
    usePromptInput(ops.handlePromptIconClick, { isAuthenticated, onLogin: handleLogin });
    useFlexDrag({ bridge, onReorder: ops.handleReorder });
    useAbsDrag({ bridge, onPositionChange: ops.handleAbsPositionChange });

    useKeyboardShortcuts({
        applyEntry,
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
                const target = items.find((i: { id: number }) => i.id === beforeId);
                if (target) {
                    bridge.showReorderLine({ x: target.rect.left, y: target.rect.top - 1, w: target.rect.width, h: 2 });
                }
            } else {
                const last = items[items.length - 1];
                bridge.showReorderLine({ x: last.rect.left, y: last.rect.bottom - 1, w: last.rect.width, h: 2 });
            }
        },
        [bridge],
    );

    const { draggedNodeId, dropTarget, startDrag } = useTreeDrag({
        containerRef: treeRef,
        onReorder: ops.handleReorder,
        showPageLine,
        hidePageLine: bridge.hideReorderLine,
    });

    // Auth check
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
                auth.storeTokens((e.data as any).token, (e.data as any).refreshToken).then(() => {
                    auth.markAuthenticated();
                    useStore.getState().setIsAuthenticated(true);
                });
            }
        }
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [mode]);

    // Beforeunload guard for staged changes
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

    // Auto-open chat on panic
    useEffect(() => {
        if (panic) openChat();
    }, [panic, openChat]);

    const hasSelection = selectedNodeId !== null;
    const isMultiSelect = selectedNodeIds.length > 1;

    return (
        <>
            <Toolbar
                isPicking={isPickingElement}
                isDrawing={isDrawingElement}
                onTogglePicker={togglePicker}
                onToggleDraw={toggleDraw}
                onLogin={handleLogin}
                onSendEdit={sendEdit}
                onAnswer={sendAnswer}
                onReconnect={reconnect}
                mode={mode}
            />

            {hasSelection && (
                <Panel
                    panelId="inspector"
                    tabs={[
                        { id: 'design', label: 'Design' },
                        { id: 'motion', label: 'Motion', disabled: isMultiSelect },
                        { id: 'variables', label: 'Variables', disabled: isMultiSelect },
                    ]}
                    label={undefined}
                    headerSlot={
                        <button
                            className={panelStyles.headerButton}
                            onClick={() => propertiesPanelRef.current?.toggleFilter()}
                            title="Filter (⌘F)"
                            aria-label="Filter"
                        >
                            <SearchIcon />
                        </button>
                    }
                    onClose={() => {
                        clearSelection();
                        selectElements([], null as any);
                        undoClear();
                    }}
                >
                    <PropertiesPanel
                        ref={propertiesPanelRef}
                        onPropertyChange={ops.handlePropertyChange}
                        onAttributeChange={ops.handleAttributeChange}
                        onAttributeDelete={ops.handleAttributeDelete}
                        onAttributeRename={ops.handleAttributeRename}
                        onElementVariableChange={ops.handleElementVariableChange}
                        onTagChange={ops.handleTagChange}
                        onNewElementVariable={ops.handleNewElementVariable}
                    />
                </Panel>
            )}

            {navigatorOpen && (
                <Panel
                    panelId="navigator"
                    tabs={[
                        { id: 'elements', label: 'Elements', shortcut: '⌥E' },
                        { id: 'metadata', label: 'Metadata' },
                        { id: 'chat', label: 'Chat', shortcut: '⌥T' },
                    ]}
                    headerSlot={
                        navigatorTab !== 'chat' ? (
                            <button
                                className={panelStyles.headerButton}
                                onClick={() => {
                                    setNavFilterOpen((v) => !v);
                                    if (navFilterOpen) setNavFilter('');
                                }}
                                title="Filter (⌘F)"
                                aria-label="Filter"
                            >
                                <SearchIcon />
                            </button>
                        ) : undefined
                    }
                    onClose={() => setPanelOpen('navigator', false)}
                >
                    <FilterContext.Provider value={navFilter}>
                        {navFilterOpen && (
                            <div className={propertiesStyles.filterBar} style={{ margin: 0 }}>
                                <SearchIcon size={12} className={propertiesStyles.filterIcon} />
                                <input
                                    ref={navFilterRef}
                                    type="text"
                                    className={propertiesStyles.filterInput}
                                    placeholder="Filter elements..."
                                    value={navFilter}
                                    onChange={(e) => setNavFilter(e.target.value)}
                                    onBlur={() => { if (!navFilter) setNavFilterOpen(false); }}
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

            {timelineOpen && (
                <Panel
                    panelId="timeline"
                    tabs={[{ id: 'animations', label: 'Animations', shortcut: '⌥A' }]}
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
                        selectedNodeIds.length > 1
                            ? [
                                { label: `Duplicate ${selectedNodeIds.length} elements`, onClick: ops.handleDuplicateElement, shortcut: '⌘D' },
                                { separator: true },
                                { label: `Delete ${selectedNodeIds.length} elements`, onClick: ops.handleDeleteElement, danger: true, shortcut: '⌫' },
                              ]
                            : [
                                { label: 'Add child element', onClick: ops.handleAddChild },
                                { label: 'Add sibling element', onClick: ops.handleAddSibling },
                                { label: 'Duplicate element', onClick: ops.handleDuplicateElement, shortcut: '⌘D' },
                                { separator: true },
                                { label: 'Delete element', onClick: ops.handleDeleteElement, danger: true, shortcut: '⌫' },
                              ]
                    }
                    onClose={() => setContextMenu(null)}
                />
            )}
        </>
    );
}
