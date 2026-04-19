import { useCallback, useEffect } from 'react';
import { useStore } from './use-store';
import { startDrawMode, stopDrawMode } from './dom-bridge';

export function useElementDraw(
    onElementDrawn: (parentId: number, rect: { x: number; y: number; w: number; h: number }) => void,
) {
    const { isDrawingElement, setDrawingElement } = useStore();

    const toggleDraw = useCallback(() => {
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

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.code === 'KeyF' && !e.metaKey && !e.ctrlKey) {
                let el: Element | null = document.activeElement;
                while ((el as any)?.shadowRoot?.activeElement) {
                    el = (el as any).shadowRoot.activeElement;
                }
                if (
                    el instanceof HTMLInputElement ||
                    el instanceof HTMLTextAreaElement ||
                    (el as HTMLElement)?.isContentEditable
                ) return;
                e.preventDefault();
                toggleDraw();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [toggleDraw]);

    useEffect(() => {
        if (!isDrawingElement) stopDrawMode();
    }, [isDrawingElement]);

    return { isDrawingElement, toggleDraw };
}
