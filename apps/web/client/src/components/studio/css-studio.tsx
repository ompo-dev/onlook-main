'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { InPagePanel } from './editor/InPagePanel';

const DEFAULT_THEME_CSS = `
    * { box-sizing: border-box; }
    button { font-family: inherit; }
    input, textarea { font-family: inherit; }
    :root {
        --cs-layer: #1a1a28;
        --cs-black: #141422;
        --cs-accent: #8df0cc;
        --cs-feint-solid: #222236;
        --cs-border: rgba(255,255,255,0.10);
        --cs-white: #fff;
        --cs-feint-text: #8888a8;
        --cs-red: #ff1231;
        --cs-foreground: #fff;
        --cs-background: var(--cs-layer);
        --cs-feint: rgba(255, 255, 255, 0.05);
        --cs-label-text: rgba(255, 255, 255, 0.6);
        --cs-font-mono: "JetBrains Mono", monospace;
        --cs-dark-text: color-mix(in srgb, var(--cs-white) 70%, var(--cs-feint-text));
        --cs-selected-tree-bg: color-mix(in srgb, var(--cs-accent) 8%, transparent);
        --cs-input-bg: rgba(255,255,255,0.08);
        --cs-input-bg-hover: rgba(255,255,255,0.12);
        --cs-input-border: rgba(255,255,255,0.08);
        --cs-input-border-strong: rgba(255,255,255,0.15);
        --cs-icon-muted: rgba(255,255,255,0.3);
        --cs-icon-muted-hover: rgba(255,255,255,0.8);
        --cs-secondary-text: rgba(255,255,255,0.5);
        --cs-secondary-text-hover: rgba(255,255,255,0.7);
        --cs-checker: rgba(255,255,255,0.15);
        --cs-on-accent: #000;
        --cs-panel-bg: #1a1a28;
    }
`;

interface CssStudioProps {
    mcpPort?: number;
    mode?: string;
}

const HOST_ID = 'css-studio-root';
const THEME_STYLE_ID = 'cs-theme-vars';

export function CssStudio({ mcpPort, mode }: CssStudioProps) {
    const [container, setContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const existing = document.getElementById(HOST_ID);
        existing?.remove();

        let themeStyleOwned = false;
        if (!document.getElementById(THEME_STYLE_ID)) {
            const style = document.createElement('style');
            style.id = THEME_STYLE_ID;
            style.textContent = DEFAULT_THEME_CSS;
            document.head.appendChild(style);
            themeStyleOwned = true;
        }

        const nextContainer = document.createElement('css-studio-panel');
        nextContainer.id = HOST_ID;
        nextContainer.setAttribute('data-cs-root', 'true');
        nextContainer.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,sans-serif;font-size:12px;color:var(--cs-foreground);';
        document.documentElement.appendChild(nextContainer);
        setContainer(nextContainer);

        return () => {
            setContainer(null);
            nextContainer.remove();
            if (themeStyleOwned) {
                document.getElementById(THEME_STYLE_ID)?.remove();
            }
        };
    }, []);

    return container ? createPortal(<InPagePanel mcpPort={mcpPort} mode={mode} />, container) : null;
}
