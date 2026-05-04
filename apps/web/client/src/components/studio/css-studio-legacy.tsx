'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { InPagePanel } from './editor/InPagePanel';
import { setOverlayRoot } from './editor/state/dom-bridge';
import { setVisualControlRoot } from './editor/state/visual-controls';
import {
    activateVariantControls,
    deactivateVariantControls,
    setVariantControlsRoot,
} from './editor/state/variant-controls';
import { destroyStudioHost, ensureStudioHost } from './host';

export interface CssStudioLegacyProps {
    mcpPort?: number;
    mode?: string;
}

export function CssStudioLegacy({ mcpPort, mode }: CssStudioLegacyProps) {
    const [container, setContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const { appRoot, controlsLayer } = ensureStudioHost('legacy');
        setOverlayRoot(controlsLayer);
        setVisualControlRoot(controlsLayer);
        setVariantControlsRoot(controlsLayer);
        activateVariantControls();
        setContainer(appRoot);

        return () => {
            setContainer(null);
            deactivateVariantControls();
            setVariantControlsRoot(null);
            destroyStudioHost();
        };
    }, []);

    if (!container) {
        return null;
    }

    return <>{createPortal(<InPagePanel mcpPort={mcpPort} mode={mode} />, container)}</>;
}
