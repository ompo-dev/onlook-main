// src/Editor/state/use-element-draw.ts
import { useCallback as useCallback3, useEffect as useEffect3 } from "react";
function useElementDraw(onElementDrawn) {
  const { isDrawingElement, setDrawingElement } = useStore2();
  const toggleDraw = useCallback3(() => {
    if (isDrawingElement) {
      stopDrawMode();
      setDrawingElement(false);
    } else {
      setDrawingElement(true);
      startDrawMode((parentId, rect) => {
        setDrawingElement(false);
        onElementDrawn(parentId, rect);
      });
    }
  }, [isDrawingElement, setDrawingElement, onElementDrawn]);
  useEffect3(() => {
    const onKeyDown = (e) => {
      if (e.altKey && e.code === "KeyF" && !e.metaKey && !e.ctrlKey) {
        let el = document.activeElement;
        while (el?.shadowRoot?.activeElement) {
          el = el.shadowRoot.activeElement;
        }
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el?.isContentEditable) return;
        e.preventDefault();
        toggleDraw();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleDraw]);
  useEffect3(() => {
    if (!isDrawingElement) stopDrawMode();
  }, [isDrawingElement]);
  return { isDrawingElement, toggleDraw };
}

