import { useCallback, useEffect } from 'react';
import { useStore } from './use-store';
import { startPicker, stopPicker } from './dom-bridge';

export function useElementPicker(
    onElementPicked: (id: number) => void,
    onMarqueePicked?: (ids: number[]) => void,
) {
    const { isPickingElement, setPickingElement } = useStore();

    const togglePicker = useCallback(() => {
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
                onMarqueePicked
                    ? (ids) => {
                          setPickingElement(false);
                          onMarqueePicked(ids);
                      }
                    : undefined,
            );
        }
    }, [isPickingElement, setPickingElement, onElementPicked, onMarqueePicked]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.code === 'KeyC' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                togglePicker();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [togglePicker]);

    useEffect(() => {
        if (!isPickingElement) stopPicker();
    }, [isPickingElement]);

    return { isPickingElement, togglePicker };
}
