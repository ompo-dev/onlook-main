import { useStore } from '../state/use-store';
import { X } from 'lucide-react';
import { usePanelPosition } from './use-panel-position';

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

    const resizeEdgeClass =
        dock === 'bottom'
            ? 'top-[-3px] left-0 h-[6px] w-full cursor-ns-resize'
            : dock === 'left'
              ? 'top-0 right-[-3px] w-[6px] h-full cursor-ew-resize'
              : 'top-0 left-[-3px] w-[6px] h-full cursor-ew-resize';

    return (
        <div
            data-cs-panel={panelId}
            data-dock={dock}
            className={`bg-[var(--cs-layer)] border border-[var(--cs-border)] rounded-[10px] flex flex-col overflow-hidden pointer-events-auto font-[Inter,system-ui,sans-serif] text-xs text-[var(--cs-foreground)] shadow-[0_4px_24px_rgba(0,0,0,0.3)] z-[4] ${isDragging ? 'opacity-90 cursor-grabbing' : ''} ${className ?? ''}`}
            style={style as React.CSSProperties}
        >
            <div className={`absolute z-10 ${resizeEdgeClass}`} onPointerDown={handleResizeStart} />
            <div
                className="flex items-center gap-0 px-1.5 py-1 pl-1 border-b border-[var(--cs-border)] cursor-grab shrink-0 select-none"
                {...(dock !== 'bottom' ? dragHandlers : {})}
            >
                {label && <span className="text-[11px] text-[var(--cs-secondary-text)] px-1 shrink-0">{label}</span>}
                <div className="flex gap-0.5 flex-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`px-2 py-1 bg-transparent border-none rounded-[5px] text-[var(--cs-secondary-text)] text-xs cursor-pointer transition-[background,color] duration-100 whitespace-nowrap hover:bg-[var(--cs-feint)] hover:text-[var(--cs-foreground)] disabled:opacity-40 disabled:cursor-not-allowed ${activeTab === tab.id ? 'text-[var(--cs-foreground)] bg-[var(--cs-feint-solid)]' : ''}`}
                            onClick={() => !tab.disabled && setPanelActiveTab(panelId, tab.id)}
                            disabled={tab.disabled}
                            title={tab.disabled ? `${tab.label} (single selection only)` : (tab.shortcut ?? tab.label)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                    {headerSlot}
                    <button
                        className="w-[22px] h-[22px] bg-transparent border-none rounded text-[var(--cs-icon-muted)] cursor-pointer flex items-center justify-center p-0 transition-[background,color] duration-100 hover:bg-[var(--cs-feint)] hover:text-[var(--cs-foreground)]"
                        onClick={onClose}
                        title="Close"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {children}
            </div>
        </div>
    );
}

export const panelStyles = {
    headerButton: 'w-[22px] h-[22px] bg-transparent border-none rounded text-[var(--cs-icon-muted)] cursor-pointer flex items-center justify-center p-0 transition-[background,color] duration-100 hover:bg-[var(--cs-feint)] hover:text-[var(--cs-foreground)]',
};
