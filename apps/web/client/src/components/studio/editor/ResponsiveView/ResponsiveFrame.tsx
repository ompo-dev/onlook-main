'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { mapPointToIframe } from '../utils/iframe-coords';
import { ResponsiveBridgeProxy } from '../state/responsive-bridge-proxy';
import { useStore } from '../state/use-store';
import styles from './ResponsiveView.module.css';

export interface ResponsiveFrameHandle {
    proxy: ResponsiveBridgeProxy | null;
    iframe: HTMLIFrameElement | null;
    element: HTMLDivElement | null;
}

export const ResponsiveFrame = forwardRef<
    ResponsiveFrameHandle,
    {
        width: number;
        height: number;
        onElementPick: (id: number, selector?: string, additive?: boolean) => void;
        onBridgeReady: (proxy: ResponsiveBridgeProxy) => void;
        onContextMenu?: (x: number, y: number) => void;
        onHoverRect?: (rect: any) => void;
        onElementDraw?: (
            parentId: number,
            rect: { x: number; y: number; w: number; h: number },
            beforeId: number | null,
        ) => void;
    }
>(function ResponsiveFrame(
    { width, height, onElementPick, onBridgeReady, onContextMenu, onHoverRect, onElementDraw },
    ref,
) {
    const isPickingElement = useStore((s: any) => !!s.isPickingElement);
    const isDrawingElement = useStore((s: any) => !!s.isDrawingElement);
    const isToolActive = isPickingElement || isDrawingElement;

    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const drawRectRef = useRef<HTMLDivElement | null>(null);
    const drawParentRef = useRef<HTMLDivElement | null>(null);
    const drawLineRef = useRef<HTMLDivElement | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const proxyRef = useRef<ResponsiveBridgeProxy | null>(null);
    const lastClickAdditiveRef = useRef(false);
    const onElementPickRef = useRef(onElementPick);
    const onBridgeReadyRef = useRef(onBridgeReady);
    const onContextMenuRef = useRef(onContextMenu);
    const onHoverRectRef = useRef(onHoverRect);
    const onElementDrawRef = useRef(onElementDraw);

    onElementPickRef.current = onElementPick;
    onBridgeReadyRef.current = onBridgeReady;
    onContextMenuRef.current = onContextMenu;
    onHoverRectRef.current = onHoverRect;
    onElementDrawRef.current = onElementDraw;

    useImperativeHandle(ref, () => ({
        get proxy() {
            return proxyRef.current;
        },
        get iframe() {
            return iframeRef.current;
        },
        get element() {
            return wrapperRef.current;
        },
    }));

    const handleBridgeReady = useCallback((proxy: ResponsiveBridgeProxy) => {
        proxyRef.current = proxy;
        onBridgeReadyRef.current(proxy);
    }, []);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) {
            return;
        }
        const proxy = new ResponsiveBridgeProxy(iframe);
        proxyRef.current = proxy;
        proxy.onHoverResult((_id, rect) => {
            onHoverRectRef.current?.(rect);
        });
        proxy.onPick((id, selector) => {
            const additive = lastClickAdditiveRef.current;
            lastClickAdditiveRef.current = false;
            onElementPickRef.current(id, selector, additive);
        });
        void proxy.readyPromise.then(() => {
            handleBridgeReady(proxy);
        });
        proxy.ping();

        return () => {
            proxyRef.current = null;
            proxy.destroy();
        };
    }, [handleBridgeReady]);

    useEffect(() => {
        if (!isToolActive || isDrawingElement) {
            return;
        }
        const overlay = overlayRef.current;
        const iframe = iframeRef.current;
        if (!overlay || !iframe) {
            return;
        }

        function toIframeCoords(clientX: number, clientY: number) {
            return mapPointToIframe(iframe, clientX, clientY, width);
        }

        function handleMouseMove(event: MouseEvent) {
            const proxy = proxyRef.current;
            if (!proxy) return;
            const { x, y } = toIframeCoords(event.clientX, event.clientY);
            proxy.hitTestHover(x, y);
        }

        function handleClick(event: MouseEvent) {
            const proxy = proxyRef.current;
            if (!proxy) return;
            lastClickAdditiveRef.current = event.shiftKey || event.metaKey || event.ctrlKey;
            const { x, y } = toIframeCoords(event.clientX, event.clientY);
            proxy.hitTestPick(x, y);
        }

        function handleMouseLeave() {
            const proxy = proxyRef.current;
            if (proxy) proxy.highlightElement(null);
            onHoverRectRef.current?.(null);
        }

        function handleContextMenu(event: MouseEvent) {
            event.preventDefault();
            const proxy = proxyRef.current;
            if (!proxy) return;
            const { x, y } = toIframeCoords(event.clientX, event.clientY);
            proxy.hitTestPick(x, y);
            onContextMenuRef.current?.(event.clientX, event.clientY);
        }

        overlay.addEventListener('mousemove', handleMouseMove);
        overlay.addEventListener('click', handleClick);
        overlay.addEventListener('mouseleave', handleMouseLeave);
        overlay.addEventListener('contextmenu', handleContextMenu);
        return () => {
            overlay.removeEventListener('mousemove', handleMouseMove);
            overlay.removeEventListener('click', handleClick);
            overlay.removeEventListener('mouseleave', handleMouseLeave);
            overlay.removeEventListener('contextmenu', handleContextMenu);
            onHoverRectRef.current?.(null);
        };
    }, [isDrawingElement, isToolActive, width]);

    useEffect(() => {
        if (!isDrawingElement) {
            return;
        }
        const overlay = overlayRef.current;
        const iframe = iframeRef.current;
        const drawEl = drawRectRef.current;
        const parentEl = drawParentRef.current;
        const lineEl = drawLineRef.current;
        if (!overlay || !iframe || !drawEl || !parentEl || !lineEl) {
            return;
        }

        function toIframeCoords(clientX: number, clientY: number) {
            return mapPointToIframe(iframe, clientX, clientY, width);
        }

        let startX = 0;
        let startY = 0;
        let dragging = false;
        let latestParentId: number | null = null;
        let latestBeforeId: number | null = null;
        let pendingHit = false;

        function setRect(x: number, y: number, w: number, h: number) {
            drawEl.style.left = `${x}px`;
            drawEl.style.top = `${y}px`;
            drawEl.style.width = `${w}px`;
            drawEl.style.height = `${h}px`;
        }

        function onPointerDown(event: PointerEvent) {
            if (event.button !== 0) return;
            event.preventDefault();
            const point = toIframeCoords(event.clientX, event.clientY);
            startX = point.x;
            startY = point.y;
            dragging = true;
            drawEl.style.display = 'block';
            setRect(startX, startY, 0, 0);
            parentEl.style.display = 'none';
            lineEl.style.display = 'none';
            try {
                overlay.setPointerCapture(event.pointerId);
            } catch {}
        }

        function onPointerMove(event: PointerEvent) {
            if (!dragging) return;
            event.preventDefault();
            const point = toIframeCoords(event.clientX, event.clientY);
            const x = Math.min(startX, point.x);
            const y = Math.min(startY, point.y);
            const w = Math.abs(point.x - startX);
            const h = Math.abs(point.y - startY);
            setRect(x, y, w, h);

            if ((w > 2 || h > 2) && !pendingHit) {
                pendingHit = true;
                const proxy = proxyRef.current;
                if (!proxy) {
                    pendingHit = false;
                    return;
                }
                void proxy
                    .hitTestDrawParent({ x, y, w, h })
                    .then((result) => {
                        pendingHit = false;
                        if (!dragging) return;
                        latestParentId = result.id;
                        latestBeforeId = result.beforeId;
                        parentEl.style.display = 'block';
                        parentEl.style.left = `${result.rect.x}px`;
                        parentEl.style.top = `${result.rect.y}px`;
                        parentEl.style.width = `${result.rect.width}px`;
                        parentEl.style.height = `${result.rect.height}px`;
                        if (result.lineRect) {
                            lineEl.style.display = 'block';
                            lineEl.style.left = `${result.lineRect.x}px`;
                            lineEl.style.top = `${result.lineRect.y}px`;
                            lineEl.style.width = `${result.lineRect.w}px`;
                            lineEl.style.height = `${result.lineRect.h}px`;
                        } else {
                            lineEl.style.display = 'none';
                        }
                    })
                    .catch(() => {
                        pendingHit = false;
                    });
            }
        }

        function onPointerUp(event: PointerEvent) {
            if (!dragging) return;
            event.preventDefault();
            dragging = false;
            try {
                overlay.releasePointerCapture(event.pointerId);
            } catch {}

            const point = toIframeCoords(event.clientX, event.clientY);
            const x = Math.min(startX, point.x);
            const y = Math.min(startY, point.y);
            const w = Math.abs(point.x - startX);
            const h = Math.abs(point.y - startY);
            drawEl.style.display = 'none';
            parentEl.style.display = 'none';
            lineEl.style.display = 'none';
            if (w < 5 && h < 5) return;

            const rect = { x, y, w: Math.round(w), h: Math.round(h) };
            const finalize = (parentId: number, beforeId: number | null) => {
                onElementDrawRef.current?.(parentId, rect, beforeId);
            };

            if (latestParentId !== null) {
                finalize(latestParentId, latestBeforeId);
                return;
            }

            const proxy = proxyRef.current;
            if (!proxy) {
                return;
            }
            void proxy.hitTestDrawParent(rect).then((result) => finalize(result.id, result.beforeId));
        }

        overlay.addEventListener('pointerdown', onPointerDown);
        overlay.addEventListener('pointermove', onPointerMove);
        overlay.addEventListener('pointerup', onPointerUp);
        overlay.addEventListener('pointercancel', onPointerUp);
        return () => {
            overlay.removeEventListener('pointerdown', onPointerDown);
            overlay.removeEventListener('pointermove', onPointerMove);
            overlay.removeEventListener('pointerup', onPointerUp);
            overlay.removeEventListener('pointercancel', onPointerUp);
            drawEl.style.display = 'none';
            parentEl.style.display = 'none';
            lineEl.style.display = 'none';
        };
    }, [isDrawingElement, width]);

    const src = (() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('__css_studio_responsive');
        url.searchParams.set('__css_studio_responsive', '1');
        return url.toString();
    })();

    return (
        <div ref={wrapperRef} className={styles.frame} style={{ width, height }}>
            <div className={styles.frameCard}>
                <iframe
                    ref={iframeRef}
                    name="css-studio-responsive-frame"
                    src={src}
                    className={styles.frameIframe}
                    style={{
                        width,
                        height,
                        pointerEvents: isToolActive ? 'none' : 'auto',
                    }}
                    scrolling="auto"
                />
                <div
                    ref={overlayRef}
                    className={styles.frameOverlay}
                    style={{ pointerEvents: isToolActive ? 'auto' : 'none' }}
                >
                    <div
                        ref={drawParentRef}
                        style={{
                            position: 'absolute',
                            display: 'none',
                            pointerEvents: 'none',
                            border: '2px solid rgba(111,168,220,0.5)',
                            borderRadius: 2,
                            boxSizing: 'border-box',
                        }}
                    />
                    <div
                        ref={drawRectRef}
                        style={{
                            position: 'absolute',
                            display: 'none',
                            pointerEvents: 'none',
                            background: 'rgba(111,168,220,0.15)',
                            border: '2px solid rgba(111,168,220,0.7)',
                            borderRadius: 2,
                            boxSizing: 'border-box',
                        }}
                    />
                    <div
                        ref={drawLineRef}
                        style={{
                            position: 'absolute',
                            display: 'none',
                            pointerEvents: 'none',
                            background: 'rgba(111,168,220,0.7)',
                            borderRadius: 1,
                        }}
                    />
                </div>
            </div>
        </div>
    );
});
