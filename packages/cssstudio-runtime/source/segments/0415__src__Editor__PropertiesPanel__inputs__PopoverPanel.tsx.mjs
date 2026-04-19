// src/Editor/PropertiesPanel/inputs/PopoverPanel.tsx
import { jsx as jsx39, jsxs as jsxs26 } from "react/jsx-runtime";
var SNAP_THRESHOLD2 = 40;
var SNAP_GAP = 8;
var EDGE_MARGIN2 = 16;
var HEADER_HEIGHT = 33;
function PopoverPanel({
  title,
  anchorRect,
  popoverHeight,
  popoverWidth = 240,
  onClose,
  children
}) {
  const popoverRef = useRef23(null);
  const dragging = useRef23(false);
  const dragOffset = useRef23({ x: 0, y: 0 });
  const hasBeenDragged = useRef23(false);
  const snapSide = useRef23("auto");
  const [isDragging2, setIsDragging] = useState13(false);
  const domPanelHeight = useStore2((s) => s.dockedClaims.bottom);
  const findPanel = useCallback23(
    () => popoverRef.current?.closest("[data-cs-panel]") ?? null,
    []
  );
  const totalHeight = popoverHeight + HEADER_HEIGHT;
  const [position, setPosition] = useState13(
    () => computePopoverPosition(anchorRect, totalHeight, popoverWidth, void 0, domPanelHeight)
  );
  useLayoutEffect2(() => {
    if (hasBeenDragged.current) return;
    const panel = findPanel();
    setPosition(
      computePopoverPosition(anchorRect, totalHeight, popoverWidth, panel, domPanelHeight)
    );
  }, [anchorRect, totalHeight, popoverWidth, findPanel, domPanelHeight]);
  useEffect24(() => {
    if (hasBeenDragged.current) return;
    const panel = findPanel();
    if (panel) {
      setPosition(
        computePopoverPosition(
          anchorRect,
          totalHeight,
          popoverWidth,
          panel,
          domPanelHeight
        )
      );
    }
  }, []);
  useEffect24(() => {
    let rafId = 0;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const panel = findPanel();
        if (snapSide.current === "auto") {
          setPosition(
            computePopoverPosition(anchorRect, totalHeight, popoverWidth, panel, domPanelHeight)
          );
        } else if (snapSide.current !== "none" && panel) {
          const panelRect = panel.getBoundingClientRect();
          setPosition((prev) => ({
            ...prev,
            left: Math.max(
              4,
              snapSide.current === "panel-left" ? panelRect.left - popoverWidth - SNAP_GAP : panelRect.right + SNAP_GAP
            )
          }));
        }
      });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafId);
    };
  }, [anchorRect, totalHeight, popoverWidth, findPanel, domPanelHeight]);
  useEffect24(() => {
    const handlePointerDown = (e) => {
      const target = e.composedPath()[0];
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      onClose();
    };
    const root = popoverRef.current?.getRootNode() ?? document;
    root.addEventListener("pointerdown", handlePointerDown);
    return () => root.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose]);
  useEffect24(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const handleDragStart = useCallback23((e) => {
    if (e.target.closest("button")) return;
    dragging.current = true;
    setIsDragging(true);
    hasBeenDragged.current = true;
    const rect = popoverRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);
  const handleDragMove = useCallback23((e) => {
    if (!dragging.current) return;
    setPosition({
      top: Math.max(0, e.clientY - dragOffset.current.y),
      left: Math.max(0, e.clientX - dragOffset.current.x)
    });
  }, []);
  const handleDragEnd = useCallback23(
    (e) => {
      if (!dragging.current) return;
      dragging.current = false;
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
      setPosition((pos) => {
        let { top, left } = pos;
        const panel = findPanel();
        let snapped = "none";
        if (panel) {
          const panelRect = panel.getBoundingClientRect();
          const popoverRight = left + popoverWidth;
          if (Math.abs(
            popoverRight + SNAP_GAP - panelRect.left
          ) < SNAP_THRESHOLD2) {
            left = panelRect.left - popoverWidth - SNAP_GAP;
            snapped = "panel-left";
          } else if (Math.abs(left - panelRect.right - SNAP_GAP) < SNAP_THRESHOLD2) {
            left = panelRect.right + SNAP_GAP;
            snapped = "panel-right";
          }
        }
        if (left < SNAP_THRESHOLD2) left = EDGE_MARGIN2;
        if (left + popoverWidth > window.innerWidth - SNAP_THRESHOLD2) {
          left = window.innerWidth - popoverWidth - EDGE_MARGIN2;
        }
        if (top < SNAP_THRESHOLD2) top = EDGE_MARGIN2;
        const maxTop = window.innerHeight - domPanelHeight - totalHeight - EDGE_MARGIN2;
        if (top > maxTop) top = maxTop;
        snapSide.current = snapped;
        return { top, left };
      });
    },
    [popoverWidth, findPanel, domPanelHeight, totalHeight]
  );
  return /* @__PURE__ */ jsxs26(
    "div",
    {
      ref: popoverRef,
      className: `${PopoverPanel_default.popover} ${isDragging2 ? PopoverPanel_default.dragging : ""}`,
      style: {
        top: position.top,
        left: position.left,
        width: popoverWidth
      },
      children: [
        /* @__PURE__ */ jsxs26(
          "div",
          {
            className: PopoverPanel_default.header,
            onPointerDown: handleDragStart,
            onPointerMove: handleDragMove,
            onPointerUp: handleDragEnd,
            children: [
              /* @__PURE__ */ jsx39("span", { className: PopoverPanel_default.title, children: title }),
              /* @__PURE__ */ jsx39(
                "button",
                {
                  className: PopoverPanel_default.closeButton,
                  onClick: onClose,
                  title: "Close (Escape)",
                  children: /* @__PURE__ */ jsx39(XIcon, {})
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx39("div", { className: PopoverPanel_default.body, children })
      ]
    }
  );
}

