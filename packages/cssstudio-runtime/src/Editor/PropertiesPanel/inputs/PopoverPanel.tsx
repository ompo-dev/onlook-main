import { useState, useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useStore } from '../../state/use-store';
import { XIcon } from '../../icons/XIcon';
import { computePopoverPosition } from './popover-utils';
import styles from './PopoverPanel.module.css';

const SNAP_THRESHOLD = 40;
const SNAP_GAP = 8;
const EDGE_MARGIN = 16;
const HEADER_HEIGHT = 33;

interface PopoverPanelProps {
  title: string;
  anchorRect: DOMRect;
  popoverHeight: number;
  popoverWidth?: number;
  onClose: () => void;
  children?: ReactNode;
}

export function PopoverPanel({
  title,
  anchorRect,
  popoverHeight,
  popoverWidth = 240,
  onClose,
  children,
}: PopoverPanelProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const hasBeenDragged = useRef(false);
  const snapSide = useRef<string>('auto');
  const [isDragging, setIsDragging] = useState(false);

  const domPanelHeight = useStore((s) => s.dockedClaims.bottom);

  const findPanel = useCallback(
    () => popoverRef.current?.closest('[data-cs-panel]') ?? null,
    [],
  );

  const totalHeight = popoverHeight + HEADER_HEIGHT;

  const [position, setPosition] = useState(
    () => computePopoverPosition(anchorRect, totalHeight, popoverWidth, undefined, domPanelHeight),
  );

  useLayoutEffect(() => {
    if (hasBeenDragged.current) return;
    const panel = findPanel();
    setPosition(computePopoverPosition(anchorRect, totalHeight, popoverWidth, panel, domPanelHeight));
  }, [anchorRect, totalHeight, popoverWidth, findPanel, domPanelHeight]);

  useEffect(() => {
    if (hasBeenDragged.current) return;
    const panel = findPanel();
    if (panel) {
      setPosition(computePopoverPosition(anchorRect, totalHeight, popoverWidth, panel, domPanelHeight));
    }
  }, []);

  useEffect(() => {
    let rafId = 0;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const panel = findPanel();
        if (snapSide.current === 'auto') {
          setPosition(computePopoverPosition(anchorRect, totalHeight, popoverWidth, panel, domPanelHeight));
        } else if (snapSide.current !== 'none' && panel) {
          const panelRect = panel.getBoundingClientRect();
          setPosition((prev) => ({
            ...prev,
            left: Math.max(
              4,
              snapSide.current === 'panel-left'
                ? panelRect.left - popoverWidth - SNAP_GAP
                : panelRect.right + SNAP_GAP,
            ),
          }));
        }
      });
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(rafId); };
  }, [anchorRect, totalHeight, popoverWidth, findPanel, domPanelHeight]);

  useEffect(() => {
    const handlePointerDown = (e: Event) => {
      const target = (e as PointerEvent).composedPath()[0] as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target as Node)) return;
      onClose();
    };
    const root = (popoverRef.current?.getRootNode() ?? document) as Document | ShadowRoot;
    root.addEventListener('pointerdown', handlePointerDown);
    return () => root.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging.current = true;
    setIsDragging(true);
    hasBeenDragged.current = true;
    const rect = popoverRef.current!.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    setPosition({
      top: Math.max(0, e.clientY - dragOffset.current.y),
      left: Math.max(0, e.clientX - dragOffset.current.x),
    });
  }, []);

  const handleDragEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      setIsDragging(false);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      setPosition((pos) => {
        let { top, left } = pos;
        const panel = findPanel();
        let snapped = 'none';
        if (panel) {
          const panelRect = panel.getBoundingClientRect();
          const popoverRight = left + popoverWidth;
          if (Math.abs(popoverRight + SNAP_GAP - panelRect.left) < SNAP_THRESHOLD) {
            left = panelRect.left - popoverWidth - SNAP_GAP;
            snapped = 'panel-left';
          } else if (Math.abs(left - panelRect.right - SNAP_GAP) < SNAP_THRESHOLD) {
            left = panelRect.right + SNAP_GAP;
            snapped = 'panel-right';
          }
        }
        if (left < SNAP_THRESHOLD) left = EDGE_MARGIN;
        if (left + popoverWidth > window.innerWidth - SNAP_THRESHOLD) left = window.innerWidth - popoverWidth - EDGE_MARGIN;
        if (top < SNAP_THRESHOLD) top = EDGE_MARGIN;
        const maxTop = window.innerHeight - domPanelHeight - totalHeight - EDGE_MARGIN;
        if (top > maxTop) top = maxTop;
        snapSide.current = snapped;
        return { top, left };
      });
    },
    [popoverWidth, findPanel, domPanelHeight, totalHeight],
  );

  return (
    <div
      ref={popoverRef}
      className={`${styles.popover} ${isDragging ? styles.dragging : ''}`}
      style={{ top: position.top, left: position.left, width: popoverWidth }}
    >
      <div
        className={styles.header}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      >
        <span className={styles.title}>{title}</span>
        <button className={styles.closeButton} onClick={onClose} title="Close (Escape)">
          <XIcon />
        </button>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
