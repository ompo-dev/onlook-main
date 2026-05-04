import { animate } from 'motion';
import { cancelFrame, frame } from 'motion-dom';
import { createBrailleSpinnerEl } from '../ChatTray/BrailleSpinner';
import { getElementQuad } from '../utils/element-quad';

const STYLESHEET_ID = 'cs-variant-selector-styles';
const STYLESHEET = `
[data-cs-variant-selector] {
    position: fixed;
    pointer-events: auto;
    z-index: 2147483637;
    display: flex;
    align-items: center;
    padding: 3px;
    border-radius: 10px;
    background: var(--cs-layer, #13181a);
    border: 1px solid var(--cs-border, rgba(255,255,255,0.10));
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
    font: 500 11px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--cs-foreground, #fff);
}

[data-cs-variant-track] {
    display: flex;
    gap: 2px;
    align-items: center;
}

[data-cs-variant-btn] {
    pointer-events: auto;
    border: 0;
    cursor: pointer;
    padding: 4px 10px;
    border-radius: 6px;
    font-family: var(--cs-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 11px;
    font-weight: 500;
    color: var(--cs-foreground, #fff);
    background: transparent;
    opacity: 0.65;
    transition: opacity 0.12s, background 0.12s, color 0.12s;
}

[data-cs-variant-btn]:hover {
    background: color-mix(in srgb, var(--cs-foreground, #fff) 6%, transparent);
    opacity: 0.9;
}

[data-cs-variant-btn][data-active] {
    background: color-mix(in srgb, var(--cs-accent, #89b4fa) 18%, transparent);
    color: var(--cs-accent, #89b4fa);
    opacity: 1;
}

[data-cs-variant-selector][data-cs-mode="implementing"] [data-cs-variant-btn],
[data-cs-variant-selector][data-cs-mode="iterating"] [data-cs-variant-btn] {
    cursor: default;
    opacity: 0.3;
}

[data-cs-variant-selector][data-cs-mode="implementing"] [data-cs-variant-btn][data-active],
[data-cs-variant-selector][data-cs-mode="iterating"] [data-cs-variant-btn][data-active] {
    opacity: 0.55;
}

[data-cs-variant-placeholder] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 10px;
    border-radius: 6px;
    font-family: var(--cs-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 11px;
    font-weight: 500;
    color: transparent;
    cursor: default;
    user-select: none;
    pointer-events: none;
    background: color-mix(in srgb, var(--cs-foreground, #fff) 8%, transparent);
    animation: cs-variant-skeleton-pulse 1.4s ease-in-out infinite;
}

[data-cs-variant-placeholder][data-empty] {
    min-width: 42px;
}

@keyframes cs-variant-skeleton-pulse {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 0.85; }
}

[data-cs-variant-divider] {
    width: 1px;
    height: 14px;
    margin: 0 4px;
    background: var(--cs-border, rgba(255,255,255,0.10));
}

[data-cs-action] {
    pointer-events: auto;
    border: 0;
    cursor: pointer;
    padding: 4px 10px;
    border-radius: 6px;
    font: inherit;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: background 0.12s, color 0.12s, filter 0.12s;
}

[data-cs-action="iterate"],
[data-cs-action="cancel"] {
    background: transparent;
    color: var(--cs-feint-text, rgba(255,255,255,0.5));
}

[data-cs-action="iterate"]:hover,
[data-cs-action="cancel"]:hover {
    background: var(--cs-feint, rgba(255,255,255,0.05));
    color: var(--cs-foreground, #fff);
}

[data-cs-action="accept"],
[data-cs-action="retry"] {
    background: var(--cs-accent, #89b4fa);
    color: var(--cs-layer, #13181a);
    font-weight: 600;
}

[data-cs-action="accept"]:hover,
[data-cs-action="retry"]:hover {
    filter: brightness(1.08);
}

[data-cs-status-pill] {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    color: var(--cs-feint-text, rgba(255,255,255,0.55));
}

[data-cs-status-pill][data-variant="implementing"],
[data-cs-status-pill][data-variant="cancelled"] {
    color: #f59e0b;
}

[data-cs-status-icon] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
    flex-shrink: 0;
}
`;

