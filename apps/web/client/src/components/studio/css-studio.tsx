'use client';

import { useEffect, useRef } from 'react';

type StudioCleanup = () => void;

export function CssStudio() {
    const cleanupRef = useRef<StudioCleanup | null>(null);

    useEffect(() => {
        let cancelled = false;

        const teardown = () => {
            cleanupRef.current?.();
            cleanupRef.current = null;
            document.querySelectorAll('css-studio-panel').forEach((node) => node.remove());
        };

        void import('@onlook/cssstudio-runtime')
            .then(({ startStudio }) => {
                if (cancelled) return;
                cleanupRef.current = startStudio();
            })
            .catch((err) => {
                console.error('[CssStudio] Failed to start', err);
            });

        return () => {
            cancelled = true;
            teardown();
        };
    }, []);

    return null;
}
