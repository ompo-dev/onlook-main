'use client';

import { animate } from 'motion';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

const SNAP_THRESHOLD = 40;
const EDGE_PADDING = 16;
const RUBBER_BAND_STIFFNESS = 0.55;
const TRAY_WIDTH = 380;
const RAIL_WIDTH = 220;
const RAIL_SPRING = { type: 'spring', visualDuration: 0.35, bounce: 0 } as const;
const DEFAULT_OFFSET = { tx: 0, ty: 0 };

function storageKey() {
    const host = typeof window !== 'undefined' ? window.location.hostname || 'default' : 'default';
    return `cssstudio-chat-tray-position-${host}`;
}

function loadOffset() {
    if (typeof window === 'undefined') {
        return DEFAULT_OFFSET;
    }
    try {
        const raw = window.localStorage.getItem(storageKey());
        if (!raw) return DEFAULT_OFFSET;
        const parsed = JSON.parse(raw);
        if (typeof parsed?.tx === 'number' && typeof parsed?.ty === 'number') {
            return { tx: parsed.tx, ty: parsed.ty };
        }
    } catch {}
    return DEFAULT_OFFSET;
}

function saveOffset(offset: { tx: number; ty: number }) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(storageKey(), JSON.stringify(offset));
    } catch {}
}

function computeBounds(trayRect: DOMRect | null, railComp: number) {
    if (typeof window === 'undefined' || !trayRect) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const halfWidth = trayRect.width / 2;
    const height = trayRect.height;
    return {
        minTx: -(vw / 2 - halfWidth - EDGE_PADDING) - railComp,
        maxTx: vw / 2 - halfWidth - EDGE_PADDING - railComp,
        minTy: -(vh - height - EDGE_PADDING - EDGE_PADDING),
        maxTy: 0,
    };
}

function clampOffset(offset: { tx: number; ty: number }, bounds: ReturnType<typeof computeBounds>) {
    if (!bounds) return offset;
    return {
        tx: Math.min(Math.max(offset.tx, bounds.minTx), bounds.maxTx),
        ty: Math.min(Math.max(offset.ty, bounds.minTy), bounds.maxTy),
    };
}

function rubberBand(overshoot: number, dimension: number) {
    if (overshoot === 0 || dimension === 0) return 0;
    const abs = Math.abs(overshoot);
    const eased =
        (abs * dimension * RUBBER_BAND_STIFFNESS) / (dimension + RUBBER_BAND_STIFFNESS * abs);
    return Math.sign(overshoot) * eased;
}

function applyRubberBand(raw: { tx: number; ty: number }, bounds: ReturnType<typeof computeBounds>) {
    if (typeof window === 'undefined' || !bounds) return raw;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let tx = raw.tx;
    if (tx < bounds.minTx) tx = bounds.minTx - rubberBand(bounds.minTx - tx, vw);
    else if (tx > bounds.maxTx) tx = bounds.maxTx + rubberBand(tx - bounds.maxTx, vw);

    let ty = raw.ty;
    if (ty < bounds.minTy) ty = bounds.minTy - rubberBand(bounds.minTy - ty, vh);
    else if (ty > bounds.maxTy) ty = bounds.maxTy + rubberBand(ty - bounds.maxTy, vh);

    return { tx, ty };
}

