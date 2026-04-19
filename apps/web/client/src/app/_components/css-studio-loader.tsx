'use client';

import { useEffect, useRef } from 'react';
import { useStudioRuntime } from '@/components/studio/runtime';

declare global {
    interface Window {
        __onlookCssStudioCleanup?: (() => void) | null;
        __onlookCssStudioLoading?: boolean;
    }
}

export function CssStudioLoader() {
    const { mode } = useStudioRuntime();
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        let cancelled = false;

        const teardown = () => {
            cleanupRef.current?.();
            cleanupRef.current = null;
            window.__onlookCssStudioCleanup?.();
            window.__onlookCssStudioCleanup = null;
            document.querySelectorAll('css-studio-panel').forEach((node) => {
                node.remove();
            });
        };

        if (process.env.NODE_ENV !== 'development' || mode === 'off') {
            teardown();
            window.__onlookCssStudioLoading = false;
            return teardown;
        }

        if (cleanupRef.current || window.__onlookCssStudioCleanup || window.__onlookCssStudioLoading) {
            return teardown;
        }

        window.__onlookCssStudioLoading = true;

        void import('@onlook/cssstudio-runtime')
            .then(({ startStudio }) => {
                if (cancelled) {
                    return;
                }

                const cleanup = startStudio();
                cleanupRef.current = cleanup;
                window.__onlookCssStudioCleanup = cleanup;
            })
            .catch((error) => {
                console.error('Failed to start CSS Studio', error);
            })
            .finally(() => {
                window.__onlookCssStudioLoading = false;
            });

        return () => {
            cancelled = true;
            teardown();
        };
    }, [mode]);

    return null;
}
