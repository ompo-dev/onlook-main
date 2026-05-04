'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ResponsiveFrame, type ResponsiveFrameHandle } from './ResponsiveFrame';
import styles from './ResponsiveView.module.css';
import { ViewportToolbar } from './ViewportToolbar';
import { useStore } from '../state/use-store';
import type { ResponsiveBridgeProxy } from '../state/responsive-bridge-proxy';

const TOOLBAR_TOP = 16;
const TOOLBAR_HEIGHT = 38;
const IFRAME_TOP = TOOLBAR_TOP + TOOLBAR_HEIGHT + TOOLBAR_TOP;
const MIN_VIEWPORT = 120;

export function ResponsiveView({
    onFrameBridgeReady,
    onFrameElementPick,
    onFrameContextMenu,
    onFrameElementDraw,
    onClose,
}: {
    onFrameBridgeReady: (frameIndex: number, proxy: ResponsiveBridgeProxy) => void;
    onFrameElementPick: (frameIndex: number, id: number, selector?: string, additive?: boolean) => void;
    onFrameContextMenu?: (frameIndex: number, id: number, x: number, y: number) => void;
    onFrameElementDraw?: (
        frameIndex: number,
        parentId: number,
        rect: { x: number; y: number; w: number; h: number },
        beforeId: number | null,
    ) => void;
    onClose?: () => void;
}) {
    const viewport = useStore((s: any) => s.responsiveViewport);
    const setResponsiveTransform = useStore((s: any) => s.setResponsiveTransform);
    const setResponsiveViewport = useStore((s: any) => s.setResponsiveViewport);
    const savedTransform = useStore((s: any) => s.responsiveTransform);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const worldRef = useRef<HTMLDivElement | null>(null);
    const frameOverlayRef = useRef<HTMLDivElement | null>(null);
    const frameHandleRef = useRef<ResponsiveFrameHandle | null>(null);
    const transformRef = useRef({ x: 0, y: 0, scale: 1 });
    const pendingContextMenuRef = useRef<{ x: number; y: number } | null>(null);
    const prevViewportRef = useRef<{ width: number; height: number } | null>(null);
    const [ready, setReady] = useState(false);

    const applyTransform = useCallback(
        (transform: { x: number; y: number; scale: number }) => {
            transformRef.current = transform;
            if (worldRef.current) {
                worldRef.current.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
            }
            if (frameOverlayRef.current) {
                frameOverlayRef.current.style.transform = `translate(${transform.x}px, ${transform.y}px)`;
                frameOverlayRef.current.style.width = `${viewport.width * transform.scale}px`;
                frameOverlayRef.current.style.height = `${viewport.height * transform.scale}px`;
            }
            setResponsiveTransform(transform);
        },
        [setResponsiveTransform, viewport.height, viewport.width],
    );

    const fitViewport = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const scale = 1;
        const x = (rect.width - viewport.width * scale) / 2;
        const y = IFRAME_TOP;
        applyTransform({ x, y, scale });
    }, [applyTransform, viewport.width]);

    useEffect(() => {
        requestAnimationFrame(() => {
            if (savedTransform) {
                applyTransform(savedTransform);
            } else {
                fitViewport();
            }
            prevViewportRef.current = { ...viewport };
            setReady(true);
        });
    }, [applyTransform, fitViewport, savedTransform, viewport]);

    useEffect(() => {
        const prev = prevViewportRef.current;
        prevViewportRef.current = { ...viewport };
        if (!prev) return;
        if (prev.width === viewport.width && prev.height === viewport.height) return;
        const transform = transformRef.current;
        const dx = ((prev.width - viewport.width) * transform.scale) / 2;
        applyTransform({ x: transform.x + dx, y: transform.y, scale: transform.scale });
    }, [applyTransform, viewport]);

    const handleBridgeReady = useCallback(
        (proxy: ResponsiveBridgeProxy) => {
            onFrameBridgeReady(0, proxy);
        },
        [onFrameBridgeReady],
    );

    const handleElementPick = useCallback(
        (id: number, selector?: string, additive?: boolean) => {
            const pending = pendingContextMenuRef.current;
            if (pending) {
                pendingContextMenuRef.current = null;
                onFrameContextMenu?.(0, id, pending.x, pending.y);
                return;
            }
            onFrameElementPick(0, id, selector, additive);
        },
        [onFrameContextMenu, onFrameElementPick],
    );

    const handleFrameContextMenu = useCallback((x: number, y: number) => {
        pendingContextMenuRef.current = { x, y };
    }, []);

    const handleElementDraw = useCallback(
        (parentId: number, rect: { x: number; y: number; w: number; h: number }, beforeId: number | null) => {
            onFrameElementDraw?.(0, parentId, rect, beforeId);
        },
        [onFrameElementDraw],
    );

    const handleResize = useCallback(
        (nextViewport: { width: number; height: number }) => {
            setResponsiveViewport(nextViewport);
        },
        [setResponsiveViewport],
    );

    const handleGripPointerDown = useCallback(
        (axis: 'x' | 'y') => (event: React.PointerEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();
            const target = event.currentTarget;
            try {
                target.setPointerCapture(event.pointerId);
            } catch {}
            target.dataset.dragging = '1';

            const startX = event.clientX;
            const startY = event.clientY;
            const { width: startWidth, height: startHeight } = viewport;
            const scale = transformRef.current.scale || 1;
            const factor = 2 / Math.max(scale, 0.01);

            function onMove(moveEvent: PointerEvent) {
                if (axis === 'x') {
                    const dx = (moveEvent.clientX - startX) * factor;
                    const width = Math.max(MIN_VIEWPORT, Math.round(startWidth + dx));
                    setResponsiveViewport({ width, height: startHeight });
                } else {
                    const dy = (moveEvent.clientY - startY) * factor;
                    const height = Math.max(MIN_VIEWPORT, Math.round(startHeight + dy));
                    setResponsiveViewport({ width: startWidth, height });
                }
            }

            function onUp(upEvent: PointerEvent) {
                try {
                    target.releasePointerCapture(upEvent.pointerId);
                } catch {}
                delete target.dataset.dragging;
                target.removeEventListener('pointermove', onMove);
                target.removeEventListener('pointerup', onUp);
                target.removeEventListener('lostpointercapture', onUp);
            }

            target.addEventListener('pointermove', onMove);
            target.addEventListener('pointerup', onUp);
            target.addEventListener('lostpointercapture', onUp);
        },
        [setResponsiveViewport, viewport],
    );

    return (
        <div
            ref={containerRef}
            className={styles.responsiveContainer}
            style={{ opacity: ready ? 1 : 0 }}
        >
            <div ref={worldRef} className={styles.responsiveWorld}>
                <ResponsiveFrame
                    ref={(handle) => {
                        frameHandleRef.current = handle;
                    }}
                    width={viewport.width}
                    height={viewport.height}
                    onBridgeReady={handleBridgeReady}
                    onElementPick={handleElementPick}
                    onContextMenu={handleFrameContextMenu}
                    onElementDraw={handleElementDraw}
                />
            </div>

            <div ref={frameOverlayRef} className={styles.frameControlsOverlay}>
                <div
                    data-cs-resize-grip="right"
                    className={`${styles.resizeGripHitArea} ${styles.resizeGripHitAreaRight}`}
                    onPointerDown={handleGripPointerDown('x')}
                    title="Resize width"
                >
                    <div className={`${styles.resizeGrip} ${styles.resizeGripRight}`} />
                </div>
                <div
                    data-cs-resize-grip="bottom"
                    className={`${styles.resizeGripHitArea} ${styles.resizeGripHitAreaBottom}`}
                    onPointerDown={handleGripPointerDown('y')}
                    title="Resize height"
                >
                    <div className={`${styles.resizeGrip} ${styles.resizeGripBottom}`} />
                </div>
            </div>

            <ViewportToolbar viewport={viewport} onChange={handleResize} onClose={onClose} />
        </div>
    );
}
