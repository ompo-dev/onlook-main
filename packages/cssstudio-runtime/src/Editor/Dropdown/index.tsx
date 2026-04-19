import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import styles from './Dropdown.module.css';

interface DropdownProps {
    open: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
    children: React.ReactNode;
    width?: number;
}

export function Dropdown({ open, onClose, anchorRef, children, width }: DropdownProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            const target = e.composedPath()[0] as Element;
            if (target && ref.current && !ref.current.contains(target) && anchorRef.current && !anchorRef.current.contains(target)) {
                onClose();
            }
        }
        const root = ref.current?.getRootNode();
        if (root && root !== document) (root as ShadowRoot).addEventListener('mousedown', handleClick);
        document.addEventListener('mousedown', handleClick);
        return () => {
            if (root && root !== document) (root as ShadowRoot).removeEventListener('mousedown', handleClick);
            document.removeEventListener('mousedown', handleClick);
        };
    }, [open, onClose, anchorRef]);

    return (
        <motion.div
            ref={ref}
            className={styles.dropdown}
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(2px)' }}
            animate={open ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 0.9, filter: 'blur(2px)' }}
            style={{ transformOrigin: 'top right', pointerEvents: open ? 'auto' : 'none', width }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
        >
            {children}
        </motion.div>
    );
}
