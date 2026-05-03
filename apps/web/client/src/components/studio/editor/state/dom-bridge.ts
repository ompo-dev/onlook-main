import { getElementQuad, pointInQuad } from '../utils/element-quad';
import {
    isVisualControlElement,
    deactivateControls,
    suspendControls,
    resumeControls,
} from './visual-controls';

interface BridgeState {
    nextId: number;
    elements: Map<number, Element>;
    reverseMap: WeakMap<Element, number>;
    highlightEl: HTMLElement | null;
    selectEl: HTMLElement | null;
    layoutBoxEl: HTMLElement | null;
    selectedId: number | null;
    _selectRaf: number;
    pickerCleanup: (() => void) | null;
    pickerMarqueeEl: HTMLElement | null;
    inlineEditActive: boolean;
    inlineEditCleanup: (() => void) | null;
    _inlineCommit: (() => void) | null;
    scrollCleanup: (() => void) | null;
    observer: MutationObserver | null;
    observedId: number | null;
    _mutationTimer: ReturnType<typeof setTimeout> | null;
    previewEls: Set<Element>;
    localInsertedEls: Set<Element>;
    _bodyObserver: MutationObserver | null;
    _bodyDirtyTimer: ReturnType<typeof setTimeout> | null;
    theme: Record<string, string> | null;
    promptIconEl: HTMLElement | null;
    _promptIconCallback: ((id: number) => void) | null;
    contextMenuCleanup: (() => void) | null;
    previewAnimation: Animation | null;
    reorderActive: boolean;
    reorderLineEl: HTMLElement | null;
    reorderGhostEl: HTMLElement | null;
    selectClickCleanup: (() => void) | null;
    drawCleanup: (() => void) | null;
    drawOverlayEl: HTMLElement | null;
    drawParentHighlightEl: HTMLElement | null;
    overlayRoot: Element | null;
    multiSelectEls: Map<number, HTMLElement>;
    multiSelectOverlaySet: WeakSet<Element>;
    _multiSelectRaf: number;
    activeDocument: Document | null;
}

interface BridgeFrameTarget {
    document: Document;
    iframe: HTMLIFrameElement;
}

const state: BridgeState = {
    nextId: 1,
    elements: new Map(),
    reverseMap: new WeakMap(),
    highlightEl: null,
    selectEl: null,
    layoutBoxEl: null,
    selectedId: null,
    _selectRaf: 0,
    pickerCleanup: null,
    pickerMarqueeEl: null,
    inlineEditActive: false,
    inlineEditCleanup: null,
    _inlineCommit: null,
    scrollCleanup: null,
    observer: null,
    observedId: null,
    _mutationTimer: null,
    previewEls: new Set(),
    localInsertedEls: new Set(),
    _bodyObserver: null,
    _bodyDirtyTimer: null,
    theme: null,
    promptIconEl: null,
    _promptIconCallback: null,
    contextMenuCleanup: null,
    previewAnimation: null,
    reorderActive: false,
    reorderLineEl: null,
    reorderGhostEl: null,
    selectClickCleanup: null,
    drawCleanup: null,
    drawOverlayEl: null,
    drawParentHighlightEl: null,
    overlayRoot: null,
    multiSelectEls: new Map(),
    multiSelectOverlaySet: new WeakSet(),
    _multiSelectRaf: 0,
    activeDocument: null,
};

let frameTargetsProvider: (() => BridgeFrameTarget[]) | null = null;

export function setBridgeFrameTargetsProvider(
    provider: (() => BridgeFrameTarget[]) | null,
): void {
    frameTargetsProvider = provider;
    state.activeDocument = null;
}

function getFrameTargets(): BridgeFrameTarget[] {
    if (!frameTargetsProvider) {
        return [];
    }

    try {
        return frameTargetsProvider().filter((target) => {
            return (
                !!target.document?.documentElement &&
                !!target.iframe?.isConnected
            );
        });
    } catch (error) {
        console.error('[css-studio] Failed to resolve frame targets:', error);
        return [];
    }
}

function hasFrameTargetsProvider(): boolean {
    return frameTargetsProvider !== null;
}

function setActiveDocument(doc: Document | null): void {
    state.activeDocument = doc;
}

function getFallbackDocument(): Document {
    return typeof document !== 'undefined' ? document : state.activeDocument ?? window.document;
}

function getPrimaryDocument(): Document {
    const frameTargets = getFrameTargets();
    if (state.activeDocument) {
        const activeMatch = frameTargets.find((target) => target.document === state.activeDocument);
        if (activeMatch) {
            return activeMatch.document;
        }
    }

    return frameTargets[0]?.document ?? state.activeDocument ?? getFallbackDocument();
}

function getDocumentRoot(doc: Document): HTMLElement {
    return doc.documentElement ?? doc.body ?? getFallbackDocument().documentElement;
}

function getDocumentBody(doc: Document): HTMLElement {
    return doc.body ?? doc.documentElement;
}

function getOverlayDocumentForElement(el: Element | null | undefined): Document {
    return el?.ownerDocument ?? getPrimaryDocument();
}

function getDocumentElementAtPoint(doc: Document, x: number, y: number): Element | null {
    for (const el of doc.elementsFromPoint(x, y)) {
        if (el === doc.documentElement || el === doc.body) continue;
        if (isOverlay(el)) continue;
        return el;
    }
    return null;
}

function getHostPointForDocument(
    doc: Document,
    x: number,
    y: number,
): { x: number; y: number } {
    const frameEl = doc.defaultView?.frameElement;
    if (!(frameEl instanceof HTMLElement)) {
        return { x, y };
    }

    const frameRect = frameEl.getBoundingClientRect();
    return {
        x: frameRect.left + x,
        y: frameRect.top + y,
    };
}

function createOverlayElement<T extends keyof HTMLElementTagNameMap>(
    doc: Document,
    tagName: T,
    cssText: string,
): HTMLElementTagNameMap[T] {
    const el = doc.createElement(tagName);
    el.style.cssText = cssText;
    getDocumentRoot(doc).appendChild(el);
    return el;
}

function ensureOverlayElement<T extends HTMLElement>(
    current: T | null,
    doc: Document,
    create: () => T,
): T {
    if (current && current.ownerDocument === doc) {
        return current;
    }

    current?.remove();
    return create();
}

function addDocumentListeners(
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean,
): (() => void)[] {
    const docs = getFrameTargets().map((target) => target.document);
    const targetDocs =
        docs.length > 0 ? docs : hasFrameTargetsProvider() ? [] : [getFallbackDocument()];

    return targetDocs.map((doc) => {
        doc.addEventListener(type, handler, options);
        return () => doc.removeEventListener(type, handler, options);
    });
}

function setCursorOnTargetDocuments(value: string): void {
    const docs = getFrameTargets().map((target) => target.document);
    const targetDocs =
        docs.length > 0 ? docs : hasFrameTargetsProvider() ? [] : [getFallbackDocument()];
    for (const doc of targetDocs) {
        doc.documentElement.style.setProperty('cursor', value, 'important');
    }
}

function clearCursorOnTargetDocuments(): void {
    const docs = getFrameTargets().map((target) => target.document);
    const targetDocs =
        docs.length > 0 ? docs : hasFrameTargetsProvider() ? [] : [getFallbackDocument()];
    for (const doc of targetDocs) {
        doc.documentElement.style.cursor = '';
    }
}

export function getId(el: Element): number {
    let id = state.reverseMap.get(el);
    if (!id) {
        id = state.nextId++;
        state.elements.set(id, el);
        state.reverseMap.set(el, id);
    }
    return id;
}

function getEl(id: number): Element | undefined {
    return state.elements.get(id);
}

export function getElement(id: number): Element | undefined {
    return state.elements.get(id);
}

