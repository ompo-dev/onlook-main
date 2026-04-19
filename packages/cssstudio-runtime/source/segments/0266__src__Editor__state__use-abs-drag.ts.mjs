// src/Editor/state/use-abs-drag.ts
import { useEffect as useEffect9, useRef as useRef7, useCallback as useCallback6 } from "react";
var DRAG_THRESHOLD2 = 5;
function useAbsDrag({ bridge, onPositionChange }) {
  const isDragging2 = useRef7(false);
  const dragState = useRef7(null);
  const selectedNodeId = useStore2((s) => s.selectedNodeId);
  const isMultiSelect = useStore2((s) => s.selectedNodeIds.length > 1);
  const getAbsInfo = useCallback6(
    (nodeId) => {
      return bridge.getAbsolutePositionInfo(nodeId);
    },
    [bridge]
  );
  useEffect9(() => {
    if (selectedNodeId === null || isMultiSelect) return;
    const info = getAbsInfo(selectedNodeId);
    if (!info || !info.isAbsolute) return;
    function onDown(e) {
      if (isDragging2.current) return;
      if (selectedNodeId === null) return;
      if (isInlineEditActive()) return;
      if (useStore2.getState().isDrawingElement) return;
      if (useStore2.getState().isPickingElement) return;
      const origin = e.composedPath()[0];
      const host = document.querySelector("css-studio-panel");
      if (host?.shadowRoot?.contains(origin)) return;
      const quad = bridge.getElementQuad(selectedNodeId);
      if (!quad) return;
      if (!pointInQuad(e.clientX, e.clientY, quad.corners)) {
        const rect = bridge.getElementRect(selectedNodeId);
        if (!rect) return;
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
      }
      const posInfo = bridge.getAbsolutePositionInfo(selectedNodeId);
      if (!posInfo || !posInfo.isAbsolute) return;
      const horizProp = posInfo.useRight ? "right" : "left";
      const vertProp = posInfo.useBottom ? "bottom" : "top";
      const im = quad.inverseMatrix;
      dragState.current = {
        draggedId: selectedNodeId,
        startX: e.clientX,
        startY: e.clientY,
        committed: false,
        horizProp,
        vertProp,
        horizSign: horizProp === "right" ? -1 : 1,
        vertSign: vertProp === "bottom" ? -1 : 1,
        startHoriz: horizProp === "right" ? posInfo.computedRight : posInfo.computedLeft,
        startVert: vertProp === "bottom" ? posInfo.computedBottom : posInfo.computedTop,
        invA: im.a,
        invB: im.b,
        invC: im.c,
        invD: im.d
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
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD2) return;
        ds.committed = true;
        isDragging2.current = true;
        bridge.startAbsDragTransform(ds.draggedId);
        document.documentElement.style.cursor = "grabbing";
        document.documentElement.style.userSelect = "none";
        window.getSelection()?.removeAllRanges();
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      bridge.updateDragTransform(ds.draggedId, dx, dy);
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
        const screenDx = e.clientX - ds.startX;
        const screenDy = e.clientY - ds.startY;
        const localDx = ds.invA * screenDx + ds.invC * screenDy;
        const localDy = ds.invB * screenDx + ds.invD * screenDy;
        const finalHoriz = Math.round(ds.startHoriz + localDx * ds.horizSign);
        const finalVert = Math.round(ds.startVert + localDy * ds.vertSign);
        bridge.clearAbsDragTransform(ds.draggedId);
        const oldHoriz = ds.startHoriz + "px";
        const oldVert = ds.startVert + "px";
        const newHoriz = finalHoriz + "px";
        const newVert = finalVert + "px";
        bridge.setStyleProperty(ds.draggedId, ds.horizProp, newHoriz);
        bridge.setStyleProperty(ds.draggedId, ds.vertProp, newVert);
        onPositionChange(ds.draggedId, [
          { property: ds.horizProp, oldValue: oldHoriz, newValue: newHoriz },
          { property: ds.vertProp, oldValue: oldVert, newValue: newVert }
        ]);
      }
      cleanup();
    }
    function onKey(e) {
      if (e.key !== "Escape") return;
      const ds = dragState.current;
      if (!ds || !ds.committed) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      bridge.clearAbsDragTransform(ds.draggedId);
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
        bridge.clearAbsDragTransform(ds.draggedId);
      }
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("click", suppress, true);
      document.removeEventListener("mousedown", suppress, true);
      document.removeEventListener("mouseup", suppress, true);
      cleanup();
    };
  }, [selectedNodeId, isMultiSelect, bridge, getAbsInfo, onPositionChange]);
}

