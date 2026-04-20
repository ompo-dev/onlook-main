import { useEffect, useState, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';

interface DropdownProps {
    open: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
    children: React.ReactNode;
    width?: number;
}

export function Dropdown({ open, onClose, anchorRef, children, width }: DropdownProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<CSSProperties | null>(null);

    useEffect(() => {
        if (!open) return;
        const updatePosition = () => {
            const anchor = anchorRef.current;
            if (!anchor) return;
            const rect = anchor.getBoundingClientRect();
            const desiredWidth = width ?? Math.max(rect.width, 220);
            const belowSpace = window.innerHeight - rect.bottom - 8;
            const aboveSpace = rect.top - 8;
            const estimatedHeight = 240;
            const openAbove = belowSpace < estimatedHeight && aboveSpace > belowSpace;
            const top = openAbove
                ? Math.max(8, rect.top - Math.min(estimatedHeight, aboveSpace) - 4)
                : rect.bottom + 4;
            const left = Math.max(8, Math.min(rect.right - desiredWidth, window.innerWidth - desiredWidth - 8));
            setStyle({
                position: 'fixed',
                top,
                left,
                width: desiredWidth,
            });
        };

        updatePosition();

        function handleClick(event: Event) {
            const target = event.composedPath()[0] as Element | undefined;
            if (
                target &&
                ref.current &&
                !ref.current.contains(target) &&
                anchorRef.current &&
                !anchorRef.current.contains(target)
            ) {
                if (target.closest('[data-cs-floating]')) {
                    return;
                }
                onClose();
            }
        }
        document.addEventListener('pointerdown', handleClick);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            document.removeEventListener('pointerdown', handleClick);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [open, onClose, anchorRef, width]);

    if (!style || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <motion.div
            ref={ref}
            data-cs-floating="dropdown"
            className="z-[10000] overflow-hidden rounded-lg border border-[var(--cs-border)] bg-[var(--cs-layer)] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(2px)' }}
            animate={open ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 0.9, filter: 'blur(2px)' }}
            onPointerDown={(event) => event.stopPropagation()}
            style={{ ...style, transformOrigin: 'top right', pointerEvents: open ? 'auto' : 'none' }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
        >
            {children}
        </motion.div>,
        document.body,
    );
}