export function scrollElementIntoView(id: number): void {
    const el = state.elements.get(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function getTheme(): Record<string, string> {
    return state.theme || {};
}

function isMultiSelectOverlay(el: Element): boolean {
    return state.multiSelectOverlaySet.has(el);
}

function isStudioUiElement(el: Element): boolean {
    return (
        el.id === 'css-studio-root' ||
        !!el.closest?.('#css-studio-root') ||
        !!el.closest?.('[data-cs-floating]') ||
        !!el.closest?.('[data-cs-toolbar]') ||
        !!el.closest?.('[data-cs-panel]')
    );
}

export function isOverlay(el: Element): boolean {
    return (
        isStudioUiElement(el) ||
        el === state.highlightEl ||
        el === state.selectEl ||
        el === state.layoutBoxEl ||
        el === state.promptIconEl ||
        el === state.reorderLineEl ||
        el === state.reorderGhostEl ||
        el === state.drawOverlayEl ||
        el === state.drawParentHighlightEl ||
        el === state.pickerMarqueeEl ||
        el.localName === 'css-studio-panel' ||
        isVisualControlElement(el) ||
        isMultiSelectOverlay(el)
    );
}

function cleanupPrompt(): void {
    if (state.promptIconEl) {
        state.promptIconEl.remove();
        state.promptIconEl = null;
    }
}

export function setOverlayRoot(root: Element): void {
    state.overlayRoot = root;
}

export function setOverlayBlocking(blocking: boolean): void {
    if (state.selectEl) {
        if (blocking && state.inlineEditActive) return;
        // The selection frame must never eat clicks; otherwise panels/popovers
        // interpret the frame itself as an outside click target.
        state.selectEl.style.pointerEvents = 'none';
    }
}

export function getPageElementAtPoint(x: number, y: number): Element | null {
    const frameTargets = getFrameTargets();
    if (frameTargets.length > 0 || hasFrameTargetsProvider()) {
        for (const target of frameTargets) {
            const frameRect = target.iframe.getBoundingClientRect();
            if (
                x < frameRect.left ||
                x > frameRect.right ||
                y < frameRect.top ||
                y > frameRect.bottom
            ) {
                continue;
            }

            const element = getDocumentElementAtPoint(
                target.document,
                x - frameRect.left,
                y - frameRect.top,
            );

            if (element) {
                setActiveDocument(target.document);
                return element;
            }
        }

        return null;
    }

    const fallbackDoc = getPrimaryDocument();
    const element = getDocumentElementAtPoint(fallbackDoc, x, y);
    if (element) {
        setActiveDocument(fallbackDoc);
    }
    return element;
}

function getReactComponentInfo(el: Element): { component: string; source?: string } | null {
    const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
    if (!fiberKey) return null;
    let fiber = (el as any)[fiberKey];
    if (!fiber) return null;
    while (fiber) {
        const type = fiber.type;
        if (type && typeof type !== 'string') {
            const name = type.displayName || type.name;
            if (name) {
                const result: { component: string; source?: string } = { component: name };
                const debug = fiber._debugSource;
                if (debug?.fileName) {
                    let file = debug.fileName;
                    const srcIdx = file.indexOf('/src/');
                    if (srcIdx !== -1) file = file.slice(srcIdx + 1);
                    result.source = debug.lineNumber ? `${file}:${debug.lineNumber}` : file;
                }
                return result;
            }
        }
        fiber = fiber.return;
    }
    return null;
}

export function isElementConnected(id: number): boolean {
    const el = getEl(id);
    return el !== undefined && el.isConnected;
}

export function buildElementSelector(id: number): string | null {
    const el = getEl(id);
    if (!el) return null;
    const tag = el.localName;
    if ((el as HTMLElement).id) return `${tag}#${CSS.escape((el as HTMLElement).id)}`;
    const testId = el.getAttribute('data-testid');
    if (testId) return `${tag}[data-testid="${CSS.escape(testId)}"]`;
    const dataId = el.getAttribute('data-id');
    if (dataId) return `${tag}[data-id="${CSS.escape(dataId)}"]`;
    if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).filter(Boolean);
        if (classes.length > 0) {
            return `${tag}${classes.map((c) => `.${CSS.escape(c)}`).join('')}`;
        }
    }
    return tag;
}

export function findReplacementElement(selector: string, oldId: number): number | null {
    const oldEl = getEl(oldId);
    const doc = oldEl?.ownerDocument ?? getPrimaryDocument();
    try {
        const candidates = doc.querySelectorAll(selector);
        if (candidates.length === 0) return null;
        if (candidates.length === 1) {
            const el = candidates[0];
            if (el.isConnected && !isOverlay(el)) return getId(el);
            return null;
        }
        for (let i = 0; i < candidates.length; i++) {
            const el = candidates[i];
            if (el !== oldEl && el.isConnected && !isOverlay(el)) {
                return getId(el);
            }
        }
    } catch {
        //
    }
    return null;
}

export function purgeDetachedElements(): void {
    for (const [id, el] of state.elements) {
        if (!el.isConnected && id !== state.selectedId) {
            state.elements.delete(id);
        }
    }
}

export function initBridge(): boolean {
    return true;
}

export function fetchDomTree(): any {
    if (hasFrameTargetsProvider() && getFrameTargets().length === 0) {
        return null;
    }

    const rootDoc = state.selectedId !== null
        ? getEl(state.selectedId)?.ownerDocument ?? getPrimaryDocument()
        : getPrimaryDocument();
    setActiveDocument(rootDoc);

    function walk(el: Element): any {
        if (isOverlay(el)) return null;
        const id = getId(el);
        const attrs: Record<string, string> = {};
        for (let i = 0; i < el.attributes.length; i++) {
            attrs[el.attributes[i].name] = el.attributes[i].value;
        }
        const children: any[] = [];
        for (let j = 0; j < el.children.length; j++) {
            const c = walk(el.children[j]);
            if (c) children.push(c);
        }
        let text = '';
        for (let k = 0; k < el.childNodes.length; k++) {
            if (el.childNodes[k].nodeType === 3) text += el.childNodes[k].textContent;
        }
        const reactInfo = getReactComponentInfo(el);
        return {
            id,
            localName: el.localName,
            className: el.className || '',
            attributes: attrs,
            children,
            textContent: text.slice(0, 200),
            component: reactInfo?.component,
            source: reactInfo?.source,
        };
    }
    return rootDoc.documentElement ? walk(rootDoc.documentElement) : null;
}

export function fetchStyles(id: number): any {
    const el = getEl(id);
    if (!el) return null;
    setActiveDocument(el.ownerDocument);
    const cs = getComputedStyle(el);
    const computed: Record<string, string> = {};
    for (let i = 0; i < cs.length; i++) {
        computed[cs[i]] = cs.getPropertyValue(cs[i]);
    }
    const htmlEl = el as HTMLElement;
    const inline: Record<string, string> = {};
    for (let j = 0; j < htmlEl.style.length; j++) {
        const prop = htmlEl.style[j];
        inline[prop] = htmlEl.style.getPropertyValue(prop);
    }
    const matched: { selector: string; properties: Record<string, string> }[] = [];
    try {
        const sheets = el.ownerDocument.styleSheets;
        for (let s = 0; s < sheets.length; s++) {
            try {
                const rules = sheets[s].cssRules;
                for (let r = 0; r < rules.length; r++) {
                    const rule = rules[r] as CSSStyleRule;
                    if (rule.selectorText && el.matches(rule.selectorText)) {
                        const props: Record<string, string> = {};
                        for (let p = 0; p < rule.style.length; p++) {
                            props[rule.style[p]] = rule.style.getPropertyValue(rule.style[p]);
                        }
                        matched.push({ selector: rule.selectorText, properties: props });
                    }
                }
            } catch {
                //
            }
        }
    } catch {
        //
    }
    const parent = htmlEl.parentElement;
    const parentDisplay = parent ? getComputedStyle(parent).display : '';
    return { computed, inline, matched, parentDisplay };
}

export function setDocumentProperty(prop: string, value: string): void {
    getPrimaryDocument().documentElement.style.setProperty(prop, value);
}

export function removeDocumentProperty(prop: string): void {
    getPrimaryDocument().documentElement.style.removeProperty(prop);
}

export function setStyleProperty(id: number, prop: string, value: string): void {
    const el = getEl(id);
    if (el) (el as HTMLElement).style.setProperty(prop, value);
}

export function setAttribute(id: number, name: string, value: string): void {
    const el = getEl(id);
    if (el) el.setAttribute(name, value);
}

export function removeAttribute(id: number, name: string): void {
    const el = getEl(id);
    if (el) el.removeAttribute(name);
}

export function setTextContent(id: number, text: string): void {
    const el = getEl(id);
    if (!el) return;
    const textNodes: ChildNode[] = [];
    for (let i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 3) textNodes.push(el.childNodes[i]);
    }
    if (textNodes.length === 0) {
        el.textContent = text;
    } else {
        textNodes[0].textContent = text;
        for (let j = 1; j < textNodes.length; j++) textNodes[j].textContent = '';
    }
}

export function fetchDesignTokens(): { name: string; value: string }[] {
    const doc = getPrimaryDocument();
    const cs = getComputedStyle(doc.documentElement);
    const tokens: { name: string; value: string }[] = [];
    for (let i = 0; i < cs.length; i++) {
        if (cs[i].startsWith('--')) {
            tokens.push({ name: cs[i].slice(2), value: cs.getPropertyValue(cs[i]).trim() });
        }
    }
    return tokens;
}

function getMetaContent(selector: string): string {
    const doc = getPrimaryDocument();
    return (doc.querySelector(selector) as HTMLMetaElement)?.content ?? '';
}

export function fetchPageMetadata(): Record<string, string> {
    const doc = getPrimaryDocument();
    return {
        title: doc.title,
        description: getMetaContent('meta[name="description"]'),
        charset: doc.querySelector('meta[charset]')?.getAttribute('charset') ?? '',
        viewport: getMetaContent('meta[name="viewport"]'),
        ogTitle: getMetaContent('meta[property="og:title"]'),
        ogDescription: getMetaContent('meta[property="og:description"]'),
        ogImage: getMetaContent('meta[property="og:image"]'),
        favicon:
            (doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]') as HTMLLinkElement)?.href ?? '',
    };
}

function ensureMeta(attr: string, value: string): HTMLMetaElement {
    const doc = getPrimaryDocument();
    const selector = `meta[${attr}="${value}"]`;
    let el = doc.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
        el = doc.createElement('meta');
        el.setAttribute(attr, value);
        doc.head.appendChild(el);
    }
    return el;
}

