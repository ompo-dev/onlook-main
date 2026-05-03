import { useCallback, useEffect } from 'react';
import { useStudioRuntime } from '@/components/studio/runtime';
import { useStore } from './use-store';
import { startPicker, stopPicker } from './dom-bridge';

export function useElementPicker(
    onElementPicked: (id: number) => void,
    onMarqueePicked?: (ids: number[]) => void,
) {
    const { mode } = useStudioRuntime();
    const { isPickingElement, setPickingElement } = useStore();
    const useCanvasPicker = mode === 'native';

    const togglePicker = useCallback(() => {
        if (isPickingElement) {
            if (!useCanvasPicker) {
                stopPicker();
            }
            setPickingElement(false);
        } else {
            setPickingElement(true);
            if (!useCanvasPicker) {
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
        }
    }, [isPickingElement, setPickingElement, onElementPicked, onMarqueePicked, useCanvasPicker]);

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
        if (!isPickingElement && !useCanvasPicker) stopPicker();
    }, [isPickingElement, useCanvasPicker]);

    return { isPickingElement, togglePicker };
}
