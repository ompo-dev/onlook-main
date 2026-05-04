'use client';

import { useStudioRuntime } from './runtime';
import { CssStudioLegacy } from './css-studio-legacy';
import { CssStudioUpstream } from './css-studio-upstream';

interface CssStudioProps {
    mcpPort?: number;
    mode?: string;
}

export function CssStudio({ mcpPort, mode }: CssStudioProps) {
    const { engine } = useStudioRuntime();
    const useUpstream = engine === 'upstream';

    if (useUpstream) {
        return <CssStudioUpstream key="upstream" mcpPort={mcpPort} mode={mode} />;
    }

    return <CssStudioLegacy key="legacy" mcpPort={mcpPort} mode={mode} />;
}