export function setPageMetadataField(field: string, value: string): void {
    const doc = getPrimaryDocument();
    switch (field) {
        case 'title':
            doc.title = value;
            break;
        case 'description':
            ensureMeta('name', 'description').content = value;
            break;
        case 'charset': {
            let el = doc.querySelector('meta[charset]') as HTMLMetaElement | null;
            if (!el) {
                el = doc.createElement('meta');
                doc.head.prepend(el);
            }
            el.setAttribute('charset', value);
            break;
        }
        case 'viewport':
            ensureMeta('name', 'viewport').content = value;
            break;
        case 'ogTitle':
            ensureMeta('property', 'og:title').content = value;
            break;
        case 'ogDescription':
            ensureMeta('property', 'og:description').content = value;
            break;
        case 'ogImage':
            ensureMeta('property', 'og:image').content = value;
            break;
        case 'favicon': {
            let link = doc.querySelector(
                'link[rel="icon"], link[rel="shortcut icon"]',
            ) as HTMLLinkElement | null;
            if (!link) {
                link = doc.createElement('link');
                link.rel = 'icon';
                doc.head.appendChild(link);
            }
            link.href = value;
            break;
        }
    }
}

function findInlineOrigin(el: Element, prop: string): number | null {
    let current: Element | null = el;
    while (current) {
        const htmlEl = current as HTMLElement;
        if (htmlEl.style && htmlEl.style.getPropertyValue(prop)) {
            return state.reverseMap.get(current) ?? null;
        }
        current = current.parentElement;
    }
    return null;
}

export function fetchElementVariables(id: number): { name: string; value: string; originNodeId: number | null }[] {
    const el = getEl(id);
    if (!el) return [];
    const cs = getComputedStyle(el);
    const vars: { name: string; value: string; originNodeId: number | null }[] = [];
    for (let i = 0; i < cs.length; i++) {
        const prop = cs[i];
        if (!prop.startsWith('--')) continue;
        const value = cs.getPropertyValue(prop).trim();
        const originNodeId = findInlineOrigin(el, prop);
        vars.push({ name: prop.slice(2), value, originNodeId });
    }
    return vars;
}

export function observeElement(id: number, onMutation?: () => void): void {
    if (state.observer) {
        state.observer.disconnect();
        state.observer = null;
    }
    if (state._mutationTimer) {
        clearTimeout(state._mutationTimer);
        state._mutationTimer = null;
    }
    state.observedId = id;
    const el = getEl(id);
    if (!el) return;
    state.observer = new MutationObserver(() => {
        if (state.inlineEditActive || state.reorderActive) return;
        if (!onMutation) return;
        if (state._mutationTimer) clearTimeout(state._mutationTimer);
        state._mutationTimer = setTimeout(() => {
            state._mutationTimer = null;
            onMutation();
        }, 500);
    });
    state.observer.observe(el, { attributes: true, childList: true, characterData: true, subtree: false });
}

export function highlightElement(id: number | null): void {
    if (id === null) {
        if (state.highlightEl) state.highlightEl.style.display = 'none';
        return;
    }
    const el = getEl(id);
    if (!el || !el.isConnected) return;
    const doc = getOverlayDocumentForElement(el);
    setActiveDocument(doc);
    state.highlightEl = ensureOverlayElement(
        state.highlightEl,
        doc,
        () =>
            createOverlayElement(
                doc,
                'div',
                'position:fixed;pointer-events:none;z-index:2147483640;transition:all 0.05s;',
            ),
    );
    const h = state.highlightEl;
    const quad = getElementQuad(el);
    if (quad.hasTransform) {
        const avgScale = (quad.scaleX + quad.scaleY) / 2;
        h.style.background = 'rgba(111,168,220,0.3)';
        h.style.border = `${1 / avgScale}px solid rgba(111,168,220,0.7)`;
        h.style.display = 'block';
        h.style.top = quad.untransformedY + 'px';
        h.style.left = quad.untransformedX + 'px';
        h.style.width = quad.width + 'px';
        h.style.height = quad.height + 'px';
        h.style.transform = quad.cssTransform;
        h.style.transformOrigin = '0 0';
    } else {
        h.style.background = 'rgba(111,168,220,0.3)';
        h.style.border = '1px solid rgba(111,168,220,0.7)';
        h.style.display = 'block';
        h.style.top = quad.untransformedY + 'px';
        h.style.left = quad.untransformedX + 'px';
        h.style.width = quad.width + 'px';
        h.style.height = quad.height + 'px';
        h.style.transform = '';
        h.style.transformOrigin = '';
    }
}

export function selectElement(id: number | null): void {
    if (id === null) {
        state.selectedId = null;
        setOverlayBlocking(false);
        if (state._selectRaf) cancelAnimationFrame(state._selectRaf);
        if (state.selectEl) state.selectEl.style.display = 'none';
        if (state.layoutBoxEl) state.layoutBoxEl.style.display = 'none';
        if (state.scrollCleanup) {
            state.scrollCleanup();
            state.scrollCleanup = null;
        }
        cleanupPrompt();
        return;
    }
    state.selectedId = id;
    setOverlayBlocking(true);
    const el = getEl(id);
    if (!el) return;
    const doc = getOverlayDocumentForElement(el);
    setActiveDocument(doc);
    state.selectEl = ensureOverlayElement(
        state.selectEl,
        doc,
        () =>
            createOverlayElement(
                doc,
                'div',
                'position:fixed;pointer-events:none;z-index:2147483639;border:1px solid rgba(111,168,220,0.7);',
            ),
    );
    const s = state.selectEl;
    let prevKey = '';
    function tick() {
        if (!el!.isConnected) {
            s.style.display = 'none';
            if (state.layoutBoxEl) state.layoutBoxEl!.style.display = 'none';
            if (state.promptIconEl) state.promptIconEl!.style.display = 'none';
            return;
        }
        const quad = getElementQuad(el!);
        const key = `${quad.untransformedX},${quad.untransformedY},${quad.width},${quad.height},${quad.cssTransform}`;
        if (key !== prevKey) {
            prevKey = key;
            s.style.display = 'block';
            s.style.top = quad.untransformedY + 'px';
            s.style.left = quad.untransformedX + 'px';
            s.style.width = quad.width + 'px';
            s.style.height = quad.height + 'px';
            if (quad.hasTransform) {
                const avgScale = (quad.scaleX + quad.scaleY) / 2;
                s.style.transform = quad.cssTransform;
                s.style.transformOrigin = '0 0';
                s.style.borderWidth = 1 / avgScale + 'px';
                const selfCs = getComputedStyle(el!);
                const selfTransformed = selfCs.transform && selfCs.transform !== 'none';
                if (selfTransformed) {
                    state.layoutBoxEl = ensureOverlayElement(
                        state.layoutBoxEl,
                        doc,
                        () =>
                            createOverlayElement(
                                doc,
                                'div',
                                'position:fixed;pointer-events:none;z-index:2147483638;border:1px dashed rgba(111,168,220,0.45);background:none;',
                            ),
                    );
                    const lb = state.layoutBoxEl;
                    lb.style.display = 'block';
                    lb.style.top = quad.untransformedY + 'px';
                    lb.style.left = quad.untransformedX + 'px';
                    lb.style.width = quad.width + 'px';
                    lb.style.height = quad.height + 'px';
                    lb.style.transform = '';
                    lb.style.transformOrigin = '';
                } else if (state.layoutBoxEl) {
                    state.layoutBoxEl.style.display = 'none';
                }
            } else {
                s.style.transform = '';
                s.style.transformOrigin = '';
                s.style.borderWidth = '1px';
                if (state.layoutBoxEl) state.layoutBoxEl.style.display = 'none';
            }
        }
        if (state.promptIconEl) {
            const tr = quad.corners[1];
            const ix = Math.min(tr.x + 4, window.innerWidth - 32);
            const iy = Math.max(tr.y - 4, 4);
            state.promptIconEl.style.top = iy + 'px';
            state.promptIconEl.style.left = ix + 'px';
        }
        state._selectRaf = requestAnimationFrame(tick);
    }
    if (state.scrollCleanup) state.scrollCleanup();
    tick();
    state.scrollCleanup = () => {
        cancelAnimationFrame(state._selectRaf);
    };
}

function clearMultiSelectOverlays(): void {
    if (state._multiSelectRaf) {
        cancelAnimationFrame(state._multiSelectRaf);
        state._multiSelectRaf = 0;
    }
    for (const overlay of state.multiSelectEls.values()) {
        state.multiSelectOverlaySet.delete(overlay);
        overlay.remove();
    }
    state.multiSelectEls.clear();
}

