'use client';

import { useEffect, useRef } from 'react';
import { useStudioRuntime } from '@/components/studio/runtime';
import { setOverlayRoot } from '@/components/studio/editor/state/dom-bridge';
import { setVisualControlRoot } from '@/components/studio/editor/state/visual-controls';

declare global {
    interface Window {
        __onlookCssStudioCleanup?: (() => void) | null;
        __onlookCssStudioLoading?: boolean;
    }
}

const HOST_TAG = 'css-studio-panel';

const DEFAULT_THEME_CSS = `
    * { box-sizing: border-box; }
    button { font-family: inherit; }
    input, textarea { font-family: inherit; }
    :host {
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

function startStudio(options?: { mcpPort?: number; mode?: string }): () => void {
    // Prevent duplicate instances
    if (document.querySelector(HOST_TAG)) return () => {};

    // Create host element
    const host = document.createElement(HOST_TAG);
    host.style.cssText =
        'all:initial;position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;pointer-events:none;';
    document.documentElement.appendChild(host);

    // Attach shadow DOM
    const shadow = host.attachShadow({ mode: 'open' });

    // Wire overlay and visual-controls to the shadow root
    // ShadowRoot is not a subtype of Element in TS but works at runtime
    setOverlayRoot(shadow as unknown as Element);
    setVisualControlRoot(shadow as unknown as Element);

    // Inject theme CSS variables
    const themeStyle = document.createElement('style');
    themeStyle.textContent = DEFAULT_THEME_CSS;
    shadow.appendChild(themeStyle);

    // Create React mount point
    const root = document.createElement('div');
    root.id = 'css-studio-root';
    root.style.cssText =
        "position:relative;z-index:10;font-family:'Inter',system-ui,sans-serif;font-size:12px;color:var(--cs-foreground);";
    shadow.appendChild(root);

    let reactRootUnmount: (() => void) | null = null;

    // Dynamic import to avoid SSR issues
    Promise.all([
        import('react-dom/client'),
        import('@/components/studio/editor/InPagePanel'),
        import('react'),
    ]).then(([{ createRoot }, { InPagePanel }, React]) => {
        const reactRoot = createRoot(root);
        reactRoot.render(React.createElement(InPagePanel, {
            mcpPort: options?.mcpPort,
            mode: options?.mode,
        }));
        reactRootUnmount = () => reactRoot.unmount();
    }).catch((err) => {
        console.error('[CssStudio] Failed to start', err);
    });

    // Return teardown function
    return () => {
        reactRootUnmount?.();
        host.remove();
    };
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

        try {
            if (cancelled) {
                window.__onlookCssStudioLoading = false;
                return teardown;
            }

            const cleanup = startStudio();
            cleanupRef.current = cleanup;
            window.__onlookCssStudioCleanup = cleanup;
        } catch (error) {
            console.error('Failed to start CSS Studio', error);
        } finally {
            window.__onlookCssStudioLoading = false;
        }

        return () => {
            cancelled = true;
            teardown();
        };
    }, [mode]);

    return null;
}
