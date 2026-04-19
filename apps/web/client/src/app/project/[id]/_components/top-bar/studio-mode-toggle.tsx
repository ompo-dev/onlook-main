'use client';

import { useStudioRuntime, type StudioMode } from '@/components/studio/runtime';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { Layers3, Power } from 'lucide-react';

const MODE_ITEMS: Array<{
    description: string;
    icon: typeof Power;
    label: string;
    mode: StudioMode;
}> = [
    {
        mode: 'off',
        label: 'Off',
        icon: Power,
        description: 'Hide the studio overlay',
    },
    {
        mode: 'native',
        label: 'Studio',
        icon: Layers3,
        description: 'Run the Onlook CSS Studio',
    },
];

export function StudioModeToggle() {
    const { availability, mode, setMode } = useStudioRuntime();

    if (!availability.native) {
        return null;
    }

    return (
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-background-onlook/60 px-1 py-1">
            {MODE_ITEMS.map((item) => {
                const isUnavailable = item.mode === 'native' && !availability.native;
                const Icon = item.icon;

                return (
                    <Tooltip key={item.mode}>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                disabled={isUnavailable}
                                onClick={() => setMode(item.mode)}
                                className={cn(
                                    'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors',
                                    mode === item.mode
                                        ? 'bg-background text-foreground-primary'
                                        : 'text-foreground-secondary hover:bg-background-onlook hover:text-foreground-primary',
                                    isUnavailable && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-foreground-secondary',
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span>{item.label}</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="mt-1" hideArrow>
                            {item.description}
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
}