export function selectElements(ids: number[], primaryId: number | null): void {
    if (ids.length <= 1) {
        clearMultiSelectOverlays();
        selectElement(ids[0] ?? null);
        return;
    }
    selectElement(primaryId);
    const secondaryIds = new Set(ids.filter((id) => id !== primaryId));
    for (const [id, overlay] of state.multiSelectEls) {
        if (!secondaryIds.has(id)) {
            state.multiSelectOverlaySet.delete(overlay);
            overlay.remove();
            state.multiSelectEls.delete(id);
        }
    }
    for (const id of secondaryIds) {
        if (!state.multiSelectEls.has(id)) {
            const doc = getOverlayDocumentForElement(getEl(id));
            const overlay = createOverlayElement(
                doc,
                'div',
                'position:fixed;pointer-events:none;z-index:2147483638;border:1px dashed rgba(111,168,220,0.7);background:rgba(111,168,220,0.08);',
            );
            state.multiSelectEls.set(id, overlay);
            state.multiSelectOverlaySet.add(overlay);
        }
    }
    if (state._multiSelectRaf) cancelAnimationFrame(state._multiSelectRaf);
    const prevKeys = new Map<number, string>();
    function tickMulti() {
        for (const [id, overlay] of state.multiSelectEls) {
            const el = getEl(id);
            if (!el || !el.isConnected) {
                state.multiSelectOverlaySet.delete(overlay);
                overlay.remove();
                state.multiSelectEls.delete(id);
                prevKeys.delete(id);
                continue;
            }
            const quad = getElementQuad(el);
            const key = `${quad.untransformedX},${quad.untransformedY},${quad.width},${quad.height},${quad.cssTransform}`;
            if (key === prevKeys.get(id)) continue;
            prevKeys.set(id, key);
            overlay.style.display = 'block';
            overlay.style.top = quad.untransformedY + 'px';
            overlay.style.left = quad.untransformedX + 'px';
            overlay.style.width = quad.width + 'px';
            overlay.style.height = quad.height + 'px';
            if (quad.hasTransform) {
                const avgScale = (quad.scaleX + quad.scaleY) / 2;
                overlay.style.transform = quad.cssTransform;
                overlay.style.transformOrigin = '0 0';
                overlay.style.borderWidth = 1 / avgScale + 'px';
            } else {
                overlay.style.transform = '';
                overlay.style.transformOrigin = '';
                overlay.style.borderWidth = '1px';
            }
        }
        if (state.multiSelectEls.size > 0) {
            state._multiSelectRaf = requestAnimationFrame(tickMulti);
        } else {
            state._multiSelectRaf = 0;
        }
    }
    tickMulti();
}

export function startPicker(onPick: (id: number) => void, onMarquee?: (ids: number[]) => void): void {
    setOverlayBlocking(false);
    if (state.drawCleanup) state.drawCleanup();
    if (state.pickerCleanup) state.pickerCleanup();
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let activeDoc: Document | null = null;
    const DRAG_THRESHOLD = 5;
    function onMove(e: MouseEvent) {
        if (dragging) return;
        const sourceDoc = (e.target as Node | null)?.ownerDocument ?? getPrimaryDocument();
        const el = getDocumentElementAtPoint(sourceDoc, e.clientX, e.clientY);
        if (!el) return;
        setActiveDocument(sourceDoc);
        state.highlightEl = ensureOverlayElement(
            state.highlightEl,
            sourceDoc,
            () =>
                createOverlayElement(
                    sourceDoc,
                    'div',
                    'position:fixed;pointer-events:none;z-index:2147483640;background:rgba(111,168,220,0.3);border:1px solid rgba(111,168,220,0.7);transition:all 0.05s;',
                ),
        );
        const r = el.getBoundingClientRect();
        const h = state.highlightEl;
        h.style.display = 'block';
        h.style.top = r.top + 'px';
        h.style.left = r.left + 'px';
        h.style.width = r.width + 'px';
        h.style.height = r.height + 'px';
    }
    function suppress(e: Event) {
        e.preventDefault();
        e.stopImmediatePropagation();
    }
    let spaceHeld = false;
    let lastMoveX = 0;
    let lastMoveY = 0;
    function onSpaceDown(e: KeyboardEvent) {
        if (e.code === 'Space' && dragging && !spaceHeld) {
            e.preventDefault();
            spaceHeld = true;
        }
    }
    function onSpaceUp(e: KeyboardEvent) {
        if (e.code === 'Space') {
            e.preventDefault();
            spaceHeld = false;
        }
    }
    function onDragMove(e: PointerEvent) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!activeDoc) return;
        if (spaceHeld) {
            const dx2 = e.clientX - lastMoveX;
            const dy2 = e.clientY - lastMoveY;
            startX += dx2;
            startY += dy2;
        }
        lastMoveX = e.clientX;
        lastMoveY = e.clientY;
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        if (!dragging && dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
        if (!dragging) {
            dragging = true;
            if (state.highlightEl) state.highlightEl.style.display = 'none';
            activeDoc.addEventListener('keydown', onSpaceDown, true);
            activeDoc.addEventListener('keyup', onSpaceUp, true);
        }
        state.pickerMarqueeEl = ensureOverlayElement(
            state.pickerMarqueeEl,
            activeDoc,
            () =>
                createOverlayElement(
                    activeDoc!,
                    'div',
                    'position:fixed;pointer-events:none;z-index:2147483640;border:2px solid rgba(111,168,220,0.7);border-radius:2px;',
                ),
        );
        const m = state.pickerMarqueeEl;
        m.style.display = 'block';
        m.style.left = Math.min(startX, e.clientX) + 'px';
        m.style.top = Math.min(startY, e.clientY) + 'px';
        m.style.width = dx + 'px';
        m.style.height = dy + 'px';
    }
    function onDragUp(e: PointerEvent) {
        e.preventDefault();
        e.stopImmediatePropagation();
        activeDoc?.removeEventListener('pointermove', onDragMove, true);
        activeDoc?.removeEventListener('pointerup', onDragUp, true);
        if (state.pickerMarqueeEl) state.pickerMarqueeEl.style.display = 'none';
        if (!dragging) {
            const sourceDoc = activeDoc ?? (e.target as Node | null)?.ownerDocument ?? getPrimaryDocument();
            const el = getDocumentElementAtPoint(sourceDoc, e.clientX, e.clientY);
            if (!el) {
                cleanup();
                return;
            }
            cleanup();
            onPick(getId(el));
            return;
        }
        if (!onMarquee) {
            cleanup();
            return;
        }
        const rx = Math.min(startX, e.clientX);
        const ry = Math.min(startY, e.clientY);
        const rw = Math.abs(e.clientX - startX);
        const rh = Math.abs(e.clientY - startY);
        if (rw < DRAG_THRESHOLD && rh < DRAG_THRESHOLD) {
            cleanup();
            return;
        }
        const ids: number[] = [];
        const all = getDocumentBody(activeDoc ?? getPrimaryDocument()).querySelectorAll('*');
        for (const el of all) {
            if (isOverlay(el)) continue;
            const doc = activeDoc ?? getPrimaryDocument();
            if (el === doc.body || el === doc.documentElement) continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            if (r.right < rx || r.left > rx + rw || r.bottom < ry || r.top > ry + rh) continue;
            ids.push(getId(el));
        }
        const leafIds: number[] = [];
        for (const id of ids) {
            const el = getEl(id);
            if (!el) continue;
            let hasChildMatch = false;
            for (const childId of ids) {
                if (childId === id) continue;
                const child = getEl(childId);
                if (child && el.contains(child)) {
                    hasChildMatch = true;
                    break;
                }
            }
            if (!hasChildMatch) leafIds.push(id);
        }
        cleanup();
        if (leafIds.length > 0) onMarquee(leafIds);
    }
    function onDown(e: PointerEvent) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const sourceDoc = (e.target as Node | null)?.ownerDocument ?? getPrimaryDocument();
        const target = getDocumentElementAtPoint(sourceDoc, e.clientX, e.clientY);
        if (!target) return;
        activeDoc = sourceDoc;
        setActiveDocument(sourceDoc);
        dragging = false;
        spaceHeld = false;
        startX = e.clientX;
        startY = e.clientY;
        lastMoveX = e.clientX;
        lastMoveY = e.clientY;
        sourceDoc.addEventListener('pointermove', onDragMove, true);
        sourceDoc.addEventListener('pointerup', onDragUp, true);
    }
    function cleanup() {
        clearCursorOnTargetDocuments();
        clearDynamicListeners();
        if (rebindTimer) {
            clearInterval(rebindTimer);
            rebindTimer = null;
        }
        activeDoc?.removeEventListener('pointermove', onDragMove, true);
        activeDoc?.removeEventListener('pointerup', onDragUp, true);
        activeDoc?.removeEventListener('keydown', onSpaceDown, true);
        activeDoc?.removeEventListener('keyup', onSpaceUp, true);
        if (state.highlightEl) state.highlightEl.style.display = 'none';
        if (state.pickerMarqueeEl) state.pickerMarqueeEl.style.display = 'none';
        state.pickerCleanup = null;
        spaceHeld = false;
        activeDoc = null;
    }

    const dynamicListeners = new Map<
        Document,
        Array<() => void>
    >();

    function clearDynamicListeners() {
        for (const cleanups of dynamicListeners.values()) {
            for (const cleanup of cleanups) {
                cleanup();
            }
        }
        dynamicListeners.clear();
    }

    function getPickerDocuments(): Document[] {
        const frameDocs = getFrameTargets().map((target) => target.document);
        if (frameDocs.length > 0) {
            return frameDocs;
        }
        return hasFrameTargetsProvider() ? [] : [getFallbackDocument()];
    }

    function bindToDocument(doc: Document) {
        if (dynamicListeners.has(doc)) {
            return;
        }
        dynamicListeners.set(doc, [
            (() => {
                doc.addEventListener('mousemove', onMove as any, true);
                return () => doc.removeEventListener('mousemove', onMove as any, true);
            })(),
            (() => {
                doc.addEventListener('pointerdown', onDown as any, true);
                return () => doc.removeEventListener('pointerdown', onDown as any, true);
            })(),
            (() => {
                doc.addEventListener('mousedown', suppress as any, true);
                return () => doc.removeEventListener('mousedown', suppress as any, true);
            })(),
            (() => {
                doc.addEventListener('mouseup', suppress as any, true);
                return () => doc.removeEventListener('mouseup', suppress as any, true);
            })(),
            (() => {
                doc.addEventListener('click', suppress as any, true);
                return () => doc.removeEventListener('click', suppress as any, true);
            })(),
        ]);
    }

    function rebindDocuments() {
        const nextDocs = new Set(getPickerDocuments());
        for (const [doc, cleanups] of dynamicListeners) {
            if (!nextDocs.has(doc)) {
                for (const cleanup of cleanups) {
                    cleanup();
                }
                dynamicListeners.delete(doc);
            }
        }
        for (const doc of nextDocs) {
            bindToDocument(doc);
        }
        setCursorOnTargetDocuments('crosshair');
    }

    rebindDocuments();
    let rebindTimer: ReturnType<typeof setInterval> | null = setInterval(rebindDocuments, 250);
    setCursorOnTargetDocuments('crosshair');
    state.pickerCleanup = cleanup;
}

