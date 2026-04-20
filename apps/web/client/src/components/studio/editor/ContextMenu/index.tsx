import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

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
            return <div key={`sep-${i}`} className="my-1 h-px bg-[var(--cs-border)]" />;
        }
        const menuItem = item as ContextMenuItem;
        return (
            <button
                type="button"
                key={menuItem.label}
                className={`flex w-full items-center justify-between gap-4 rounded-md px-2 py-1.5 text-left text-[11px] transition ${
                    menuItem.danger
                        ? 'text-[var(--cs-red)] hover:bg-[color-mix(in_srgb,var(--cs-red)_10%,transparent)]'
                        : 'text-[var(--cs-foreground)] hover:bg-[var(--cs-feint)]'
                }`}
                onClick={() => { menuItem.onClick(); onClose(); }}
            >
                <span>{menuItem.label}</span>
                {menuItem.shortcut && (
                    <span className="shrink-0 font-mono text-[10px] text-[var(--cs-secondary-text)]">
                        {menuItem.shortcut}
                    </span>
                )}
            </button>
        );
    });

    const menuProps = {
        ref: menuRef,
        className:
            'fixed z-[210] min-w-[180px] overflow-hidden rounded-lg border border-[var(--cs-border)] bg-[var(--cs-layer)] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.4)]',
        style: { left: x, top: y },
    };

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
            <div className="fixed inset-0 z-[209]" onMouseDown={onClose} />
            {menu}
        </>
    );
}
