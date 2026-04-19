// src/Editor/InPagePanel/use-keyboard-shortcuts.ts
import { useEffect as useEffect45 } from "react";
function isInputFocused() {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) {
    el = el.shadowRoot.activeElement;
  }
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || !!el?.isContentEditable;
}
function useKeyboardShortcuts({
  applyEntry,
  sendEdit,
  handleSelectNode,
  handleToggleSelectNode,
  duplicateElement: duplicateElement2,
  deleteElement,
  onLogin,
  isDemo
}) {
  const clearSelection = useStore2((s) => s.clearSelection);
  const undoClear = useUndoStore((s) => s.clear);
  useEffect45(() => {
    const handler = (e) => {
      if (isInputFocused()) return;
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) {
        const entry = useUndoStore.getState().redo();
        if (entry) applyEntry(entry, "redo");
      } else {
        const entry = useUndoStore.getState().undo();
        if (entry) applyEntry(entry, "undo");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [applyEntry]);
  useEffect45(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      if (isInputFocused()) return;
      e.preventDefault();
      const store = useStore2.getState();
      if (store.isDrawingElement) {
        stopDrawMode();
        store.setDrawingElement(false);
        return;
      }
      if (store.isPickingElement) {
        stopPicker();
        store.setPickingElement(false);
        return;
      }
      clearSelection();
      selectElements([], null);
      undoClear();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearSelection, undoClear]);
  useEffect45(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        sendEdit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sendEdit]);
  useEffect45(() => {
    const handler = (e) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      if (isInputFocused()) return;
      const store = useStore2.getState();
      if (e.code === "KeyE") {
        e.preventDefault();
        store.togglePanelTab("navigator", "elements");
      } else if (e.code === "KeyA") {
        e.preventDefault();
        store.togglePanelTab("timeline", "animations");
      } else if (e.code === "KeyT") {
        e.preventDefault();
        store.togglePanelTab("navigator", "chat");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect45(() => {
    const handler = (e) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.code !== "KeyC") return;
      if (isInputFocused()) return;
      e.preventDefault();
      if (!useStore2.getState().isAuthenticated) {
        onLogin();
        return;
      }
      const { stagedChanges } = useStore2.getState();
      if (stagedChanges.length === 0) return;
      const prompt = buildCopyPrompt(stagedChanges, { demo: isDemo });
      navigator.clipboard.writeText(prompt).then(() => {
        useStore2.getState().clearPendingChanges();
      });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect45(() => {
    const handler = (e) => {
      if (isInputFocused()) return;
      const { selectedNodeId: nodeId, selectedNodeIds: ids, animSelectedKeyframes } = useStore2.getState();
      if (nodeId === null) return;
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyD") {
        e.preventDefault();
        for (const id3 of ids) duplicateElement2(id3);
      } else if (e.key === "Delete") {
        if (animSelectedKeyframes.length > 0) return;
        e.preventDefault();
        const toDelete = [...ids].reverse();
        for (const id3 of toDelete) deleteElement(id3);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [duplicateElement2, deleteElement]);
  useEffect45(() => {
    const handler = (e) => {
      const { key } = e;
      if (key !== "ArrowUp" && key !== "ArrowDown" && key !== "ArrowLeft" && key !== "ArrowRight") return;
      if (isInputFocused()) return;
      const store = useStore2.getState();
      if (!store.panels.navigator.open || store.panels.navigator.activeTab !== "elements") return;
      if (!store.domTree || store.selectedNodeId === null) return;
      e.preventDefault();
      if (key === "ArrowUp" || key === "ArrowDown") {
        const visible = getVisibleNodeIds(store.domTree, store.expandedNodes);
        const idx = visible.indexOf(store.selectedNodeId);
        if (idx === -1) return;
        const nextIdx = key === "ArrowUp" ? idx - 1 : idx + 1;
        if (nextIdx >= 0 && nextIdx < visible.length) {
          handleSelectNode(visible[nextIdx]);
        }
      } else if (key === "ArrowRight") {
        const node = findNodeInTree(store.domTree, store.selectedNodeId);
        if (!node) return;
        const visibleChildren = node.children.filter((c) => !TREE_HIDDEN_TAGS.has(c.localName));
        if (visibleChildren.length === 0) return;
        if (!store.expandedNodes[store.selectedNodeId]) {
          store.toggleNode(store.selectedNodeId);
        } else {
          handleSelectNode(visibleChildren[0].id);
        }
      } else if (key === "ArrowLeft") {
        if (store.expandedNodes[store.selectedNodeId]) {
          store.toggleNode(store.selectedNodeId);
        } else {
          const path = findNodePath(store.domTree, store.selectedNodeId);
          if (path && path.length >= 2) {
            handleSelectNode(path[path.length - 2]);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSelectNode]);
  useEffect45(() => {
    const handler = (e) => {
      if (e.code !== "Space") return;
      if (isInputFocused()) return;
      const store = useStore2.getState();
      if (!store.panels.timeline.open) return;
      if (store.selectedKeyframesName === null) return;
      e.preventDefault();
      if (store.animPlaybackOrigin !== null) {
        store.animStopPlaying();
      } else {
        if (store.animCurrentTime >= 1) store.animScrubTo(0);
        store.animStartPlaying();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect45(() => {
    const handler = (e) => {
      if (!e.shiftKey) return;
      if (useStore2.getState().selectedNodeIds.length === 0) return;
      if (useStore2.getState().isPickingElement) return;
      if (isInputFocused()) return;
      const target = e.target;
      if (target.localName === "css-studio-panel" || target.closest?.("css-studio-panel")) return;
      const el = getPageElementAtPoint(e.clientX, e.clientY);
      if (!el) return;
      e.preventDefault();
      handleToggleSelectNode(getId(el));
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [handleToggleSelectNode]);
}