export function stopPicker(): void {
    if (state.pickerCleanup) state.pickerCleanup();
}

export function startDrawMode(onDraw: (parentId: number, rect: { x: number; y: number; w: number; h: number }) => void): void {
    setOverlayBlocking(false);
    if (state.pickerCleanup) state.pickerCleanup();
    if (state.drawCleanup) state.drawCleanup();
    let startX = 0;
    let startY = 0;
    let lastMoveX = 0;
    let lastMoveY = 0;
    let spaceHeld = false;
    let isDragging = false;
    let detectedParent: Element | null = null;
    let activeDoc: Document | null = null;
    function suppress(e: Event) {
        e.preventDefault();
        e.stopImmediatePropagation();
    }
    function onSpaceDown(e: KeyboardEvent) {
        if (e.code === 'Space' && isDragging && !spaceHeld) {
            e.preventDefault();
            spaceHeld = true;
        }
    }
    function onSpaceUp(e: KeyboardEvent) {
        if (e.code === 'Space') {
            e.preventDefault();
            spaceHeld = false;
        }
    }
    function detectParent(rect: { x: number; y: number; w: number; h: number }): Element {
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        const sourceDoc = activeDoc ?? getPrimaryDocument();
        let candidate = getDocumentElementAtPoint(sourceDoc, cx, cy);
        if (!candidate) return getDocumentBody(sourceDoc);
        while (candidate && candidate !== sourceDoc.body) {
            const pr = candidate.getBoundingClientRect();
            if (
                rect.x >= pr.left &&
                rect.y >= pr.top &&
                rect.x + rect.w <= pr.right &&
                rect.y + rect.h <= pr.bottom
            ) {
                break;
            }
            candidate = candidate.parentElement ?? getDocumentBody(sourceDoc);
        }
        return candidate ?? getDocumentBody(sourceDoc);
    }
    function onDown(e: PointerEvent) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const sourceDoc = (e.target as Node | null)?.ownerDocument ?? getPrimaryDocument();
        const target = getDocumentElementAtPoint(sourceDoc, e.clientX, e.clientY);
        if (!target) return;
        activeDoc = sourceDoc;
        setActiveDocument(sourceDoc);
        startX = e.clientX;
        startY = e.clientY;
        lastMoveX = e.clientX;
        lastMoveY = e.clientY;
        spaceHeld = false;
        isDragging = true;
        sourceDoc.addEventListener('keydown', onSpaceDown, true);
        sourceDoc.addEventListener('keyup', onSpaceUp, true);
        state.drawOverlayEl = ensureOverlayElement(
            state.drawOverlayEl,
            sourceDoc,
            () =>
                createOverlayElement(
                    sourceDoc,
                    'div',
                    'position:fixed;pointer-events:none;z-index:2147483640;background:rgba(111,168,220,0.15);border:2px solid rgba(111,168,220,0.7);border-radius:2px;',
                ),
        );
        state.drawOverlayEl.style.display = 'block';
        state.drawOverlayEl.style.left = startX + 'px';
        state.drawOverlayEl.style.top = startY + 'px';
        state.drawOverlayEl.style.width = '0px';
        state.drawOverlayEl.style.height = '0px';
        state.drawParentHighlightEl = ensureOverlayElement(
            state.drawParentHighlightEl,
            sourceDoc,
            () =>
                createOverlayElement(
                    sourceDoc,
                    'div',
                    'position:fixed;pointer-events:none;z-index:2147483639;border:2px solid rgba(111,168,220,0.5);border-radius:2px;',
                ),
        );
        state.drawParentHighlightEl.style.display = 'none';
        sourceDoc.addEventListener('pointermove', onMove, true);
        sourceDoc.addEventListener('pointerup', onUp, true);
    }
    function onMove(e: PointerEvent) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (spaceHeld) {
            const dx = e.clientX - lastMoveX;
            const dy = e.clientY - lastMoveY;
            startX += dx;
            startY += dy;
        }
        lastMoveX = e.clientX;
        lastMoveY = e.clientY;
        const x = Math.min(startX, e.clientX);
        const y = Math.min(startY, e.clientY);
        const w = Math.abs(e.clientX - startX);
        const h = Math.abs(e.clientY - startY);
        if (state.drawOverlayEl) {
            state.drawOverlayEl.style.left = x + 'px';
            state.drawOverlayEl.style.top = y + 'px';
            state.drawOverlayEl.style.width = w + 'px';
            state.drawOverlayEl.style.height = h + 'px';
        }
        if (w > 2 || h > 2) {
            detectedParent = detectParent({ x, y, w, h });
            if (state.drawParentHighlightEl && detectedParent) {
                const pr = detectedParent.getBoundingClientRect();
                state.drawParentHighlightEl.style.display = 'block';
                state.drawParentHighlightEl.style.left = pr.left + 'px';
                state.drawParentHighlightEl.style.top = pr.top + 'px';
                state.drawParentHighlightEl.style.width = pr.width + 'px';
                state.drawParentHighlightEl.style.height = pr.height + 'px';
            }
        }
    }
    function onUp(e: PointerEvent) {
        e.preventDefault();
        e.stopImmediatePropagation();
        activeDoc?.removeEventListener('pointermove', onMove, true);
        activeDoc?.removeEventListener('pointerup', onUp, true);
        const w = Math.abs(e.clientX - startX);
        const h = Math.abs(e.clientY - startY);
        if (state.drawOverlayEl) state.drawOverlayEl.style.display = 'none';
        if (state.drawParentHighlightEl) state.drawParentHighlightEl.style.display = 'none';
        if (w < 5 && h < 5) {
            cleanup();
            return;
        }
        const x = Math.min(startX, e.clientX);
        const y = Math.min(startY, e.clientY);
        const parent = detectedParent ?? getDocumentBody(activeDoc ?? getPrimaryDocument());
        const parentId = getId(parent);
        cleanup();
        onDraw(parentId, { x, y, w: Math.round(w), h: Math.round(h) });
    }
    function cleanup() {
        clearCursorOnTargetDocuments();
        for (const remove of cleanupFns) remove();
        activeDoc?.removeEventListener('pointermove', onMove, true);
        activeDoc?.removeEventListener('pointerup', onUp, true);
        activeDoc?.removeEventListener('keydown', onSpaceDown, true);
        activeDoc?.removeEventListener('keyup', onSpaceUp, true);
        if (state.drawOverlayEl) state.drawOverlayEl.style.display = 'none';
        if (state.drawParentHighlightEl) state.drawParentHighlightEl.style.display = 'none';
        state.drawCleanup = null;
        spaceHeld = false;
        isDragging = false;
        activeDoc = null;
    }
    const cleanupFns = [
        ...addDocumentListeners('pointerdown', onDown as any, true),
        ...addDocumentListeners('mousedown', suppress as any, true),
        ...addDocumentListeners('mouseup', suppress as any, true),
        ...addDocumentListeners('click', suppress as any, true),
    ];
    setCursorOnTargetDocuments('crosshair');
    state.drawCleanup = cleanup;
}

export function stopDrawMode(): void {
    if (state.drawCleanup) state.drawCleanup();
}

