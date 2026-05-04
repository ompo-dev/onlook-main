'use client';

import { useEffect } from 'react';
import { ensureUpstreamBypassToken } from './host';

interface CssStudioUpstreamProps {
    mcpPort?: number;
    mode?: string;
}

type StartStudio = (options?: { mcpPort?: number; mode?: string }) => void | (() => void);

export function CssStudioUpstream({ mcpPort, mode }: CssStudioUpstreamProps) {
    useEffect(() => {
        let cleanup: void | (() => void);
        let cancelled = false;
        const hostTag = 'css-studio-panel';

        for (const host of document.querySelectorAll(hostTag)) {
            host.remove();
        }

        try {
            ensureUpstreamBypassToken();
        } catch {
            // keep booting even if localStorage is unavailable
        }

        void (async () => {
            try {
                const module = await import('./cssstudio-package/dist/cssstudio.mjs');
                if (cancelled) {
                    return;
                }

                const startStudio = module.startStudio as StartStudio;
                cleanup = startStudio({ mcpPort, mode });
            } catch (error) {
                console.error('[cssstudio] failed to start upstream dist runtime', error);
            }
        })();

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [mcpPort, mode]);

    return null;
}
