import { useMemo } from 'react';
import { X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { DivSelected } from '@/app/project/[id]/_components/editor-bar/div-selected';
import { TextSelected } from '@/app/project/[id]/_components/editor-bar/text-selected';
import { DropdownManagerProvider } from '@/app/project/[id]/_components/editor-bar/hooks/use-dropdown-manager';
import { useStore } from '../state/use-store';
import { findNodeInTree } from '../utils/find-node';
import { StudioDockButton } from './StudioDockButton';
import { StudioDockSeparator, StudioDockShell } from './StudioDockShell';

const TEXT_TAGS = new Set([
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'span',
    'a',
    'strong',
    'b',
    'em',
    'i',
    'mark',
    'code',
    'small',
    'blockquote',
    'pre',
    'time',
    'sub',
    'sup',
    'del',
    'ins',
    'u',
    'abbr',
    'cite',
    'q',
]);

interface StudioElementDockProps {
    onClearSelection: () => void;
}

export function StudioElementDock({ onClearSelection }: StudioElementDockProps) {
    const { selectedNodeId, selectedNodeIds, domTree } = useStore(
        useShallow((state) => ({
            selectedNodeId: state.selectedNodeId,
            selectedNodeIds: state.selectedNodeIds,
            domTree: state.domTree,
        })),
    );

    const selectedTag = useMemo(() => {
        if (selectedNodeId === null) return '';
        return findNodeInTree(domTree, selectedNodeId)?.localName?.toLowerCase() ?? '';
    }, [domTree, selectedNodeId]);

    if (selectedNodeId === null) {
        return null;
    }

    return (
        <div className="fixed left-1/2 top-[74px] z-[9998] -translate-x-1/2">
            <DropdownManagerProvider>
                <StudioDockShell className="max-w-[calc(100vw-120px)] overflow-visible">
                    <div className="flex min-w-0 items-center gap-2 px-1">
                        <span className="max-w-36 truncate font-mono text-[11px] text-[var(--cs-accent)]">
                            {selectedNodeIds.length > 1
                                ? `${selectedNodeIds.length} elements`
                                : selectedTag
                                  ? `<${selectedTag}>`
                                  : 'element'}
                        </span>
                    </div>
                    <StudioDockSeparator />
                    <div className="min-w-0 overflow-hidden">
                        {TEXT_TAGS.has(selectedTag) ? (
                            <TextSelected availableWidth={860} />
                        ) : (
                            <DivSelected availableWidth={860} />
                        )}
                    </div>
                    <StudioDockSeparator />
                    <StudioDockButton onClick={onClearSelection} title="Clear selection">
                        <X size={14} />
                    </StudioDockButton>
                </StudioDockShell>
            </DropdownManagerProvider>
        </div>
    );
}