export function useTrayPosition(hasRail: boolean) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const offsetRef = useRef(loadOffset());
    const dragStateRef = useRef<{ startX: number; startY: number; baseTx: number; baseTy: number } | null>(
        null,
    );
    const springRef = useRef<{ tx: { cancel(): void } | null; ty: { cancel(): void } | null }>({
        tx: null,
        ty: null,
    });
    const railCompRef = useRef(0);
    const railCompAnimRef = useRef<{ cancel(): void } | null>(null);
    const anchorRatioRef = useRef(0.5);
    const prevHasRailRef = useRef<boolean | null>(null);

    const writeStyleVars = useCallback((nextOffset: { tx: number; ty: number }) => {
        const el = containerRef.current;
        if (!el) return;
        el.style.setProperty('--cs-tray-tx', `${nextOffset.tx + railCompRef.current}px`);
        el.style.setProperty('--cs-tray-ty', `${nextOffset.ty}px`);
    }, []);

    const cancelSprings = useCallback(() => {
        springRef.current.tx?.cancel();
        springRef.current.ty?.cancel();
        springRef.current = { tx: null, ty: null };
    }, []);

    useLayoutEffect(() => {
        writeStyleVars(offsetRef.current);
    }, [writeStyleVars]);

    useEffect(() => {
        const handleResize = () => {
            const bounds = computeBounds(
                containerRef.current?.getBoundingClientRect() ?? null,
                railCompRef.current,
            );
            const clamped = clampOffset(offsetRef.current, bounds);
            if (clamped.tx !== offsetRef.current.tx || clamped.ty !== offsetRef.current.ty) {
                offsetRef.current = clamped;
                writeStyleVars(clamped);
                saveOffset(clamped);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [writeStyleVars]);

    useLayoutEffect(() => {
        const previous = prevHasRailRef.current;
        prevHasRailRef.current = hasRail;
        if (typeof window === 'undefined') return;

        let anchor: number;
        if (hasRail) {
            const vw = window.innerWidth;
            const trayBound = Math.max(1, vw / 2 - TRAY_WIDTH / 2 - EDGE_PADDING);
            const tx = offsetRef.current.tx;
            const normalized = Math.min(Math.max(tx / (2 * trayBound), -0.5), 0.5);
            anchor = 0.5 + normalized;
            anchorRatioRef.current = anchor;
        } else {
            anchor = anchorRatioRef.current;
        }

        const target = hasRail ? (0.5 - anchor) * RAIL_WIDTH : 0;
        railCompAnimRef.current?.cancel();
        if (previous === null) {
            railCompRef.current = target;
            writeStyleVars(offsetRef.current);
            return;
        }
        if (previous === hasRail) return;

        railCompAnimRef.current = animate(railCompRef.current, target, {
            ...RAIL_SPRING,
            onUpdate: (value) => {
                railCompRef.current = value;
                writeStyleVars(offsetRef.current);
            },
            onComplete: () => {
                railCompRef.current = target;
                writeStyleVars(offsetRef.current);
            },
        });
    }, [hasRail, writeStyleVars]);

    const onPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (event.button !== 0) return;
            event.preventDefault();
            cancelSprings();

            const target = event.currentTarget;
            try {
                target.setPointerCapture(event.pointerId);
            } catch {}

            dragStateRef.current = {
                startX: event.clientX,
                startY: event.clientY,
                baseTx: offsetRef.current.tx,
                baseTy: offsetRef.current.ty,
            };

            const handleMove = (moveEvent: PointerEvent) => {
                const drag = dragStateRef.current;
                if (!drag) return;
                const dx = moveEvent.clientX - drag.startX;
                const dy = moveEvent.clientY - drag.startY;
                const raw = { tx: drag.baseTx + dx, ty: drag.baseTy + dy };
                const bounds = computeBounds(
                    containerRef.current?.getBoundingClientRect() ?? null,
                    railCompRef.current,
                );
                const eased = applyRubberBand(raw, bounds);
                offsetRef.current = eased;
                writeStyleVars(eased);
            };

            const handleUp = (upEvent: PointerEvent) => {
                if (target.hasPointerCapture(upEvent.pointerId)) {
                    try {
                        target.releasePointerCapture(upEvent.pointerId);
                    } catch {}
                }
                target.removeEventListener('pointermove', handleMove);
                target.removeEventListener('pointerup', handleUp);
                target.removeEventListener('pointercancel', handleUp);
                dragStateRef.current = null;

                const current = offsetRef.current;
                const bounds = computeBounds(
                    containerRef.current?.getBoundingClientRect() ?? null,
                    railCompRef.current,
                );
                const clamped = clampOffset(current, bounds);
                const snapped = Math.abs(clamped.tx) <= SNAP_THRESHOLD ? { tx: 0, ty: clamped.ty } : clamped;
                const needsTx = Math.abs(current.tx - snapped.tx) > 0.5;
                const needsTy = Math.abs(current.ty - snapped.ty) > 0.5;

                if (!needsTx && !needsTy) {
                    offsetRef.current = snapped;
                    writeStyleVars(snapped);
                    saveOffset(snapped);
                    return;
                }

                const springOptions = { type: 'spring', stiffness: 420, damping: 32, mass: 0.6 };
                let pending = (needsTx ? 1 : 0) + (needsTy ? 1 : 0);
                const onAxisDone = () => {
                    pending -= 1;
                    if (pending === 0) {
                        offsetRef.current = snapped;
                        writeStyleVars(snapped);
                        saveOffset(snapped);
                    }
                };

                if (needsTx) {
                    springRef.current.tx = animate(current.tx, snapped.tx, {
                        ...springOptions,
                        onUpdate: (value) => {
                            offsetRef.current = { ...offsetRef.current, tx: value };
                            writeStyleVars(offsetRef.current);
                        },
                        onComplete: onAxisDone,
                    });
                } else {
                    offsetRef.current = { ...offsetRef.current, tx: snapped.tx };
                }

                if (needsTy) {
                    springRef.current.ty = animate(current.ty, snapped.ty, {
                        ...springOptions,
                        onUpdate: (value) => {
                            offsetRef.current = { ...offsetRef.current, ty: value };
                            writeStyleVars(offsetRef.current);
                        },
                        onComplete: onAxisDone,
                    });
                } else {
                    offsetRef.current = { ...offsetRef.current, ty: snapped.ty };
                }
            };

            target.addEventListener('pointermove', handleMove);
            target.addEventListener('pointerup', handleUp);
            target.addEventListener('pointercancel', handleUp);
        },
        [cancelSprings, writeStyleVars],
    );

    return {
        containerRef,
        dragHandlers: { onPointerDown },
    };
}
