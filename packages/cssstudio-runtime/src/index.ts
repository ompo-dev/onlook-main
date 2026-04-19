import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { setOverlayRoot } from './Editor/state/dom-bridge';
import { setVisualControlRoot } from './Editor/state/visual-controls';
import { setDefaultSettings } from './Editor/Settings';
import { InPagePanel } from './Editor/InPagePanel';

const HOST_TAG = 'css-studio-panel';

interface StartStudioOptions {
    mcpPort?: number;
    mode?: string;
    defaultSettings?: Record<string, string>;
}

const DEFAULT_THEME_CSS = `
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
    }
    * { box-sizing: border-box; }
    button { font-family: inherit; }
    input, textarea { font-family: inherit; }
`;

export function startStudio(options?: StartStudioOptions): () => void {
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
    setOverlayRoot(shadow);
    setVisualControlRoot(shadow);

    // Inject theme CSS variables
    const themeStyle = document.createElement('style');
    themeStyle.textContent = DEFAULT_THEME_CSS;
    shadow.appendChild(themeStyle);
    // injected by build-src.mjs ↓
    shadow.appendChild(document.createElement('__cs_placeholder__'));

    // Apply default settings overrides if provided
    if (options?.defaultSettings) {
        setDefaultSettings(options.defaultSettings);
    }

    // Create React mount point
    const root = document.createElement('div');
    root.id = 'css-studio-root';
    root.style.cssText =
        "position:relative;z-index:10;font-family:'Inter',system-ui,sans-serif;font-size:12px;color:var(--cs-foreground);";
    shadow.appendChild(root);

    // Render React tree
    const reactRoot = createRoot(root);
    reactRoot.render(
        createElement(InPagePanel, {
            mcpPort: options?.mcpPort,
            mode: options?.mode,
        }),
    );

    // Return teardown function
    return () => {
        reactRoot.unmount();
        host.remove();
    };
}
