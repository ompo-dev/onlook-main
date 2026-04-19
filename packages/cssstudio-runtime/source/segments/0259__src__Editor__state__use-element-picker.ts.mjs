// src/Editor/state/use-element-picker.ts
import { useCallback as useCallback2, useEffect as useEffect2 } from "react";
function useElementPicker(onElementPicked, onMarqueePicked) {
  const { isPickingElement, setPickingElement } = useStore2();
  const togglePicker = useCallback2(() => {
    if (isPickingElement) {
      stopPicker();
      setPickingElement(false);
    } else {
      setPickingElement(true);
      startPicker(
        (pickedId) => {
          setPickingElement(false);
          onElementPicked(pickedId);
        },
        onMarqueePicked ? (ids) => {
          setPickingElement(false);
          onMarqueePicked(ids);
        } : void 0
      );
    }
  }, [isPickingElement, setPickingElement, onElementPicked, onMarqueePicked]);
  useEffect2(() => {
    const onKeyDown = (e) => {
      if (e.altKey && e.code === "KeyC" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        togglePicker();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [togglePicker]);
  useEffect2(() => {
    if (!isPickingElement) stopPicker();
  }, [isPickingElement]);
  return { isPickingElement, togglePicker };
}

