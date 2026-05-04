'use client';

const TOKEN_KEY = 'css-studio-auth-token';
const AUTH_LAST_CHECK_KEY = 'css-studio-auth-last-check';
const AUTH_LAST_RESULT_KEY = 'css-studio-auth-last-result';

export const STUDIO_HOST_TAG = 'css-studio-panel';
export const STUDIO_HOST_ID = 'css-studio-root';
export const STUDIO_THEME_STYLE_ID = 'cs-theme-vars';
export const STUDIO_APP_ROOT_ID = 'cs-app-root';
export const STUDIO_RESPONSIVE_LAYER_ID = 'cs-responsive-layer';
export const STUDIO_CONTROLS_LAYER_ID = 'cs-controls-layer';

export const DEFAULT_THEME_CSS = `
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

export const HOST_BLOCKED_EVENTS = [
    'pointerdown',
    'pointerup',
    'mousedown',
    'mouseup',
    'click',
    'keydown',
    'keyup',
    'keypress',
] as const;

export interface StartStudioOptions {
    mcpPort?: number;
    mode?: string;
    debug?: boolean;
}

export interface StudioHostElements {
    host: HTMLElement;
    appRoot: HTMLDivElement;
    responsiveLayer: HTMLDivElement;
    controlsLayer: HTMLDivElement;
}

function toBase64Url(value: string) {
    return btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function ensureUpstreamBypassToken() {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) {
        localStorage.setItem(AUTH_LAST_CHECK_KEY, String(Date.now()));
        localStorage.setItem(AUTH_LAST_RESULT_KEY, 'true');
        return;
    }

    const header = toBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = toBase64Url(
        JSON.stringify({
            sub: 'onlook-dev',
            aud: 'cssstudio',
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
        }),
    );

    localStorage.setItem(TOKEN_KEY, `${header}.${payload}.onlook`);
    localStorage.setItem(AUTH_LAST_CHECK_KEY, String(Date.now()));
    localStorage.setItem(AUTH_LAST_RESULT_KEY, 'true');
}

export function ensureThemeStyle() {
    let style = document.getElementById(STUDIO_THEME_STYLE_ID) as HTMLStyleElement | null;
    if (style) {
        return style;
    }

    style = document.createElement('style');
    style.id = STUDIO_THEME_STYLE_ID;
    style.textContent = DEFAULT_THEME_CSS;
    document.head.appendChild(style);
    return style;
}

export function getStudioHost() {
    return document.getElementById(STUDIO_HOST_ID) as HTMLElement | null;
}

export function getStudioControlsLayer() {
    return document.getElementById(STUDIO_CONTROLS_LAYER_ID) as HTMLDivElement | null;
}

export function getStudioResponsiveLayer() {
    return document.getElementById(STUDIO_RESPONSIVE_LAYER_ID) as HTMLDivElement | null;
}

function ensureLayer(parent: HTMLElement, id: string, zIndex: string) {
    let element = parent.querySelector(`#${id}`) as HTMLDivElement | null;
    if (element) {
        return element;
    }

    element = document.createElement('div');
    element.id = id;
    element.setAttribute('data-cs-floating', 'true');
    element.style.cssText = [
        'position:absolute',
        'inset:0',
        'pointer-events:none',
        `z-index:${zIndex}`,
    ].join(';');
    parent.appendChild(element);
    return element;
}

export function ensureStudioHost(engine: 'legacy' | 'upstream' = 'upstream'): StudioHostElements {
    ensureUpstreamBypassToken();
    ensureThemeStyle();

    let host = getStudioHost();
    if (!host) {
        host = document.createElement(STUDIO_HOST_TAG);
        host.id = STUDIO_HOST_ID;
        host.setAttribute('data-cs-root', 'true');
        host.style.cssText = [
            'position:fixed',
            'top:0',
            'left:0',
            'width:100%',
            'height:100%',
            'z-index:2147483647',
            'pointer-events:none',
            'font-family:Inter,system-ui,sans-serif',
            'font-size:12px',
            'color:var(--cs-foreground)',
        ].join(';');
        document.documentElement.appendChild(host);
    }

    host.dataset.csEngine = engine;

    let appRoot = host.querySelector(`#${STUDIO_APP_ROOT_ID}`) as HTMLDivElement | null;
    if (!appRoot) {
        appRoot = document.createElement('div');
        appRoot.id = STUDIO_APP_ROOT_ID;
        appRoot.setAttribute('data-cs-root-content', 'true');
        appRoot.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;';
        host.appendChild(appRoot);
    }

    const responsiveLayer = ensureLayer(host, STUDIO_RESPONSIVE_LAYER_ID, '0');
    const controlsLayer = ensureLayer(host, STUDIO_CONTROLS_LAYER_ID, '1');

    return {
        host,
        appRoot,
        responsiveLayer,
        controlsLayer,
    };
}

export function destroyStudioHost() {
    getStudioHost()?.remove();
}
