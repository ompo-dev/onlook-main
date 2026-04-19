import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import styles from './ContextMenu.module.css';

interface ContextMenuItem {
    label: string;
    onClick: () => void;
    danger?: boolean;
    shortcut?: string;
}

interface SeparatorItem {
    separator: true;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: (ContextMenuItem | SeparatorItem)[];
    onClose: () => void;
    animate?: boolean;
    transformOrigin?: string;
}

export function ContextMenu({ x, y, items, onClose, animate = false, transformOrigin = 'top left' }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const positionRef = useRef({ x, y });
    positionRef.current = { x, y };

    useEffect(() => {
        const el = menuRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 4;
        const maxY = window.innerHeight - rect.height - 4;
        if (positionRef.current.x > maxX) el.style.left = `${maxX}px`;
        if (positionRef.current.y > maxY) el.style.top = `${maxY}px`;
    }, []);

    const content = items.map((item, i) => {
        if ('separator' in item && item.separator) {
            return <div key={`sep-${i}`} className={styles.separator} />;
        }
        const menuItem = item as ContextMenuItem;
        return (
            <button
                key={menuItem.label}
                className={`${styles.item} ${menuItem.danger ? styles.danger : ''}`}
                onClick={() => { menuItem.onClick(); onClose(); }}
            >
                <span>{menuItem.label}</span>
                {menuItem.shortcut && <span className={styles.shortcut}>{menuItem.shortcut}</span>}
            </button>
        );
    });

    const menuProps = { ref: menuRef, className: styles.menu, style: { left: x, top: y } };

    const menu = animate ? (
        <motion.div
            {...menuProps}
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(2px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ ...menuProps.style, transformOrigin }}
        >
            {content}
        </motion.div>
    ) : (
        <div {...menuProps}>{content}</div>
    );

    return (
        <>
            <div className={styles.backdrop} onMouseDown={onClose} />
            {menu}
        </>
    );
}