type VariantMode = 'idle' | 'implementing' | 'iterating' | 'cancelled';

interface VariantSelectorState {
    wrapper: Element;
    container: HTMLDivElement;
    track: HTMLDivElement;
    buttons: Map<string, HTMLButtonElement>;
    placeholders: HTMLElement[];
    acceptBtn: HTMLButtonElement | null;
    iterateBtn: HTMLButtonElement | null;
    variantCount: number;
    slotCount: number;
    activeName: string | null;
    mode: VariantMode;
    effectiveMode: VariantMode | 'streaming';
    pendingActiveSwap: { fromLeft: number; fromTop: number } | null;
    appliedLeft: number;
    appliedTop: number;
}

interface VariantCallbacks {
    onAccept?: (wrapper: Element, active: Element) => void;
    onIterate?: (wrapper: Element, active: Element) => void;
    onRetry?: (wrapper: Element, active: Element) => void;
    onCancel?: (wrapper: Element) => void;
}

const state = {
    root: null as ShadowRoot | HTMLElement | null,
    selectors: new Map<Element, VariantSelectorState>(),
    mutationObserver: null as MutationObserver | null,
    running: false,
    callbacks: {} as VariantCallbacks,
    modes: new Map<string, VariantMode>(),
    stylesheetMounted: false,
};

export function setVariantCallbacks(callbacks: VariantCallbacks) {
    state.callbacks = callbacks;
}

export function setVariantSelectorMode(element: string, mode: VariantMode | null) {
    if (mode === null || mode === 'idle') {
        state.modes.delete(element);
    } else {
        state.modes.set(element, mode);
    }

    for (const selector of state.selectors.values()) {
        const original = selector.wrapper.getAttribute('data-cs-original-element');
        if (original !== element) {
            continue;
        }

        selector.mode = mode ?? 'idle';
        const stream = getStreamState(selector.wrapper);
        const effectiveMode = stream.streaming ? 'streaming' : selector.mode;
        selector.effectiveMode = effectiveMode;
        selector.container.setAttribute('data-cs-mode', effectiveMode);
        renderActionArea(selector, stream);
    }
}

export function setVariantControlsRoot(root: ShadowRoot | HTMLElement | null) {
    state.root = root;
}

export function activateVariantControls() {
    if (!state.root) {
        return;
    }

    ensureStylesheet();

    if (!state.mutationObserver && typeof document !== 'undefined' && document.body) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of Array.from(mutation.addedNodes)) {
                    if (isOrContainsVariants(node)) {
                        rescanVariantControls();
                        return;
                    }
                }
                for (const node of Array.from(mutation.removedNodes)) {
                    if (isOrContainsVariants(node)) {
                        rescanVariantControls();
                        return;
                    }
                }
                if (
                    mutation.type === 'attributes' &&
                    mutation.attributeName === 'data-active' &&
                    (mutation.target as Element).localName === 'css-studio-variant'
                ) {
                    const wrapper = (mutation.target as Element).parentElement;
                    if (wrapper && state.selectors.has(wrapper)) {
                        refreshActive(state.selectors.get(wrapper)!);
                    }
                }
                if (
                    mutation.type === 'attributes' &&
                    (mutation.attributeName === 'data-cs-streaming' ||
                        mutation.attributeName === 'data-cs-expected-count') &&
                    (mutation.target as Element).localName === 'css-studio-variants'
                ) {
                    const selector = state.selectors.get(mutation.target as Element);
                    if (selector) {
                        rebuildButtons(selector);
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-active', 'data-name', 'data-cs-streaming', 'data-cs-expected-count'],
        });
        state.mutationObserver = observer;
    }

    rescanVariantControls();
}

export function deactivateVariantControls() {
    state.mutationObserver?.disconnect();
    state.mutationObserver = null;

    if (state.running) {
        cancelFrame(tick);
        state.running = false;
    }

    for (const selector of state.selectors.values()) {
        selector.container.remove();
    }
    state.selectors.clear();
}

