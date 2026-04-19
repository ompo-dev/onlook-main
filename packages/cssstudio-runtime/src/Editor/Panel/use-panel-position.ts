import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/use-store';

const STORAGE_PREFIX = 'cssstudio-panel-';
const SNAP_THRESHOLD = 40;
const EDGE_MARGIN = 16;
const TOOLBAR_FALLBACK = 56;
const TOOLBAR_GAP = 4;

function getToolbarBottom() {
    const el = document.querySelector('[data-cs-toolbar]');
    if (!el) return TOOLBAR_FALLBACK;
    return el.getBoundingClientRect().bottom + TOOLBAR_GAP;
}

function getStorageKey(panelId: string) {
    return STORAGE_PREFIX + panelId + '-' + location.hostname;
}

interface PanelPrefs {
    dock: string;
    size: number;
    activeTab: string;
    position?: { top: number; right: number; anchor: 'left' | 'right'; height?: number };
}

function loadPrefs(panelId: string): PanelPrefs | null {
    try {
        const raw = localStorage.getItem(getStorageKey(panelId));
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
}

function savePrefs(panelId: string, prefs: PanelPrefs) {
    try { localStorage.setItem(getStorageKey(panelId), JSON.stringify(prefs)); } catch { /* ignore */ }
}

interface Position {
    top: number;
    right: number;
    anchor: 'left' | 'right';
    height?: number;
}

function getDefaultPosition(panelId: string, dock: string): Position {
    const top = getToolbarBottom();
    if (dock === 'left') return { top, right: document.documentElement.clientWidth - 300 - EDGE_MARGIN, anchor: 'left' };
    return { top, right: EDGE_MARGIN, anchor: 'right' };
}

function snapToEdges(pos: Position, panelWidth: number): Position & { anchor: 'left' | 'right' } {
    let { top, right } = pos;
    const vw = document.documentElement.clientWidth;
    const left = vw - right - panelWidth;
    if (left < right) {
        right = left < SNAP_THRESHOLD ? vw - panelWidth - EDGE_MARGIN : right;
    } else {
        right = right < SNAP_THRESHOLD ? EDGE_MARGIN : right;
    }
    if (top < SNAP_THRESHOLD) top = EDGE_MARGIN;
    const finalLeft = vw - right - panelWidth;
    const anchor = finalLeft <= right ? 'left' : 'right';
    return { top, right, anchor, height: pos.height };
}

export function usePanelPosition(panelId: string) {
    const panel = useStore((s) => (s.panels as Record<string, { dock: string; size: number; activeTab: string; open: boolean }>)[panelId]);
    const claims = useStore((s) => s.dockedClaims);
    const setPanelDock = useStore((s) => s.setPanelDock);
    const setPanelSize = useStore((s) => s.setPanelSize);
    const setPanelActiveTab = useStore((s) => s.setPanelActiveTab);
    const [position, setPosition] = useState<Position>(() => getDefaultPosition(panelId, panel.dock));
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const prefs = loadPrefs(panelId);
        if (prefs) {
            setPanelDock(panelId, prefs.dock);
            setPanelSize(panelId, prefs.size);
            setPanelActiveTab(panelId, prefs.activeTab);
            if (prefs.position) setPosition(prefs.position);
        }
    }, [panelId, setPanelDock, setPanelSize, setPanelActiveTab]);

    useEffect(() => {
        const toolbarBottom = getToolbarBottom();
        setPosition((prev) => prev.top < toolbarBottom ? { ...prev, top: toolbarBottom } : prev);
    }, []);

    const [viewport, setViewport] = useState(() => ({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }));

    useEffect(() => {
        let rafId = 0;
        const handleResize = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                setViewport({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight });
            });
        };
        window.addEventListener('resize', handleResize);
        return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(rafId); };
    }, []);

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevPrefsRef = useRef('');

    useEffect(() => {
        const key = `${panel.dock}:${panel.size}:${panel.activeTab}:${position.top}:${position.right}:${position.height ?? ''}`;
        if (!prevPrefsRef.current || prevPrefsRef.current === key) { prevPrefsRef.current = key; return; }
        prevPrefsRef.current = key;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            savePrefs(panelId, { dock: panel.dock, size: panel.size, activeTab: panel.activeTab, position });
        }, 300);
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [panelId, panel.dock, panel.size, panel.activeTab, position]);

    const style = useMemo(() => {
        const { dock, size } = panel;
        if (dock === 'bottom') {
            const gap = 8;
            return { position: 'fixed' as const, bottom: EDGE_MARGIN, left: EDGE_MARGIN, right: claims.right > 0 ? EDGE_MARGIN + claims.right + gap : EDGE_MARGIN, height: size };
        }
        if (position.height) {
            const left = viewport.width - position.right - size;
            return { position: 'fixed' as const, top: position.top, ...(position.anchor === 'left' ? { left: Math.max(EDGE_MARGIN, left) } : { right: position.right }), height: position.height, width: size };
        }
        const bottom = claims.bottom > 0 ? claims.bottom + EDGE_MARGIN * 2 : EDGE_MARGIN;
        const MIN_PANEL_HEIGHT = 200;
        const maxTop = viewport.height - bottom - MIN_PANEL_HEIGHT;
        const top = Math.min(position.top, Math.max(getToolbarBottom(), maxTop));
        if (position.anchor === 'left') {
            const left = viewport.width - position.right - size;
            return { position: 'fixed' as const, top, left: Math.max(EDGE_MARGIN, left), bottom, width: size };
        }
        return { position: 'fixed' as const, top, right: position.right, bottom, width: size };
    }, [panel, claims, position, viewport]);

    const handleDragStart = useCallback((e: React.PointerEvent) => {
        if ((e.target as Element).closest('button')) return;
        dragging.current = true;
        setIsDragging(true);
        const el = (e.currentTarget as Element).closest('[data-cs-panel]');
        if (!el) return;
        const rect = el.getBoundingClientRect();
        dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        e.currentTarget.setPointerCapture(e.pointerId);
    }, []);

    const handleDragMove = useCallback((e: React.PointerEvent) => {
        if (!dragging.current) return;
        if (panel.dock === 'bottom') return;
        const newTop = Math.max(0, e.clientY - dragOffset.current.y);
        const panelWidth = panel.size;
        const newRight = Math.max(0, document.documentElement.clientWidth - e.clientX - (panelWidth - dragOffset.current.x));
        setPosition((prev) => ({ top: newTop, right: newRight, anchor: prev.anchor, height: prev.height }));
    }, [panel.dock, panel.size]);

    const handleDragEnd = useCallback((e: React.PointerEvent) => {
        if (!dragging.current) return;
        dragging.current = false;
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (panel.dock === 'bottom') return;
        setPosition((pos) => {
            const snapped = snapToEdges(pos, panel.size);
            const newDock = snapped.anchor === 'left' ? 'left' : 'right';
            if (newDock !== panel.dock) setPanelDock(panelId, newDock);
            return snapped;
        });
    }, [panel.dock, panel.size, panelId, setPanelDock]);

    const handleResizeStart = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        const startX = e.clientX;
        const startY = e.clientY;
        const startSize = panel.size;
        const dock = panel.dock;
        const onMove = (ev: PointerEvent) => {
            let newSize: number;
            if (dock === 'bottom') {
                newSize = Math.max(120, Math.min(window.innerHeight - 100, startSize + (startY - ev.clientY)));
            } else if (dock === 'left') {
                newSize = Math.max(200, Math.min(window.innerWidth * 0.5, startSize + (ev.clientX - startX)));
            } else {
                newSize = Math.max(200, Math.min(window.innerWidth * 0.5, startSize + (startX - ev.clientX)));
            }
            setPanelSize(panelId, newSize);
        };
        const onUp = () => { setIsResizing(false); document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    }, [panel.size, panel.dock, panelId, setPanelSize]);

    return {
        style,
        isDragging,
        isResizing,
        dragHandlers: { onPointerDown: handleDragStart, onPointerMove: handleDragMove, onPointerUp: handleDragEnd },
        handleResizeStart,
    };
}
