import { useEffect, useRef } from 'react';
import { useStore } from './use-store';
import { startInlineEdit, stopInlineEdit } from './dom-bridge';

export function useInlineEdit(
    onEditComplete: (id: number, oldText: string, newText: string) => void,
    onElementSelected: (id: number) => void,
) {
    const isPickingElement = useStore((s) => s.isPickingElement);
    const isMultiSelect = useStore((s) => s.selectedNodeIds.length > 1);
    const callbacksRef = useRef({ onEditComplete, onElementSelected });
    callbacksRef.current = { onEditComplete, onElementSelected };

    useEffect(() => {
        if (isPickingElement || isMultiSelect) {
            stopInlineEdit();
            return;
        }
        startInlineEdit({
            onSelect: (id) => {
                callbacksRef.current.onElementSelected(id);
            },
            onResult: (result) => {
                if (result.oldText !== result.newText) {
                    callbacksRef.current.onEditComplete(result.id, result.oldText, result.newText);
                }
            },
        });
        return () => {
            stopInlineEdit();
        };
    }, [isPickingElement, isMultiSelect]);
}
