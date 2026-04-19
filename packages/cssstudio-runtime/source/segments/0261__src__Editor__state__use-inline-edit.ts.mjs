// src/Editor/state/use-inline-edit.ts
import { useEffect as useEffect4, useRef as useRef2 } from "react";
function useInlineEdit(onEditComplete, onElementSelected) {
  const isPickingElement = useStore2((s) => s.isPickingElement);
  const isMultiSelect = useStore2((s) => s.selectedNodeIds.length > 1);
  const callbacksRef = useRef2({ onEditComplete, onElementSelected });
  callbacksRef.current = { onEditComplete, onElementSelected };
  useEffect4(() => {
    if (isPickingElement || isMultiSelect) {
      stopInlineEdit();
      return;
    }
    startInlineEdit({
      onSelect: (id3) => {
        callbacksRef.current.onElementSelected(id3);
      },
      onResult: (result) => {
        if (result.oldText !== result.newText) {
          callbacksRef.current.onEditComplete(result.id, result.oldText, result.newText);
        }
      }
    });
    return () => {
      stopInlineEdit();
    };
  }, [isPickingElement, isMultiSelect]);
}

