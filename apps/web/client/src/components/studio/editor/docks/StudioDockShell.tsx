import type { ReactNode } from 'react';
import { cn } from '@onlook/ui/utils';

export function StudioDockShell({
    children,
    className,
    compact = false,
}: {
    children: ReactNode;
    className?: string;
    compact?: boolean;
}) {
    return (
        <div
            data-cs-floating="dock"
            className={cn(
                'pointer-events-auto flex items-center gap-1 rounded-xl border border-[var(--cs-border)] bg-[color-mix(in_srgb,var(--cs-layer)_94%,black)] text-[var(--cs-foreground)] shadow-[0_16px_42px_rgba(0,0,0,0.46)] backdrop-blur-xl',
                compact ? 'px-1.5 py-1' : 'px-2 py-1.5',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function StudioDockSeparator() {
    return <div className="mx-1 h-6 w-px shrink-0 bg-[var(--cs-border)]" />;
}
