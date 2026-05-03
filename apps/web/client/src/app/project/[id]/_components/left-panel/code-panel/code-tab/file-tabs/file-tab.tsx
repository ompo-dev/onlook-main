'use client';

import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { useEffect, useState } from 'react';
import type { EditorFile } from '../shared/types';
import { isDirty } from '../shared/utils';

export interface FileTabProps {
    file: EditorFile;
    isActive: boolean;
    onClick: () => void;
    onClose: () => void;
    dataActive: boolean;
}

export const FileTab = ({
    file,
    isActive,
    onClick,
    onClose,
    dataActive,
}: FileTabProps) => {
    const [isFileDirty, setIsFileDirty] = useState(false);
    const filename = file.path.split('/').pop() || '';

    useEffect(() => {
        isDirty(file).then(setIsFileDirty);
    }, [file.path, file.content, file.type, file.type === 'text' ? file.originalHash : null]);

    return (
        <div className="group relative h-full min-w-28 overflow-hidden px-2" data-active={dataActive}>
            <div className="absolute right-0 top-1/2 h-[50%] w-px -translate-y-1/2 bg-[var(--cs-border)]"></div>
            <div className="flex items-center h-full relative overflow-hidden">
                <button
                    className={cn(
                        'relative flex h-full min-w-0 flex-1 items-center rounded-lg px-2 text-sm focus:outline-none',
                        isActive
                            ? isFileDirty
                                ? 'bg-[color:color-mix(in_srgb,var(--cs-accent)_16%,transparent)] text-[var(--cs-foreground)]'
                                : 'bg-[var(--cs-layer)] text-[var(--cs-foreground)]'
                            : isFileDirty
                                ? 'text-[var(--cs-accent)]'
                                : 'text-[var(--cs-icon-muted)] hover:bg-[var(--cs-layer-hover)] hover:text-[var(--cs-foreground)]',
                    )}
                    onClick={onClick}
                >
                    <span className="truncate min-w-0">{filename}</span>
                    {isFileDirty && (
                        <span className={cn(
                            "ml-1 flex-shrink-0",
                            "text-[var(--cs-accent)]"
                        )}>
                            ●
                        </span>
                    )}
                    {isActive && (
                        <div className={cn(
                            "absolute bottom-0 left-0 w-full h-[2px]",
                            "bg-[var(--cs-accent)]"
                        )}></div>
                    )}
                    {!isActive && (
                        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-[color:color-mix(in_srgb,var(--cs-accent)_40%,transparent)] opacity-0 group-hover:opacity-100"></div>
                    )}
                </button>
                <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-md bg-[var(--cs-bg)] opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        className={cn(
                            "cursor-pointer rounded-md p-1.5 hover:bg-[var(--cs-layer-hover)] hover:text-[var(--cs-foreground)]",
                            isActive ? "text-[var(--cs-icon)]" : "text-[var(--cs-icon-muted)]"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose?.();
                        }}
                    >
                        <Icons.CrossS className="h-3 w-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};
