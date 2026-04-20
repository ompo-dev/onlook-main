import styles from './Toolbar.module.css';

interface IconButtonProps {
    active?: boolean;
    muted?: boolean;
    mode?: 'primary';
    disabled?: boolean;
    onClick?: () => void;
    title?: string;
    children: React.ReactNode;
}

export function IconButton({ active, muted, mode, disabled, onClick, title, children }: IconButtonProps) {
    return (
        <button
            className={`${styles.toolbarButton} ${active ? styles.active : ''} ${mode === 'primary' ? styles.primary : ''} ${muted ? styles.muted : ''}`}
            onClick={onClick}
            disabled={disabled}
            title={title}
        >
            {children}
        </button>
    );
}
