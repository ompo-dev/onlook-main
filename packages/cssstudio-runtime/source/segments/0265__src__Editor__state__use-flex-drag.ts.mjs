// src/Editor/state/use-flex-drag.ts
import { useEffect as useEffect8, useRef as useRef6, useCallback as useCallback5 } from "react";
var DRAG_THRESHOLD = 5;
function useFlexDrag({ bridge, onReorder }) {
  const isDragging2 = useRef6(false);
  const dragState = useRef6(null);
  const selectedNodeId = useStore2((s) => s.selectedNodeId);
  const isMultiSelect = useStore2((s) => s.selectedNodeIds.length > 1);
  const getFlexParent = useCallback5(
    (nodeId) => {
      const parentId = bridge.getParentId(nodeId);
      if (parentId === null) return null;
      const info = bridge.getFlexInfo(parentId);
      if (!info || !info.isFlex) return null;
      const siblings = bridge.getSiblingIds(parentId);
      if (siblings.length < 2) return null;
      return { parentId, direction: info.direction };
    },
    [bridge]
  );
  const computeInsertionPoint = useCallback5(
    (clientX, clientY, parentId, draggedId, direction) => {
      const items = bridge.getChildRectsAndIds(parentId);
      if (items.length < 2) return null;
      const isRow = direction === "row" || direction === "row-reverse";
      const pointer = isRow ? clientX : clientY;
      const others = items.filter((item) => item.id !== draggedId);
      if (others.length === 0) return null;
      const otherRects = others.map((i) => i.rect);
      const containerTop = Math.min(...otherRects.map((r) => r.top));
      const containerBottom = Math.max(...otherRects.map((r) => r.bottom));
      const containerLeft = Math.min(...otherRects.map((r) => r.left));
      const containerRight = Math.max(...otherRects.map((r) => r.right));
      for (let i = 0; i < others.length; i++) {
        const mid = isRow ? others[i].rect.left + others[i].rect.width / 2 : others[i].rect.top + others[i].rect.height / 2;
        if (pointer < mid) {
          const edge2 = isRow ? others[i].rect.left : others[i].rect.top;
          const lineRect2 = isRow ? { x: edge2 - 1, y: containerTop, w: 2, h: containerBottom - containerTop } : { x: containerLeft, y: edge2 - 1, w: containerRight - containerLeft, h: 2 };
          return { beforeId: others[i].id, lineRect: lineRect2 };
        }
      }
      const last = others[others.length - 1];
      const edge = isRow ? last.rect.right : last.rect.bottom;
      const lineRect = isRow ? { x: edge - 1, y: containerTop, w: 2, h: containerBottom - containerTop } : { x: containerLeft, y: edge - 1, w: containerRight - containerLeft, h: 2 };
      return { beforeId: null, lineRect };
    },
    [bridge]
  );
  useEffect8(() => {
    if (selectedNodeId === null || isMultiSelect) return;
    const absInfo = bridge.getAbsolutePositionInfo(selectedNodeId);
    if (absInfo?.isAbsolute) return;
    const flexInfo = getFlexParent(selectedNodeId);
    if (!flexInfo) return;
    const { parentId, direction } = flexInfo;
    function onDown(e) {
      if (isDragging2.current) return;
      if (selectedNodeId === null) return;
      if (isInlineEditActive()) return;
      if (useStore2.getState().isDrawingElement) return;
      if (useStore2.getState().isPickingElement) return;
      const absCheck = bridge.getAbsolutePositionInfo(selectedNodeId);
      if (absCheck?.isAbsolute) return;
      const origin = e.composedPath()[0];
      const host = document.querySelector("css-studio-panel");
      if (host?.shadowRoot?.contains(origin)) return;
      const items = bridge.getChildRectsAndIds(parentId);
      const draggedItem = items.find((i) => i.id === selectedNodeId);
      if (!draggedItem) return;
      if (e.clientX < draggedItem.rect.left || e.clientX > draggedItem.rect.right || e.clientY < draggedItem.rect.top || e.clientY > draggedItem.rect.bottom) return;
      dragState.current = {
        draggedId: selectedNodeId,
        parentId,
        direction,
        startX: e.clientX,
        startY: e.clientY,
        committed: false,
        lastBeforeId: void 0
      };
      document.addEventListener("pointermove", onMove, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("keydown", onKey, true);
    }
    function onMove(e) {
      const ds = dragState.current;
      if (!ds) return;
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      if (!ds.committed) {
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
        ds.committed = true;
        isDragging2.current = true;
        bridge.showReorderGhost(ds.draggedId);
        bridge.startDragTransform(ds.draggedId);
        document.documentElement.style.cursor = "grabbing";
        document.documentElement.style.userSelect = "none";
        window.getSelection()?.removeAllRanges();
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      bridge.updateDragTransform(ds.draggedId, dx, dy);
      const result = computeInsertionPoint(
        e.clientX,
        e.clientY,
        ds.parentId,
        ds.draggedId,
        ds.direction
      );
      if (result) {
        bridge.showReorderLine(result.lineRect);
        ds.lastBeforeId = result.beforeId;
      }
    }
    function onUp(e) {
      const ds = dragState.current;
      if (!ds) {
        cleanup();
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      if (ds.committed) {
        bridge.clearDragTransform(ds.draggedId);
        bridge.hideReorderLine();
        bridge.hideReorderGhost();
        if (ds.lastBeforeId !== void 0) {
          onReorder(ds.draggedId, ds.parentId, ds.lastBeforeId ?? null);
        }
      }
      cleanup();
    }
    function onKey(e) {
      if (e.key !== "Escape") return;
      const ds = dragState.current;
      if (!ds || !ds.committed) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      bridge.clearDragTransform(ds.draggedId);
      bridge.hideReorderLine();
      bridge.hideReorderGhost();
      cleanup();
    }
    function suppress(e) {
      if (isDragging2.current) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
    function cleanup() {
      isDragging2.current = false;
      dragState.current = null;
      document.documentElement.style.cursor = "";
      document.documentElement.style.userSelect = "";
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("keydown", onKey, true);
      requestAnimationFrame(() => {
        document.removeEventListener("click", suppress, true);
        document.removeEventListener("mousedown", suppress, true);
        document.removeEventListener("mouseup", suppress, true);
      });
    }
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("click", suppress, true);
    document.addEventListener("mousedown", suppress, true);
    document.addEventListener("mouseup", suppress, true);
    return () => {
      const ds = dragState.current;
      if (ds?.committed) {
        bridge.clearDragTransform(ds.draggedId);
        bridge.hideReorderLine();
        bridge.hideReorderGhost();
      }
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("click", suppress, true);
      document.removeEventListener("mousedown", suppress, true);
      document.removeEventListener("mouseup", suppress, true);
      cleanup();
    };
  }, [selectedNodeId, isMultiSelect, bridge, getFlexParent, computeInsertionPoint, onReorder]);
}

