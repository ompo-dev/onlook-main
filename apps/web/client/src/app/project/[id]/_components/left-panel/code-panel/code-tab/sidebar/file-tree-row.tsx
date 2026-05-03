import type { FileEntry } from '@onlook/file-system/hooks';
import { cn } from '@onlook/ui/utils';
import type { RowRendererProps } from 'react-arborist';

export const FileTreeRow = ({ attrs, children, isHighlighted }: RowRendererProps<FileEntry> & { isHighlighted: boolean }) => {
    return (
        <div
            {...attrs}
            className={cn(
                'h-7 min-w-0 w-auto cursor-pointer rounded-lg outline-none',
                attrs['aria-selected'] ? [
                    'bg-[color:color-mix(in_srgb,var(--cs-accent)_18%,transparent)] text-[var(--cs-foreground)]',
                ] : [
                    isHighlighted && 'bg-[var(--cs-layer-hover)] text-[var(--cs-foreground)]',
                ],
                isHighlighted ?
                    'bg-[var(--cs-layer-hover)] text-[var(--cs-foreground)]' :
                    'text-[var(--cs-icon-muted)] hover:bg-[var(--cs-layer-hover)] hover:text-[var(--cs-foreground)]'
            )}
        >
            {children}
        </div>
    );
};
