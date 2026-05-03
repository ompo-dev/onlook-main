import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
    type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';

interface StudioDockPopoverProps {
    open: boolean;
    anchorRef: RefObject<HTMLElement | null>;
    onClose: () => void;
    children: ReactNode;
    width?: number;
    align?: 'start' | 'center' | 'end';
}

export function StudioDockPopover({
    open,
    anchorRef,
    onClose,
    children,
    width = 260,
    align = 'center',
}: StudioDockPopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<CSSProperties | null>(null);

    useEffect(() => {
        if (!open) {
            setStyle(null);
            return;
        }

        const updatePosition = () => {
            const anchor = anchorRef.current;
            if (!anchor) return;

            const rect = anchor.getBoundingClientRect();
            const desiredWidth = Math.min(width, window.innerWidth - 16);
            const below = window.innerHeight - rect.bottom - 8;
            const above = rect.top - 8;
            const estimatedHeight = 340;
            const openAbove = below < 220 && above > below;
            const top = openAbove
                ? Math.max(8, rect.top - Math.min(estimatedHeight, above) - 6)
                : rect.bottom + 6;
            const rawLeft =
                align === 'start'
                    ? rect.left
                    : align === 'end'
                      ? rect.right - desiredWidth
                      : rect.left + rect.width / 2 - desiredWidth / 2;
            const left = Math.max(8, Math.min(rawLeft, window.innerWidth - desiredWidth - 8));

            setStyle({
                position: 'fixed',
                top,
                left,
                width: desiredWidth,
                maxHeight: Math.max(160, Math.min(openAbove ? above : below, 420)),
            });
        };

        updatePosition();

        const handlePointerDown = (event: PointerEvent) => {
            const path = event.composedPath();
            if (
                (popoverRef.current && path.includes(popoverRef.current)) ||
                (anchorRef.current && path.includes(anchorRef.current))
            ) {
                return;
            }
            onClose();
        };

        document.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [align, anchorRef, onClose, open, width]);

    if (!open || !style || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <motion.div
            ref={popoverRef}
            data-cs-floating="popover"
            className="z-[2147483647] overflow-auto rounded-xl border border-[var(--cs-border)] bg-[var(--cs-panel-bg)] p-2 text-xs text-[var(--cs-foreground)] shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ ...style, pointerEvents: 'auto' }}
            onPointerDown={(event) => event.stopPropagation()}
        >
            {children}
        </motion.div>,
        document.body,
    );
}