function cleanupOverlays(): void {
    setOverlayBlocking(false);
    if (state.highlightEl) {
        state.highlightEl.remove();
        state.highlightEl = null;
    }
    if (state._selectRaf) {
        cancelAnimationFrame(state._selectRaf);
        state._selectRaf = 0;
    }
    if (state.selectEl) {
        state.selectEl.remove();
        state.selectEl = null;
    }
    if (state.layoutBoxEl) {
        state.layoutBoxEl.remove();
        state.layoutBoxEl = null;
    }
    if (state.scrollCleanup) {
        state.scrollCleanup();
        state.scrollCleanup = null;
    }
    clearMultiSelectOverlays();
    if (state.pickerCleanup) state.pickerCleanup();
    if (state.drawCleanup) state.drawCleanup();
    if (state.drawOverlayEl) {
        state.drawOverlayEl.remove();
        state.drawOverlayEl = null;
    }
    if (state.drawParentHighlightEl) {
        state.drawParentHighlightEl.remove();
        state.drawParentHighlightEl = null;
    }
    if (state.pickerMarqueeEl) {
        state.pickerMarqueeEl.remove();
        state.pickerMarqueeEl = null;
    }
    if (state.inlineEditCleanup) {
        state.inlineEditCleanup();
        state.inlineEditCleanup = null;
    }
    if (state.observer) {
        state.observer.disconnect();
        state.observer = null;
    }
    if (state.reorderLineEl) {
        state.reorderLineEl.remove();
        state.reorderLineEl = null;
    }
    if (state.reorderGhostEl) {
        state.reorderGhostEl.remove();
        state.reorderGhostEl = null;
    }
    cleanupPrompt();
    deactivateControls();
}

export function isInlineEditActive(): boolean {
    return state.inlineEditActive;
}

export function startInlineEdit(callbacks: {
    onSelect: (id: number) => void;
    onResult: (result: { id: number; oldText: string; newText: string }) => void;
}): void {
    if (state.pickerCleanup || state.inlineEditActive) return;
    if (state.inlineEditCleanup) state.inlineEditCleanup();
    function hasTextContent(el: Element): boolean {
        for (let i = 0; i < el.childNodes.length; i++) {
            if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent?.trim()) return true;
        }
        return false;
    }
    function getTextNodes(el: Element): ChildNode[] {
        const result: ChildNode[] = [];
        for (let i = 0; i < el.childNodes.length; i++) {
            if (el.childNodes[i].nodeType === 3) result.push(el.childNodes[i]);
        }
        return result;
    }
    function readText(el: Element): string {
        return getTextNodes(el)
            .map((n) => n.textContent)
            .join('');
    }
    function beginEdit(el: Element) {
        if (state._inlineCommit) state._inlineCommit();
        state.inlineEditActive = true;
        setOverlayBlocking(false);
        const id = getId(el);
        callbacks.onSelect(id);
        const savedNodes = getTextNodes(el).map((n) => ({ node: n, text: n.textContent }));
        const originalText = readText(el);
        const htmlEl = el as HTMLElement;
        htmlEl.contentEditable = 'true';
        htmlEl.style.outline = '2px solid rgba(111,168,220,0.7)';
        htmlEl.focus();
        const sel = el.ownerDocument.defaultView?.getSelection();
        const range = el.ownerDocument.createRange();
        const textNodes = getTextNodes(el);
        if (textNodes.length > 0) {
            range.setStart(textNodes[0], 0);
            range.setEnd(textNodes[textNodes.length - 1], textNodes[textNodes.length - 1].textContent!.length);
        } else {
            range.selectNodeContents(el);
        }
        sel?.removeAllRanges();
        sel?.addRange(range);
        function commit() {
            if (!state.inlineEditActive || state._inlineCommit !== commit) return;
            const newText = readText(el);
            htmlEl.contentEditable = 'false';
            htmlEl.style.outline = '';
            el.removeEventListener('keydown', onKey, true);
            el.removeEventListener('blur', onBlur, true);
            state.inlineEditActive = false;
            state._inlineCommit = null;
            setOverlayBlocking(true);
            callbacks.onResult({ id, oldText: originalText, newText });
        }
        function cancel() {
            for (const s of savedNodes) s.node.textContent = s.text;
            htmlEl.contentEditable = 'false';
            htmlEl.style.outline = '';
            el.removeEventListener('keydown', onKey, true);
            el.removeEventListener('blur', onBlur, true);
            state.inlineEditActive = false;
            state._inlineCommit = null;
            setOverlayBlocking(true);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commit();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        }
        function onBlur() {
            commit();
        }
        state._inlineCommit = commit;
        el.addEventListener('keydown', onKey, true);
        el.addEventListener('blur', onBlur, true);
    }
    function onClick(e: Event) {
        if (state.pickerCleanup) return;
        if (state.inlineEditActive) return;
        const target = e.target as Element;
        if (isOverlay(target)) return;
        const me = e as MouseEvent;
        const sourceDoc = target.ownerDocument ?? getPrimaryDocument();
        const el = getDocumentElementAtPoint(sourceDoc, me.clientX, me.clientY);
        if (!el) return;
        if (state.selectedId) {
            const selEl = getEl(state.selectedId);
            if (selEl && (selEl === el || selEl.contains(el))) {
                e.preventDefault();
            }
        }
    }
    function onDblClick(e: Event) {
        if (state.pickerCleanup || state.inlineEditActive) return;
        const target = e.target as Element;
        if (isOverlay(target)) return;
        if ((target as any).closest?.('[data-cs-visual-control]')) return;
        const me = e as MouseEvent;
        const sourceDoc = target.ownerDocument ?? getPrimaryDocument();
        const el = getDocumentElementAtPoint(sourceDoc, me.clientX, me.clientY);
        if (!el) return;
        if (!hasTextContent(el)) return;
        e.preventDefault();
        e.stopPropagation();
        beginEdit(el);
    }
    const clickCleanups = [
        ...addDocumentListeners('click', onClick, true),
        ...addDocumentListeners('dblclick', onDblClick, true),
    ];
    state.inlineEditCleanup = () => {
        for (const cleanup of clickCleanups) cleanup();
        state.inlineEditCleanup = null;
        state.inlineEditActive = false;
    };
}

export function stopInlineEdit(): void {
    if (state.inlineEditCleanup) state.inlineEditCleanup();
}

