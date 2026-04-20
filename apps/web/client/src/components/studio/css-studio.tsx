'use client';

import { useEffect } from 'react';
import type { Root } from 'react-dom/client';

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

let studioRoot: Root | null = null;
let studioContainer: HTMLElement | null = null;
let disposeTimer: ReturnType<typeof setTimeout> | null = null;
let activeInstances = 0;
let themeStyleOwned = false;

export function CssStudio({ mcpPort, mode }: CssStudioProps) {
    useEffect(() => {
        let cancelled = false;
        activeInstances += 1;

        if (disposeTimer) {
            clearTimeout(disposeTimer);
            disposeTimer = null;
        }

        // Inject theme CSS variables once
        if (!document.getElementById('cs-theme-vars')) {
            const style = document.createElement('style');
            style.id = 'cs-theme-vars';
            style.textContent = DEFAULT_THEME_CSS;
            document.head.appendChild(style);
            themeStyleOwned = true;
        }

        if (!studioContainer || !studioContainer.isConnected) {
            studioContainer =
                (document.getElementById('css-studio-root') as HTMLElement | null) ??
                document.createElement('css-studio-panel');
            studioContainer.id = 'css-studio-root';
            studioContainer.setAttribute('data-cs-root', 'true');
            studioContainer.style.cssText =
                'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,sans-serif;font-size:12px;color:var(--cs-foreground);';
            if (!studioContainer.isConnected) {
                document.documentElement.appendChild(studioContainer);
            }
        }

        // Dynamic import to avoid SSR issues
        import('react-dom/client').then(({ createRoot }) => {
            import('./editor/InPagePanel').then(({ InPagePanel }) => {
                if (cancelled || !studioContainer?.isConnected) {
                    return;
                }
                if (!studioRoot) {
                    studioRoot = createRoot(studioContainer);
                }
                studioRoot.render(<InPagePanel mcpPort={mcpPort} mode={mode} />);
            });
        });

        return () => {
            cancelled = true;
            activeInstances = Math.max(0, activeInstances - 1);

            // Avoid unmounting the nested root during an active React render pass.
            disposeTimer = setTimeout(() => {
                if (activeInstances > 0) {
                    return;
                }
                studioRoot?.unmount();
                studioRoot = null;
                studioContainer?.remove();
                studioContainer = null;
                if (themeStyleOwned) {
                    document.getElementById('cs-theme-vars')?.remove();
                    themeStyleOwned = false;
                }
                disposeTimer = null;
            }, 0);
        };
    }, [mcpPort, mode]);

    return null;
}
