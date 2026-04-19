import { useCallback, useRef, useState } from 'react';

const PROTECTED_TAGS = new Set(['html', 'body', 'head']);
const SCROLL_ZONE = 30;
const SCROLL_SPEED = 4;

interface DropTarget {
    parentId: number;
    beforeId: number | null;
    indicatorTop: number;
    indicatorLeft: number;
    indicatorWidth: number;
}

interface DragRef {
    nodeId: number;
    parentId: number | null;
    scrollRaf: number;
}

export function useTreeDrag({
    containerRef,
    onReorder,
    showPageLine,
    hidePageLine,
}: {
    containerRef: React.RefObject<HTMLElement>;
    onReorder: (nodeId: number, parentId: number, beforeId: number | null) => void;
    showPageLine?: (beforeId: number | null, parentId: number) => void;
    hidePageLine?: () => void;
}) {
    const [draggedNodeId, setDraggedNodeId] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const dragRef = useRef<DragRef | null>(null);

    const getRows = useCallback(() => {
        const container = containerRef.current;
        if (!container) return [];
        const nodes = container.querySelectorAll('[data-node-id]');
        return Array.from(nodes).map((el) => ({
            el,
            nodeId: Number((el as HTMLElement).dataset.nodeId),
            depth: Number((el as HTMLElement).dataset.depth),
            tag: (el as HTMLElement).dataset.tag ?? '',
        }));
    }, [containerRef]);

    const computeDropTarget = useCallback(
        (clientY: number, draggedId: number): DropTarget | null => {
            const container = containerRef.current;
            if (!container) return null;
            const rows = getRows();
            if (rows.length === 0) return null;
            const containerRect = container.getBoundingClientRect();
            const scrollTop = container.scrollTop;
            const y = clientY - containerRect.top + scrollTop;
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (row.nodeId === draggedId) continue;
                const rowEl = row.el as HTMLElement;
                const rowTop = rowEl.offsetTop;
                const rowHeight = rowEl.offsetHeight;
                const rowBottom = rowTop + rowHeight;
                if (y < rowTop || y > rowBottom) continue;
                if (PROTECTED_TAGS.has(row.tag)) continue;
                const fraction = (y - rowTop) / rowHeight;
                const indent = row.depth * 16 + 6;
                if (fraction < 0.33) {
                    let parentEl: (typeof rows)[0] | undefined;
                    for (let j = i - 1; j >= 0; j--) {
                        if (rows[j].depth === row.depth - 1 && rows[j].nodeId !== draggedId) {
                            parentEl = rows[j];
                            break;
                        }
                    }
                    if (!parentEl) continue;
                    return {
                        parentId: parentEl.nodeId,
                        beforeId: row.nodeId,
                        indicatorTop: rowTop,
                        indicatorLeft: indent,
                        indicatorWidth: container.clientWidth - indent - 8,
                    };
                } else if (fraction > 0.67) {
                    const nextRow = rows.find(
                        (r, ri) => ri > i && r.depth === row.depth && r.nodeId !== draggedId,
                    );
                    let parentEl: (typeof rows)[0] | undefined;
                    for (let j = i - 1; j >= 0; j--) {
                        if (rows[j].depth === row.depth - 1 && rows[j].nodeId !== draggedId) {
                            parentEl = rows[j];
                            break;
                        }
                    }
                    if (!parentEl) continue;
                    return {
                        parentId: parentEl.nodeId,
                        beforeId: nextRow?.nodeId ?? null,
                        indicatorTop: rowBottom,
                        indicatorLeft: indent,
                        indicatorWidth: container.clientWidth - indent - 8,
                    };
                } else {
                    const childIndent = (row.depth + 1) * 16 + 6;
                    return {
                        parentId: row.nodeId,
                        beforeId: null,
                        indicatorTop: rowBottom,
                        indicatorLeft: childIndent,
                        indicatorWidth: container.clientWidth - childIndent - 8,
                    };
                }
            }
            return null;
        },
        [containerRef, getRows],
    );

    const startDrag = useCallback(
        (nodeId: number, e: React.PointerEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const target = e.currentTarget as HTMLElement;
            const tag = target.closest('[data-node-id]')
                ? (target.closest('[data-node-id]') as HTMLElement).dataset.tag ?? ''
                : '';
            if (PROTECTED_TAGS.has(tag)) return;
            setDraggedNodeId(nodeId);
            dragRef.current = { nodeId, parentId: null, scrollRaf: 0 };

            const onMove = (ev: PointerEvent) => {
                const dt = computeDropTarget(ev.clientY, nodeId);
                setDropTarget(dt);
                if (dt) { showPageLine?.(dt.beforeId, dt.parentId); }
                else { hidePageLine?.(); }
                const container = containerRef.current;
                if (container) {
                    const rect = container.getBoundingClientRect();
                    const relY = ev.clientY - rect.top;
                    if (dragRef.current) {
                        cancelAnimationFrame(dragRef.current.scrollRaf);
                        if (relY < SCROLL_ZONE) {
                            const tick = () => {
                                container.scrollTop -= SCROLL_SPEED;
                                if (dragRef.current) dragRef.current.scrollRaf = requestAnimationFrame(tick);
                            };
                            dragRef.current.scrollRaf = requestAnimationFrame(tick);
                        } else if (relY > rect.height - SCROLL_ZONE) {
                            const tick = () => {
                                container.scrollTop += SCROLL_SPEED;
                                if (dragRef.current) dragRef.current.scrollRaf = requestAnimationFrame(tick);
                            };
                            dragRef.current.scrollRaf = requestAnimationFrame(tick);
                        }
                    }
                }
            };

            const onUp = () => {
                hidePageLine?.();
                setDropTarget((current) => {
                    if (current && current.parentId !== nodeId) {
                        onReorder(nodeId, current.parentId, current.beforeId);
                    }
                    return null;
                });
                cleanup();
                setDraggedNodeId(null);
            };

            const onKeyDown = (ev: KeyboardEvent) => {
                if (ev.key === 'Escape') {
                    hidePageLine?.();
                    cleanup();
                    setDropTarget(null);
                    setDraggedNodeId(null);
                }
            };

            const cleanup = () => {
                if (dragRef.current) { cancelAnimationFrame(dragRef.current.scrollRaf); }
                dragRef.current = null;
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('keydown', onKeyDown);
            };

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
            document.addEventListener('keydown', onKeyDown);
        },
        [computeDropTarget, containerRef, onReorder],
    );

    return { draggedNodeId, dropTarget, startDrag };
}
