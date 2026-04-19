// src/Editor/state/use-tree-drag.ts
import { useCallback as useCallback7, useRef as useRef8, useState } from "react";
var PROTECTED_TAGS = /* @__PURE__ */ new Set(["html", "body", "head"]);
var SCROLL_ZONE = 30;
var SCROLL_SPEED = 4;
function useTreeDrag({ containerRef, onReorder, showPageLine, hidePageLine }) {
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const dragRef = useRef8(null);
  const getRows = useCallback7(() => {
    const container = containerRef.current;
    if (!container) return [];
    const nodes = container.querySelectorAll("[data-node-id]");
    return Array.from(nodes).map((el) => ({
      el,
      nodeId: Number(el.dataset.nodeId),
      depth: Number(el.dataset.depth),
      tag: el.dataset.tag ?? ""
    }));
  }, [containerRef]);
  const computeDropTarget = useCallback7(
    (clientY, draggedId) => {
      const container = containerRef.current;
      if (!container) return null;
      const rows = getRows();
      if (rows.length === 0) return null;
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop;
      const y = clientY - containerRect.top + scrollTop;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.nodeId === draggedId) continue;
        const rowTop = row.el.offsetTop;
        const rowHeight = row.el.offsetHeight;
        const rowBottom = rowTop + rowHeight;
        if (y < rowTop || y > rowBottom) continue;
        if (PROTECTED_TAGS.has(row.tag)) continue;
        const fraction = (y - rowTop) / rowHeight;
        const indent = row.depth * 16 + 6;
        if (fraction < 0.33) {
          let parentEl;
          for (let j = i - 1; j >= 0; j--) {
            if (rows[j].depth === row.depth - 1 && rows[j].nodeId !== draggedId) {
              parentEl = rows[j];
              break;
            }
          }
          if (!parentEl) continue;
          return {
            parentId: parentEl.nodeId,
            beforeId: row.nodeId,
            indicatorTop: rowTop,
            indicatorLeft: indent,
            indicatorWidth: container.clientWidth - indent - 8
          };
        } else if (fraction > 0.67) {
          const nextRow = rows.find(
            (r, ri) => ri > i && r.depth === row.depth && r.nodeId !== draggedId
          );
          let parentEl;
          for (let j = i - 1; j >= 0; j--) {
            if (rows[j].depth === row.depth - 1 && rows[j].nodeId !== draggedId) {
              parentEl = rows[j];
              break;
            }
          }
          if (!parentEl) continue;
          return {
            parentId: parentEl.nodeId,
            beforeId: nextRow?.nodeId ?? null,
            indicatorTop: rowBottom,
            indicatorLeft: indent,
            indicatorWidth: container.clientWidth - indent - 8
          };
        } else {
          const childIndent = (row.depth + 1) * 16 + 6;
          return {
            parentId: row.nodeId,
            beforeId: null,
            indicatorTop: rowBottom,
            indicatorLeft: childIndent,
            indicatorWidth: container.clientWidth - childIndent - 8
          };
        }
      }
      return null;
    },
    [containerRef, getRows]
  );
  const startDrag2 = useCallback7(
    (nodeId, e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget;
      const tag = target.closest("[data-node-id]")?.dataset.tag ?? "";
      if (PROTECTED_TAGS.has(tag)) return;
      setDraggedNodeId(nodeId);
      dragRef.current = { nodeId, parentId: null, scrollRaf: 0 };
      const onMove = (ev) => {
        const dt = computeDropTarget(ev.clientY, nodeId);
        setDropTarget(dt);
        if (dt) {
          showPageLine?.(dt.beforeId, dt.parentId);
        } else {
          hidePageLine?.();
        }
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const relY = ev.clientY - rect.top;
          if (dragRef.current) {
            cancelAnimationFrame(dragRef.current.scrollRaf);
            if (relY < SCROLL_ZONE) {
              const tick2 = () => {
                container.scrollTop -= SCROLL_SPEED;
                if (dragRef.current) dragRef.current.scrollRaf = requestAnimationFrame(tick2);
              };
              dragRef.current.scrollRaf = requestAnimationFrame(tick2);
            } else if (relY > rect.height - SCROLL_ZONE) {
              const tick2 = () => {
                container.scrollTop += SCROLL_SPEED;
                if (dragRef.current) dragRef.current.scrollRaf = requestAnimationFrame(tick2);
              };
              dragRef.current.scrollRaf = requestAnimationFrame(tick2);
            }
          }
        }
      };
      const onUp = () => {
        hidePageLine?.();
        setDropTarget((current3) => {
          if (current3 && current3.parentId !== nodeId) {
            onReorder(nodeId, current3.parentId, current3.beforeId);
          }
          return null;
        });
        cleanup();
        setDraggedNodeId(null);
      };
      const onKeyDown = (ev) => {
        if (ev.key === "Escape") {
          hidePageLine?.();
          cleanup();
          setDropTarget(null);
          setDraggedNodeId(null);
        }
      };
      const cleanup = () => {
        if (dragRef.current) {
          cancelAnimationFrame(dragRef.current.scrollRaf);
        }
        dragRef.current = null;
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("keydown", onKeyDown);
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("keydown", onKeyDown);
    },
    [computeDropTarget, containerRef, onReorder]
  );
  return { draggedNodeId, dropTarget, startDrag: startDrag2 };
}