function rescanVariantControls() {
    if (!state.root || typeof document === 'undefined') {
        return;
    }

    const wrappers = new Set<Element>(
        Array.from(document.querySelectorAll('css-studio-variants')),
    );

    for (const [wrapper, selector] of state.selectors) {
        if (!wrappers.has(wrapper) || !wrapper.isConnected) {
            selector.container.remove();
            state.selectors.delete(wrapper);
        }
    }

    for (const wrapper of wrappers) {
        ensureActiveVariant(wrapper);
        if (!state.selectors.has(wrapper)) {
            mountSelector(wrapper);
        } else {
            rebuildButtons(state.selectors.get(wrapper)!);
        }
    }

    if (state.selectors.size > 0 && !state.running) {
        state.running = true;
        frame.read(tick, true);
    } else if (state.selectors.size === 0 && state.running) {
        cancelFrame(tick);
        state.running = false;
    }
}

function ensureStylesheet() {
    if (state.stylesheetMounted || !state.root) {
        return;
    }
    const existing = (state.root as ParentNode).querySelector?.(`#${STYLESHEET_ID}`);
    if (existing) {
        state.stylesheetMounted = true;
        return;
    }

    const style = document.createElement('style');
    style.id = STYLESHEET_ID;
    style.textContent = STYLESHEET;
    state.root.appendChild(style);
    state.stylesheetMounted = true;
}

function isOrContainsVariants(node: Node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return false;
    }
    const element = node as Element;
    if (element.localName === 'css-studio-variants' || element.localName === 'css-studio-variant') {
        return true;
    }
    return !!element.querySelector?.('css-studio-variants');
}

function getVariantChildren(wrapper: Element) {
    return Array.from(wrapper.children).filter(
        (child): child is Element => child.localName === 'css-studio-variant',
    );
}

function ensureActiveVariant(wrapper: Element) {
    const variants = getVariantChildren(wrapper);
    if (variants.length === 0) {
        return;
    }
    if (!variants.some((variant) => variant.hasAttribute('data-active'))) {
        variants[0].setAttribute('data-active', '');
    }
}

function mountSelector(wrapper: Element) {
    if (!state.root) {
        return;
    }

    const container = document.createElement('div');
    container.setAttribute('data-cs-variant-selector', '');

    const track = document.createElement('div');
    track.setAttribute('data-cs-variant-track', '');
    container.appendChild(track);

    const originalElement = wrapper.getAttribute('data-cs-original-element');
    if (originalElement && state.modes.get(originalElement) === 'iterating') {
        state.modes.delete(originalElement);
    }

    const initialMode = (originalElement && state.modes.get(originalElement)) || 'idle';
    container.setAttribute('data-cs-mode', initialMode);

    const selector: VariantSelectorState = {
        wrapper,
        container,
        track,
        buttons: new Map(),
        placeholders: [],
        acceptBtn: null,
        iterateBtn: null,
        variantCount: 0,
        slotCount: 0,
        activeName: null,
        mode: initialMode,
        effectiveMode: initialMode,
        pendingActiveSwap: null,
        appliedLeft: 0,
        appliedTop: 0,
    };

    state.root.appendChild(container);
    state.selectors.set(wrapper, selector);
    rebuildButtons(selector);
    syncPosition(selector);
}

