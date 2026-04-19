import { useStore } from '../state/use-store';
import { XIcon } from '../icons/XIcon';
import { usePanelPosition } from './use-panel-position';
import styles from './Panel.module.css';

interface TabDef {
    id: string;
    label: string;
    disabled?: boolean;
    shortcut?: string;
}

interface PanelProps {
    panelId: string;
    tabs: TabDef[];
    onClose: () => void;
    headerSlot?: React.ReactNode;
    label?: string;
    children: React.ReactNode;
    className?: string;
}

export function Panel({ panelId, tabs, onClose, headerSlot, label, children, className }: PanelProps) {
    const panel = useStore((s) => (s.panels as Record<string, { dock: string; size: number; activeTab: string; open: boolean }>)[panelId]);
    const setPanelActiveTab = useStore((s) => s.setPanelActiveTab);
    const { style, isDragging, dragHandlers, handleResizeStart } = usePanelPosition(panelId);
    const { dock, activeTab } = panel;
    const resizeEdgeClass = dock === 'bottom' ? styles.resizeEdgeTop : dock === 'left' ? styles.resizeEdgeRight : styles.resizeEdgeLeft;

    return (
        <div
            data-cs-panel={panelId}
            data-dock={dock}
            className={`${styles.panel} ${isDragging ? styles.dragging : ''} ${className ?? ''}`}
            style={style as React.CSSProperties}
        >
            <div className={`${styles.resizeEdge} ${resizeEdgeClass}`} onPointerDown={handleResizeStart} />
            <div className={styles.header} {...(dock !== 'bottom' ? dragHandlers : {})}>
                {label && <span className={styles.label}>{label}</span>}
                <div className={styles.tabBar}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                            onClick={() => !tab.disabled && setPanelActiveTab(panelId, tab.id)}
                            disabled={tab.disabled}
                            title={tab.disabled ? `${tab.label} (single selection only)` : (tab.shortcut ?? tab.label)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className={styles.headerRight}>
                    {headerSlot}
                    <button className={styles.headerButton} onClick={onClose} title="Close">
                        <XIcon />
                    </button>
                </div>
            </div>
            <div className={styles.content}>
                {children}
            </div>
        </div>
    );
}

export { styles as panelStyles };
