import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { forwardRef } from 'react';

interface FileTreeSearchProps {
    searchQuery: string;
    isLoading: boolean;
    onSearchChange: (query: string) => void;
    onRefresh?: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}

export const FileTreeSearch = forwardRef<HTMLInputElement, FileTreeSearchProps>(({
    searchQuery,
    isLoading,
    onSearchChange,
    onRefresh,
    onKeyDown
}, ref) => {

    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
        }
    };

    const clearSearch = () => {
        onSearchChange('');
        if (ref && typeof ref === 'object' && ref.current) {
            ref.current.focus();
        }
    };

    return (
        <div className="relative mb-2 flex h-12 flex-shrink-0 flex-row items-center justify-between border-b border-[var(--cs-border)] px-2">
            <Input
                ref={ref}
                className="h-8 rounded-xl border-[var(--cs-border)] bg-[var(--cs-layer)] pr-8 text-xs text-[var(--cs-foreground)] placeholder:text-[var(--cs-icon-muted)] focus-visible:ring-1 focus-visible:ring-[var(--cs-accent)] focus-visible:ring-offset-0"
                placeholder="Search files"
                value={searchQuery}
                disabled={isLoading}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={onKeyDown}
            />
            {searchQuery && (
                <button
                    className="group absolute bottom-2 right-2 top-2 flex aspect-square items-center justify-center rounded-r-[calc(theme(borderRadius.xl)-1px)] hover:bg-[var(--cs-layer-hover)]"
                    onClick={clearSearch}
                >
                    <Icons.CrossS className="h-3 w-3 text-[var(--cs-icon-muted)] group-hover:text-[var(--cs-foreground)]" />
                </button>
            )}
        </div>
    );
});
