// src/Editor/InPagePanel/index.tsx
import { Fragment as Fragment29, jsx as jsx77, jsxs as jsxs61 } from "react/jsx-runtime";
var LOGIN_URL = "https://cssstudio.ai/login";
function InPagePanel({ mcpPort, mode }) {
  const [contextMenu, setContextMenu] = useState37(null);
  const handleContextMenuEvent = useCallback48((result) => {
    const node = findNodeInTree(useStore2.getState().domTree, result.id);
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
    isAuthenticated
  } = useStore2();
  const navigatorOpen = useStore2((s) => s.panels.navigator.open);
  const navigatorTab = useStore2((s) => s.panels.navigator.activeTab);
  const timelineOpen = useStore2((s) => s.panels.timeline.open);
  const setPanelOpen = useStore2((s) => s.setPanelOpen);
  const openChat = useStore2((s) => s.openChat);
  const undoClear = useUndoStore((s) => s.clear);
  function handleLogin() {
    window.open(LOGIN_URL, "cssstudio-auth", "width=500,height=600");
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
    isDemo: mode === "demo"
  });
  const propertiesPanelRef = useRef43(null);
  const [navFilter, setNavFilter] = useState37("");
  const [navFilterOpen, setNavFilterOpen] = useState37(false);
  const navFilterRef = useRef43(null);
  const treeRef = useRef43(null);
  const showPageLine = useCallback48(
    (beforeId, parentId) => {
      const items = bridge.getChildRectsAndIds(parentId);
      if (items.length === 0) return;
      if (beforeId !== null) {
        const target = items.find((i) => i.id === beforeId);
        if (target) {
          bridge.showReorderLine({ x: target.rect.left, y: target.rect.top - 1, w: target.rect.width, h: 2 });
        }
      } else {
        const last = items[items.length - 1];
        bridge.showReorderLine({ x: last.rect.left, y: last.rect.bottom - 1, w: last.rect.width, h: 2 });
      }
    },
    [bridge]
  );
  const { draggedNodeId, dropTarget, startDrag: startDrag2 } = useTreeDrag({
    containerRef: treeRef,
    onReorder: ops.handleReorder,
    showPageLine,
    hidePageLine: bridge.hideReorderLine
  });
  useEffect46(() => {
    if (mode === "demo") {
      useStore2.getState().setIsAuthenticated(true);
      return;
    }
    auth.isAuthenticated().then((authed) => {
      useStore2.getState().setIsAuthenticated(authed);
    });
    function onMessage(e) {
      if (e.origin === "https://cssstudio.ai" && e.data?.type === "auth-token") {
        auth.storeTokens(e.data.token, e.data.refreshToken).then(() => {
          auth.markAuthenticated();
          useStore2.getState().setIsAuthenticated(true);
        });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mode]);
  useEffect46(() => {
    if (mode === "demo") return;
    function handleBeforeUnload(e) {
      const { stagedChanges, pendingChangesCopied } = useStore2.getState();
      if (stagedChanges.length > 0 && !pendingChangesCopied) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [mode]);
  useEffect46(() => {
    if (panic) openChat();
  }, [panic, openChat]);
  const hasSelection = selectedNodeId !== null;
  const isMultiSelect = selectedNodeIds.length > 1;
  return /* @__PURE__ */ jsxs61(Fragment29, { children: [
    /* @__PURE__ */ jsx77(
      Toolbar,
      {
        isPicking: isPickingElement,
        isDrawing: isDrawingElement,
        onTogglePicker: togglePicker,
        onToggleDraw: toggleDraw,
        onLogin: handleLogin,
        onSendEdit: sendEdit,
        onAnswer: sendAnswer,
        onReconnect: reconnect,
        mode
      }
    ),
    hasSelection && /* @__PURE__ */ jsx77(
      Panel,
      {
        panelId: "inspector",
        tabs: [
          { id: "design", label: "Design" },
          { id: "motion", label: "Motion", disabled: isMultiSelect },
          { id: "variables", label: "Variables", disabled: isMultiSelect },
          { id: "html", label: "HTML", disabled: isMultiSelect }
        ],
        label: void 0,
        headerSlot: /* @__PURE__ */ jsx77(
          "button",
          {
            className: Panel_default.headerButton,
            onClick: () => propertiesPanelRef.current?.toggleFilter(),
            title: "Filter (\u2318F)",
            "aria-label": "Filter",
            children: /* @__PURE__ */ jsx77(SearchIcon, {})
          }
        ),
        onClose: () => {
          clearSelection();
          selectElements([], null);
          undoClear();
        },
        children: /* @__PURE__ */ jsx77(
          PropertiesPanel,
          {
            ref: propertiesPanelRef,
            onPropertyChange: ops.handlePropertyChange,
            onAttributeChange: ops.handleAttributeChange,
            onAttributeDelete: ops.handleAttributeDelete,
            onAttributeRename: ops.handleAttributeRename,
            onElementVariableChange: ops.handleElementVariableChange,
            onTagChange: ops.handleTagChange,
            onNewElementVariable: ops.handleNewElementVariable
          }
        )
      }
    ),
    navigatorOpen && /* @__PURE__ */ jsx77(
      Panel,
      {
        panelId: "navigator",
        tabs: [
          { id: "elements", label: "Elements", shortcut: "\u2325E" },
          { id: "metadata", label: "Metadata" },
          { id: "chat", label: "Chat", shortcut: "\u2325T" }
        ],
        headerSlot: navigatorTab !== "chat" ? /* @__PURE__ */ jsx77(
          "button",
          {
            className: Panel_default.headerButton,
            onClick: () => {
              setNavFilterOpen((v) => !v);
              if (navFilterOpen) setNavFilter("");
            },
            title: "Filter (\u2318F)",
            "aria-label": "Filter",
            children: /* @__PURE__ */ jsx77(SearchIcon, {})
          }
        ) : void 0,
        onClose: () => setPanelOpen("navigator", false),
        children: /* @__PURE__ */ jsxs61(FilterContext.Provider, { value: navFilter, children: [
          navFilterOpen && /* @__PURE__ */ jsxs61("div", { className: PropertiesPanel_default.filterBar, style: { margin: 0 }, children: [
            /* @__PURE__ */ jsx77(SearchIcon, { size: 12, className: PropertiesPanel_default.filterIcon }),
            /* @__PURE__ */ jsx77(
              "input",
              {
                ref: navFilterRef,
                type: "text",
                className: PropertiesPanel_default.filterInput,
                placeholder: "Filter elements...",
                value: navFilter,
                onChange: (e) => setNavFilter(e.target.value),
                onBlur: () => {
                  if (!navFilter) setNavFilterOpen(false);
                },
                onKeyDown: (e) => {
                  if (e.key === "Escape") {
                    setNavFilter("");
                    setNavFilterOpen(false);
                  }
                },
                autoFocus: true
              }
            )
          ] }),
          navigatorTab === "elements" && /* @__PURE__ */ jsx77(
            DomTree,
            {
              ref: treeRef,
              onSelectNode: ops.handleSelectNode,
              onToggleSelectNode: ops.handleToggleSelectNode,
              onHover: ops.handleHoverNode,
              onContextMenu: ops.handleTreeContextMenu,
              onTagChange: ops.handleTagChange,
              onDragStart: startDrag2,
              draggedNodeId,
              dropTarget
            }
          ),
          navigatorTab === "metadata" && /* @__PURE__ */ jsx77(
            MetadataPanel,
            {
              fetchMetadata: bridge.fetchPageMetadata,
              onMetadataChange: ops.handleMetadataChange
            }
          ),
          navigatorTab === "chat" && /* @__PURE__ */ jsx77(
            ChatPanel,
            {
              onSend: sendUserMessage,
              mode
            }
          )
        ] })
      }
    ),
    timelineOpen && /* @__PURE__ */ jsx77(
      Panel,
      {
        panelId: "timeline",
        tabs: [{ id: "animations", label: "Animations", shortcut: "\u2325A" }],
        onClose: () => setPanelOpen("timeline", false),
        children: /* @__PURE__ */ jsx77(AnimationsPanel, {})
      }
    ),
    contextMenu && /* @__PURE__ */ jsx77(
      ContextMenu,
      {
        x: contextMenu.x,
        y: contextMenu.y,
        items: selectedNodeIds.length > 1 ? [
          { label: `Duplicate ${selectedNodeIds.length} elements`, onClick: ops.handleDuplicateElement, shortcut: "\u2318D" },
          { separator: true },
          { label: `Delete ${selectedNodeIds.length} elements`, onClick: ops.handleDeleteElement, danger: true, shortcut: "\u2326" }
        ] : [
          { label: "Add child element", onClick: ops.handleAddChild },
          { label: "Add sibling element", onClick: ops.handleAddSibling },
          { label: "Duplicate element", onClick: ops.handleDuplicateElement, shortcut: "\u2318D" },
          { separator: true },
          { label: "Delete element", onClick: ops.handleDeleteElement, danger: true, shortcut: "\u2326" }
        ],
        onClose: () => setContextMenu(null)
      }
    )
  ] });
}