export function observeBody(onDirty: () => void): void {
    if (state._bodyObserver) state._bodyObserver.disconnect();
    if (state._bodyDirtyTimer) {
        clearTimeout(state._bodyDirtyTimer);
        state._bodyDirtyTimer = null;
    }
    state._bodyObserver = new MutationObserver(() => {
        if (state.reorderActive) return;
        if (!onDirty) return;
        if (state._bodyDirtyTimer) clearTimeout(state._bodyDirtyTimer);
        state._bodyDirtyTimer = setTimeout(() => {
            state._bodyDirtyTimer = null;
            state.previewEls.forEach((el) => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            state.previewEls.clear();
            state.localInsertedEls.forEach((el) => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            state.localInsertedEls.clear();
            onDirty();
        }, 500);
    });
    const doc = getPrimaryDocument();
    const body = doc.body;
    if (body) {
        state._bodyObserver.observe(body, { childList: true, subtree: true });
    }
}

export function removeElement(id: number): boolean {
    const el = getEl(id);
    if (!el || !el.parentNode) return false;
    el.parentNode.removeChild(el);
    state.elements.delete(id);
    return true;
}

export function detachElement(id: number): Element | null {
    const el = getEl(id);
    if (!el || !el.parentNode) return null;
    if (state._bodyObserver) state._bodyObserver.disconnect();
    el.parentNode.removeChild(el);
    state.elements.delete(id);
    const body = el.ownerDocument.body;
    if (state._bodyObserver && body) {
        state._bodyObserver.observe(body, { childList: true, subtree: true });
    }
    return el;
}

export function getNextSiblingId(id: number): number | null {
    const el = getEl(id);
    if (!el) return null;
    let sib = el.nextElementSibling;
    while (sib && isOverlay(sib)) sib = sib.nextElementSibling;
    return sib ? getId(sib) : null;
}

export function reinsertElement(element: Element, parentId: number, beforeSiblingId: number | null): number | null {
    const parent = getEl(parentId);
    if (!parent) return null;
    if (state._bodyObserver) state._bodyObserver.disconnect();
    const before = beforeSiblingId !== null ? getEl(beforeSiblingId) ?? null : null;
    if (before && before.parentNode === parent) {
        parent.insertBefore(element, before);
    } else {
        parent.appendChild(element);
    }
    const body = parent.ownerDocument.body;
    if (state._bodyObserver && body) {
        state._bodyObserver.observe(body, { childList: true, subtree: true });
    }
    return getId(element);
}

export function replaceTag(id: number, newTag: string): number | null {
    const el = getEl(id);
    if (!el || !el.parentNode) return null;
    const newEl = el.ownerDocument.createElement(newTag);
    for (let i = 0; i < el.attributes.length; i++) {
        newEl.setAttribute(el.attributes[i].name, el.attributes[i].value);
    }
    newEl.style.cssText = (el as HTMLElement).style.cssText;
    while (el.firstChild) newEl.appendChild(el.firstChild);
    el.parentNode.replaceChild(newEl, el);
    state.elements.delete(id);
    return getId(newEl);
}

export function findInsertionSibling(
    parentId: number,
    rect: { x: number; y: number; w: number; h: number },
): number | null {
    const parent = getEl(parentId);
    if (!parent) return null;
    const children = Array.from(parent.children).filter((c) => !isOverlay(c));
    if (children.length === 0) return null;
    const style = getComputedStyle(parent);
    const isFlexRow =
        style.display.includes('flex') &&
        (style.flexDirection === 'row' || style.flexDirection === 'row-reverse');
    const centerX = rect.x + rect.w / 2;
    const centerY = rect.y + rect.h / 2;
    for (const child of children) {
        const cr = child.getBoundingClientRect();
        const childCenter = isFlexRow ? cr.left + cr.width / 2 : cr.top + cr.height / 2;
        const drawnCenter = isFlexRow ? centerX : centerY;
        if (childCenter > drawnCenter) return getId(child);
    }
    return null;
}

export function addChildElement(parentId: number, tag: string, beforeId?: number | null): number | null {
    const parent = getEl(parentId);
    if (!parent) return null;
    if (state._bodyObserver) state._bodyObserver.disconnect();
    const newEl = parent.ownerDocument.createElement(tag);
    newEl.style.width = '100px';
    newEl.style.height = '100px';
    const before = beforeId != null ? getEl(beforeId) ?? null : null;
    if (before && before.parentNode === parent) {
        parent.insertBefore(newEl, before);
    } else {
        parent.appendChild(newEl);
    }
    state.localInsertedEls.add(newEl);
    const body = parent.ownerDocument.body;
    if (state._bodyObserver && body) {
        state._bodyObserver.observe(body, { childList: true, subtree: true });
    }
    return getId(newEl);
}

export function addSiblingElement(siblingId: number, tag: string): number | null {
    const sibling = getEl(siblingId);
    if (!sibling || !sibling.parentNode) return null;
    if (state._bodyObserver) state._bodyObserver.disconnect();
    const newEl = sibling.ownerDocument.createElement(tag);
    newEl.style.width = '100px';
    newEl.style.height = '100px';
    sibling.parentNode.insertBefore(newEl, sibling.nextSibling);
    state.localInsertedEls.add(newEl);
    const body = sibling.ownerDocument.body;
    if (state._bodyObserver && body) {
        state._bodyObserver.observe(body, { childList: true, subtree: true });
    }
    return getId(newEl);
}

export function duplicateElement(id: number): number | null {
    const el = getEl(id);
    if (!el || !el.parentNode) return null;
    if (state._bodyObserver) state._bodyObserver.disconnect();
    const clone = el.cloneNode(true) as Element;
    el.parentNode.insertBefore(clone, el.nextSibling);
    state.localInsertedEls.add(clone);
    const body = el.ownerDocument.body;
    if (state._bodyObserver && body) {
        state._bodyObserver.observe(body, { childList: true, subtree: true });
    }
    return getId(clone);
}

export function moveElement(id: number, newParentId: number, beforeSiblingId: number | null): boolean {
    const el = getEl(id);
    const parent = getEl(newParentId);
    if (!el || !parent) return false;
    if (el.contains(parent)) return false;
    const before = beforeSiblingId !== null ? getEl(beforeSiblingId) ?? null : null;
    if (state._bodyObserver) state._bodyObserver.disconnect();
    parent.insertBefore(el, before);
    const body = parent.ownerDocument.body;
    if (state._bodyObserver && body) {
        state._bodyObserver.observe(body, { childList: true, subtree: true });
    }
    return true;
}

export function getParentId(id: number): number | null {
    const el = getEl(id);
    if (!el || !el.parentElement) return null;
    if (isOverlay(el.parentElement)) return null;
    return getId(el.parentElement);
}

export function getSiblingIds(parentId: number): number[] {
    const parent = getEl(parentId);
    if (!parent) return [];
    const ids: number[] = [];
    for (let i = 0; i < parent.children.length; i++) {
        const child = parent.children[i];
        if (!isOverlay(child)) ids.push(getId(child));
    }
    return ids;
}

export function getFlexInfo(id: number): { isFlex: boolean; direction: string } | null {
    const el = getEl(id);
    if (!el) return null;
    const style = getComputedStyle(el);
    const display = style.display;
    const isFlex = display === 'flex' || display === 'inline-flex';
    return { isFlex, direction: isFlex ? style.flexDirection : '' };
}

export function getChildRectsAndIds(parentId: number): { id: number; rect: DOMRect }[] {
    const parent = getEl(parentId);
    if (!parent) return [];
    const result: { id: number; rect: DOMRect }[] = [];
    for (let i = 0; i < parent.children.length; i++) {
        const child = parent.children[i];
        if (!isOverlay(child)) {
            result.push({ id: getId(child), rect: child.getBoundingClientRect() });
        }
    }
    return result;
}

export function showReorderLine(rect: { x: number; y: number; w: number; h: number }): void {
    if (!state.reorderLineEl) {
        const doc = getPrimaryDocument();
        state.reorderLineEl = createOverlayElement(
            doc,
            'div',
            'position:fixed;pointer-events:none;z-index:2147483641;background:rgba(111,168,220,0.7);border-radius:1px;',
        );
    }
    const s = state.reorderLineEl.style;
    s.display = 'block';
    s.left = rect.x + 'px';
    s.top = rect.y + 'px';
    s.width = rect.w + 'px';
    s.height = rect.h + 'px';
}

export function hideReorderLine(): void {
    if (state.reorderLineEl) state.reorderLineEl.style.display = 'none';
}

export function showReorderGhost(id: number): void {
    const el = getEl(id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const doc = el.ownerDocument;
    state.reorderGhostEl = ensureOverlayElement(
        state.reorderGhostEl,
        doc,
        () =>
            createOverlayElement(
                doc,
                'div',
                'position:fixed;pointer-events:none;z-index:2147483638;background:rgba(111,168,220,0.15);border-radius:4px;',
            ),
    );
    const s = state.reorderGhostEl.style;
    s.display = 'block';
    s.left = r.left + 'px';
    s.top = r.top + 'px';
    s.width = r.width + 'px';
    s.height = r.height + 'px';
}

export function hideReorderGhost(): void {
    if (state.reorderGhostEl) state.reorderGhostEl.style.display = 'none';
}

export function startDragTransform(id: number): void {
    const el = getEl(id);
    if (!el) return;
    state.reorderActive = true;
    deactivateControls();
    (el as HTMLElement).style.position = 'relative';
    (el as HTMLElement).style.zIndex = '2147483642';
    (el as HTMLElement).style.pointerEvents = 'none';
    (el as HTMLElement).style.opacity = '0.9';
    (el as HTMLElement).style.transition = 'none';
}

let _savedAbsTransform: string | null = null;

export function updateDragTransform(id: number, dx: number, dy: number): void {
    const el = getEl(id);
    if (!el) return;
    const base = _savedAbsTransform;
    (el as HTMLElement).style.transform = base
        ? `translate(${dx}px, ${dy}px) ${base}`
        : `translate(${dx}px, ${dy}px)`;
}

export function clearDragTransform(id: number): void {
    const el = getEl(id);
    if (!el) return;
    (el as HTMLElement).style.position = '';
    (el as HTMLElement).style.zIndex = '';
    (el as HTMLElement).style.pointerEvents = '';
    (el as HTMLElement).style.opacity = '';
    (el as HTMLElement).style.transform = '';
    (el as HTMLElement).style.transition = '';
    state.reorderActive = false;
}

export function getAbsolutePositionInfo(id: number): {
    isAbsolute: boolean;
    useBottom: boolean;
    useRight: boolean;
    computedTop: number;
    computedLeft: number;
    computedBottom: number;
    computedRight: number;
} | null {
    const el = getEl(id);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const isAbsolute = cs.position === 'absolute';
    return {
        isAbsolute,
        useBottom: (el as HTMLElement).style.bottom !== '',
        useRight: (el as HTMLElement).style.right !== '',
        computedTop: parseFloat(cs.top) || 0,
        computedLeft: parseFloat(cs.left) || 0,
        computedBottom: parseFloat(cs.bottom) || 0,
        computedRight: parseFloat(cs.right) || 0,
    };
}

export function getElementRect(id: number): DOMRect | null {
    const el = getEl(id);
    if (!el) return null;
    return el.getBoundingClientRect();
}

export function getElementQuadById(id: number): ReturnType<typeof getElementQuad> | null {
    const el = getEl(id);
    if (!el) return null;
    return getElementQuad(el);
}

export function startAbsDragTransform(id: number): void {
    const el = getEl(id);
    if (!el) return;
    state.reorderActive = true;
    suspendControls();
    _savedAbsTransform = (el as HTMLElement).style.transform || null;
    (el as HTMLElement).style.zIndex = '2147483642';
    (el as HTMLElement).style.pointerEvents = 'none';
    (el as HTMLElement).style.opacity = '0.9';
    (el as HTMLElement).style.transition = 'none';
}

export function clearAbsDragTransform(id: number): void {
    const el = getEl(id);
    if (!el) return;
    (el as HTMLElement).style.zIndex = '';
    (el as HTMLElement).style.pointerEvents = '';
    (el as HTMLElement).style.opacity = '';
    (el as HTMLElement).style.transform = _savedAbsTransform || '';
    (el as HTMLElement).style.transition = '';
    _savedAbsTransform = null;
    state.reorderActive = false;
    resumeControls();
}

export function syncThemeToPage(vars: Record<string, string>): void {
    state.theme = vars;
    if (state.promptIconEl) {
        state.promptIconEl.style.background = vars.layer || '#1e1e2e';
        state.promptIconEl.style.borderColor = vars.border || '#313244';
        state.promptIconEl.style.color = vars.white || '#cdd6f4';
    }
}

export function showPromptIcon(onClick?: (id: number) => void): void {
    if (state.promptIconEl) return;
    state._promptIconCallback = onClick ?? null;
    const t = state.theme || {};
    const bg = t.layer || '#1e1e2e';
    const border = t.border || '#313244';
    const fg = t.white || '#cdd6f4';
    const doc = getOverlayDocumentForElement(state.selectedId !== null ? getEl(state.selectedId) : null);
    const btn = doc.createElement('button');
    btn.style.cssText = `position:fixed;pointer-events:auto;z-index:1;width:28px;height:28px;border-radius:6px;border:1px solid ${border};background:${bg};color:${fg};cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);`;
    btn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M12 8v6"/><path d="M9 11h6"/></svg>';
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.selectedId !== null && state._promptIconCallback) {
            state._promptIconCallback(state.selectedId);
        }
    });
    const appendTarget = getDocumentRoot(doc);
    appendTarget.appendChild(btn);
    state.promptIconEl = btn;
}