function renderActionArea(
    selector: VariantSelectorState,
    stream: { streaming: boolean; remaining: number },
) {
    const divider = selector.track.querySelector('[data-cs-variant-divider]');
    if (divider) {
        let node: ChildNode | null = divider;
        while (node) {
            const next = node.nextSibling;
            const destroy = (node as any).__destroySpinner;
            if (typeof destroy === 'function') {
                destroy();
            }
            node.remove();
            node = next;
        }
    }

    selector.acceptBtn = null;
    selector.iterateBtn = null;

    const dividerEl = document.createElement('span');
    dividerEl.setAttribute('data-cs-variant-divider', '');
    selector.track.appendChild(dividerEl);

    if (selector.mode === 'implementing') {
        selector.track.appendChild(buildStatusPill('implementing', 'Implementing…'));
        return;
    }
    if (selector.mode === 'iterating') {
        selector.track.appendChild(buildStatusPill('iterating', 'Iterating…'));
        return;
    }
    if (selector.mode === 'cancelled') {
        selector.track.appendChild(buildStatusPill('cancelled', 'Cancelled'));
        const cancelBtn = createActionButton('cancel', 'Dismiss');
        cancelBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            state.callbacks.onCancel?.(selector.wrapper);
        });
        selector.track.appendChild(cancelBtn);

        const retryBtn = createActionButton('retry', 'Retry');
        retryBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const active = getVariantChildren(selector.wrapper).find((variant) =>
                variant.hasAttribute('data-active'),
            );
            if (active) {
                state.callbacks.onRetry?.(selector.wrapper, active);
            }
        });
        selector.track.appendChild(retryBtn);
        return;
    }
    if (stream.streaming) {
        const label = stream.remaining > 0 ? `${stream.remaining} remaining` : 'Generating…';
        selector.track.appendChild(buildStatusPill('iterating', label));
        return;
    }

    const iterateBtn = createActionButton('iterate', 'Iterate');
    iterateBtn.title = 'Build more variants from the active one';
    iterateBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const active = getVariantChildren(selector.wrapper).find((variant) =>
            variant.hasAttribute('data-active'),
        );
        if (active) {
            state.callbacks.onIterate?.(selector.wrapper, active);
        }
    });
    selector.track.appendChild(iterateBtn);
    selector.iterateBtn = iterateBtn;

    const acceptBtn = createActionButton('accept', 'Accept');
    acceptBtn.title = 'Commit the active variant and remove the wrapper';
    acceptBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const active = getVariantChildren(selector.wrapper).find((variant) =>
            variant.hasAttribute('data-active'),
        );
        if (active) {
            state.callbacks.onAccept?.(selector.wrapper, active);
        }
    });
    selector.track.appendChild(acceptBtn);
    selector.acceptBtn = acceptBtn;
}

function createActionButton(kind: string, label: string) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('data-cs-action', kind);
    return button;
}

function buildStatusPill(variant: string, label: string) {
    const pill = document.createElement('div');
    pill.setAttribute('data-cs-status-pill', '');
    pill.setAttribute('data-variant', variant);

    const iconWrap = document.createElement('span');
    iconWrap.setAttribute('data-cs-status-icon', '');
    if (variant === 'cancelled') {
        iconWrap.appendChild(createExclamationIcon());
    } else {
        const { el, destroy } = createBrailleSpinnerEl(12);
        iconWrap.appendChild(el);
        (pill as any).__destroySpinner = destroy;
    }
    pill.appendChild(iconWrap);

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    pill.appendChild(labelEl);
    return pill;
}

function createExclamationIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML =
        '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>';
    return svg;
}

function getStreamState(wrapper: Element) {
    const streamingAttr = wrapper.hasAttribute('data-cs-streaming');
    const expectedRaw = wrapper.getAttribute('data-cs-expected-count');
    const expected = expectedRaw ? Math.max(0, Number(expectedRaw) | 0) : 0;
    const actual = getVariantChildren(wrapper).length;
    const streaming = streamingAttr && expected > 0 && actual < expected;
    const remaining = streaming ? Math.max(0, expected - actual) : 0;
    return { streaming, expected, actual, remaining };
}

function rebuildButtons(selector: VariantSelectorState) {
    const variants = getVariantChildren(selector.wrapper);
    const names = variants.map(
        (variant, index) => variant.getAttribute('data-name') || `Variant ${index + 1}`,
    );
    const stream = getStreamState(selector.wrapper);
    const slotCount = Math.max(variants.length, stream.streaming ? stream.expected : 0);
    const effectiveMode = stream.streaming ? 'streaming' : selector.mode;
    const needsRebuild =
        variants.length !== selector.variantCount ||
        slotCount !== selector.slotCount ||
        effectiveMode !== selector.effectiveMode;

    if (needsRebuild) {
        selector.track.replaceChildren();
        selector.buttons.clear();
        selector.placeholders = [];
        selector.acceptBtn = null;
        selector.iterateBtn = null;

        for (let index = 0; index < variants.length; index += 1) {
            const name = names[index];
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = name;
            button.setAttribute('data-cs-variant-btn', '');
            button.setAttribute('data-variant-name', name);
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                if (selector.mode === 'implementing' || selector.mode === 'iterating') {
                    return;
                }
                setActiveVariant(selector.wrapper, name);
            });
            selector.track.appendChild(button);
            selector.buttons.set(name, button);
        }

        for (let index = variants.length; index < slotCount; index += 1) {
            const placeholder = buildVariantPlaceholder();
            selector.track.appendChild(placeholder);
            selector.placeholders.push(placeholder);
        }

        selector.container.setAttribute('data-cs-mode', effectiveMode);
        renderActionArea(selector, stream);
        selector.variantCount = variants.length;
        selector.slotCount = slotCount;
        selector.effectiveMode = effectiveMode;
    }

    refreshActive(selector);
}

