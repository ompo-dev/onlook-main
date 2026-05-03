import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@onlook/ui/utils';

interface StudioDockButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean;
    danger?: boolean;
    children: ReactNode;
}

export const StudioDockButton = forwardRef<HTMLButtonElement, StudioDockButtonProps>(function StudioDockButton({
    active,
    danger,
    className,
    children,
    type = 'button',
    ...props
}, ref) {
    return (
        <button
            ref={ref}
            type={type}
            className={cn(
                'flex h-8 min-w-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent px-2 text-[11px] text-[var(--cs-secondary-text)] transition',
                'hover:border-[var(--cs-input-border)] hover:bg-[var(--cs-feint)] hover:text-[var(--cs-foreground)]',
                'focus-visible:border-[var(--cs-accent)] focus-visible:outline-none',
                'disabled:pointer-events-none disabled:opacity-40',
                active && 'border-[color-mix(in_srgb,var(--cs-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--cs-accent)_14%,transparent)] text-[var(--cs-accent)]',
                danger && 'hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-200',
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
});