export function hidePromptIcon(): void {
    cleanupPrompt();
}

export function startContextMenuListener(onMenu: (result: { id: number; x: number; y: number }) => void): void {
    if (state.contextMenuCleanup) return;
    function onContextMenu(e: MouseEvent) {
        if (state.selectedId === null) return;
        const sourceDoc = (e.target as Node | null)?.ownerDocument ?? getPrimaryDocument();
        const el = getDocumentElementAtPoint(sourceDoc, e.clientX, e.clientY);
        if (!el) return;
        const selEl = getEl(state.selectedId!);
        if (!selEl) return;
        if (selEl !== el && !selEl.contains(el)) return;
        e.preventDefault();
        if (onMenu) {
            const point = getHostPointForDocument(sourceDoc, e.clientX, e.clientY);
            onMenu({ id: state.selectedId!, x: point.x, y: point.y });
        }
    }
    const cleanupFns = addDocumentListeners('contextmenu', onContextMenu, true);
    state.contextMenuCleanup = () => {
        for (const cleanup of cleanupFns) cleanup();
        state.contextMenuCleanup = null;
    };
}

function stopContextMenuListener(): void {
    if (state.contextMenuCleanup) state.contextMenuCleanup();
}

let _idCounter = 0;
function nextId(): string {
    try {
        return crypto.randomUUID();
    } catch {
        return `kf-${++_idCounter}-${Date.now()}`;
    }
}

function parseKeyframeOffsets(keyText: string): number[] {
    return keyText
        .split(',')
        .map((part) => {
            const t = part.trim().toLowerCase();
            if (t === 'from') return 0;
            if (t === 'to') return 1;
            return parseFloat(t) / 100;
        })
        .filter((n) => !isNaN(n));
}

export function fetchKeyframes(): {
    name: string;
    stops: { id: string; offset: number; properties: Record<string, string>; easing?: string; isEdited: boolean }[];
    sourceHref: string | null;
    propertyNames: string[];
}[] {
    const result: ReturnType<typeof fetchKeyframes> = [];
    try {
        const sheets = getPrimaryDocument().styleSheets;
        for (let s = 0; s < sheets.length; s++) {
            try {
                const rules = sheets[s].cssRules;
                for (let r = 0; r < rules.length; r++) {
                    const rule = rules[r];
                    if (!(rule instanceof CSSKeyframesRule)) continue;
                    const stops: { id: string; offset: number; properties: Record<string, string>; easing?: string; isEdited: boolean }[] = [];
                    const propSet = new Set<string>();
                    for (let k = 0; k < rule.cssRules.length; k++) {
                        const kf = rule.cssRules[k] as CSSKeyframeRule;
                        const properties: Record<string, string> = {};
                        for (let p = 0; p < kf.style.length; p++) {
                            const prop = kf.style[p];
                            properties[prop] = kf.style.getPropertyValue(prop);
                            propSet.add(prop);
                        }
                        const offsets = parseKeyframeOffsets(kf.keyText);
                        for (const offset of offsets) {
                            stops.push({
                                id: nextId(),
                                offset,
                                properties: { ...properties },
                                easing: kf.style.getPropertyValue('animation-timing-function') || undefined,
                                isEdited: false,
                            });
                        }
                    }
                    stops.sort((a, b) => a.offset - b.offset);
                    result.push({
                        name: rule.name,
                        stops,
                        sourceHref: sheets[s].href,
                        propertyNames: Array.from(propSet),
                    });
                }
            } catch {
                //
            }
        }
    } catch {
        //
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
}

function parseCssTime(val: string): number {
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    if (val.endsWith('ms')) return num / 1000;
    return num;
}

export function fetchElementAnimations(id: number): {
    name: string;
    duration: number;
    delay: number;
    timingFunction: string;
    timeline: string;
    rangeStart: string;
    rangeEnd: string;
    fillMode: string;
    direction: string;
    iterationCount: string;
}[] {
    const el = getEl(id);
    if (!el) return [];
    const cs = getComputedStyle(el);
    const names = cs.animationName.split(',').map((s) => s.trim());
    if (names.length === 0 || (names.length === 1 && (!names[0] || names[0] === 'none'))) return [];
    const durations = cs.animationDuration.split(',').map((s) => s.trim());
    const delays = (cs.animationDelay || '').split(',').map((s) => s.trim());
    const timingFns = cs.getPropertyValue('animation-timing-function').split(',').map((s) => s.trim());
    const fillModes = cs.getPropertyValue('animation-fill-mode').split(',').map((s) => s.trim());
    const directions = cs.getPropertyValue('animation-direction').split(',').map((s) => s.trim());
    const iterations = cs.getPropertyValue('animation-iteration-count').split(',').map((s) => s.trim());
    const timelines = cs.getPropertyValue('animation-timeline').split(',').map((s) => s.trim());
    const rangeStarts = cs.getPropertyValue('animation-range-start').split(',').map((s) => s.trim());
    const rangeEnds = cs.getPropertyValue('animation-range-end').split(',').map((s) => s.trim());
    const result = [];
    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        if (!name || name === 'none') continue;
        result.push({
            name,
            duration: parseCssTime(durations[i % durations.length] || '0s'),
            delay: parseCssTime(delays[i % delays.length] || '0s'),
            timingFunction: timingFns[i % timingFns.length] || 'ease',
            timeline: timelines[i % timelines.length] || 'auto',
            rangeStart: rangeStarts[i % rangeStarts.length] || 'normal',
            rangeEnd: rangeEnds[i % rangeEnds.length] || 'normal',
            fillMode: fillModes[i % fillModes.length] || 'none',
            direction: directions[i % directions.length] || 'normal',
            iterationCount: iterations[i % iterations.length] || '1',
        });
    }
    return result;
}

export function previewKeyframes(
    id: number,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
): Animation | null {
    const el = getEl(id);
    if (!el) return null;
    cancelPreview();
    state.previewAnimation = (el as HTMLElement).animate(keyframes, options);
    return state.previewAnimation;
}

export function cancelPreview(): void {
    if (state.previewAnimation) {
        state.previewAnimation.cancel();
        state.previewAnimation = null;
    }
}

export function destroyBridge(): void {
    cancelPreview();
    cleanupOverlays();
    stopContextMenuListener();
    if (state._bodyObserver) {
        state._bodyObserver.disconnect();
        state._bodyObserver = null;
    }
    if (state._bodyDirtyTimer) {
        clearTimeout(state._bodyDirtyTimer);
        state._bodyDirtyTimer = null;
    }
    if (state._mutationTimer) {
        clearTimeout(state._mutationTimer);
        state._mutationTimer = null;
    }
    state.elements.clear();
    state.previewEls.clear();
    state.localInsertedEls.clear();
    state.nextId = 1;
    state.selectedId = null;
    state.inlineEditActive = false;
    state._promptIconCallback = null;
}

export const hasScrollTimelineApi = typeof (window as any).ScrollTimeline !== 'undefined';

export function findScrollContainer(el: Element, scroller: string): Element {
    if (scroller === 'self') return el;
    if (scroller === 'root') {
        return el.ownerDocument.scrollingElement || el.ownerDocument.documentElement;
    }
    let parent = el.parentElement;
    while (parent) {
        const style = getComputedStyle(parent);
        const overflowY = style.overflowY;
        const overflowX = style.overflowX;
        const isScrollable =
            (overflowY === 'auto' || overflowY === 'scroll' || overflowX === 'auto' || overflowX === 'scroll') &&
            (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth);
        if (isScrollable) return parent;
        parent = parent.parentElement;
    }
    return el.ownerDocument.scrollingElement || el.ownerDocument.documentElement;
}