function buildVariantPlaceholder(name?: string) {
    const placeholder = document.createElement('span');
    placeholder.setAttribute('data-cs-variant-placeholder', '');
    if (name) {
        placeholder.textContent = name;
    } else {
        placeholder.setAttribute('data-empty', '');
    }
    return placeholder;
}

function refreshActive(selector: VariantSelectorState) {
    const variants = getVariantChildren(selector.wrapper);
    const active = variants.find((variant) => variant.hasAttribute('data-active'));
    const newActiveName = active?.getAttribute('data-name') || null;
    const prevActiveName = selector.activeName;

    if (prevActiveName && newActiveName && prevActiveName !== newActiveName) {
        selector.pendingActiveSwap = {
            fromLeft: selector.appliedLeft,
            fromTop: selector.appliedTop,
        };
    }

    selector.activeName = newActiveName;
    for (const [name, button] of selector.buttons) {
        if (name === newActiveName) {
            button.setAttribute('data-active', '');
        } else {
            button.removeAttribute('data-active');
        }
    }

    if (selector.pendingActiveSwap) {
        syncPosition(selector);
    }
}

function setActiveVariant(wrapper: Element, name: string) {
    const variants = getVariantChildren(wrapper);
    for (const variant of variants) {
        if (variant.getAttribute('data-name') === name) {
            variant.setAttribute('data-active', '');
        } else {
            variant.removeAttribute('data-active');
        }
    }
}

function syncPosition(selector: VariantSelectorState) {
    const wrapper = selector.wrapper;
    if (!wrapper.isConnected) {
        selector.container.style.display = 'none';
        return;
    }

    const activeChild = getVariantChildren(wrapper).find((variant) =>
        variant.hasAttribute('data-active'),
    );
    let anchor: Element = activeChild ?? wrapper;
    let rect = anchor.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0 && activeChild) {
        for (
            let inner = activeChild.firstElementChild;
            inner;
            inner = inner.nextElementSibling
        ) {
            const innerRect = inner.getBoundingClientRect();
            if (innerRect.width > 0 || innerRect.height > 0) {
                anchor = inner;
                rect = innerRect;
                break;
            }
        }
    }

    if (rect.width === 0 && rect.height === 0) {
        selector.container.style.display = 'none';
        return;
    }

    const quad =
        anchor !== wrapper
            ? getElementQuad(anchor)
            : {
                  untransformedX: rect.left,
                  untransformedY: rect.top,
                  width: rect.width,
                  height: rect.height,
              };

    selector.container.style.display = 'flex';
    const top = Math.max(quad.untransformedY - 34, 4);
    const left = quad.untransformedX;
    selector.container.style.top = `${top}px`;
    selector.container.style.left = `${left}px`;
    selector.appliedLeft = left;
    selector.appliedTop = top;

    const swap = selector.pendingActiveSwap;
    if (swap) {
        selector.pendingActiveSwap = null;
        const dx = swap.fromLeft - left;
        const dy = swap.fromTop - top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            animate(
                selector.container,
                { x: [dx, 0], y: [dy, 0] },
                { type: 'spring', visualDuration: 0.3, bounce: 0.15 },
            );
        }
    }
}

function tick() {
    for (const selector of state.selectors.values()) {
        syncPosition(selector);
    }
    if (state.running) {
        frame.read(tick, true);
    }
}
