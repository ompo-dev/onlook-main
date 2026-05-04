import { cancelFrame, frame } from 'motion-dom';
import { getElementQuad } from '../utils/element-quad';
import {
    activateControls,
    deactivateControls,
} from './visual-controls';
import {
    addChildElement,
    addSiblingElement,
    buildElementSelector,
    duplicateElement,
    fetchDesignTokens,
    fetchDomTree,
    fetchElementAnimations,
    fetchElementVariables,
    fetchKeyframes,
    fetchPageMetadata,
    fetchStyles,
    findInsertionSibling,
    getAbsolutePositionInfo,
    getChildRectsAndIds,
    getElement,
    getElementRect,
    getFlexInfo,
    getId,
    getNextSiblingId,
    getPageElementAtPoint,
    getParentId,
    getSiblingIds,
    getTheme,
    highlightElement,
    previewKeyframes,
    removeAttribute,
    removeDocumentProperty,
    removeElement,
    replaceTag,
    scrollElementIntoView,
    selectElement,
    setAttribute,
    setDocumentProperty,
    setPageMetadataField,
    setStyleProperty,
    setTextContent,
    startAbsDragTransform,
    startDragTransform,
    updateDragTransform,
    clearDragTransform,
    clearAbsDragTransform,
} from './dom-bridge';

const MSG_SOURCE = 'css-studio';

const retainedElements = new Map<number, Element>();

let syncedOverlay: HTMLDivElement | null = null;
let syncedTickFn: (() => void) | null = null;
let syncedElement: Element | null = null;

function post(data: Record<string, unknown>) {
    window.parent.postMessage({ source: MSG_SOURCE, ...data }, '*');
}

function clearSyncedSelection() {
    if (syncedTickFn) {
        cancelFrame(syncedTickFn);
    }
    syncedTickFn = null;
    syncedElement = null;
    syncedOverlay?.remove();
    syncedOverlay = null;
}

function showSyncedSelection(selector: string) {
    clearSyncedSelection();
    try {
        const el = document.querySelector(selector);
        if (!el) {
            return;
        }

        syncedElement = el;
        syncedOverlay = document.createElement('div');
        syncedOverlay.style.cssText =
            'position:fixed;pointer-events:none;z-index:2147483638;border:1.5px solid rgba(111,168,220,0.5);background:rgba(111,168,220,0.05);opacity:0.5;transition:none;';
        document.documentElement.appendChild(syncedOverlay);

        let lastLeft = Number.NaN;
        let lastTop = Number.NaN;
        let lastWidth = Number.NaN;
        let lastHeight = Number.NaN;

        const tick = () => {
            if (!syncedElement || !syncedOverlay) {
                return;
            }
            const rect = syncedElement.getBoundingClientRect();
            if (
                rect.left !== lastLeft ||
                rect.top !== lastTop ||
                rect.width !== lastWidth ||
                rect.height !== lastHeight
            ) {
                lastLeft = rect.left;
                lastTop = rect.top;
                lastWidth = rect.width;
                lastHeight = rect.height;
                frame.render(() => {
                    if (!syncedOverlay) return;
                    syncedOverlay.style.left = `${rect.left}px`;
                    syncedOverlay.style.top = `${rect.top}px`;
                    syncedOverlay.style.width = `${rect.width}px`;
                    syncedOverlay.style.height = `${rect.height}px`;
                });
            }
            frame.read(tick, true);
        };

        syncedTickFn = tick;
        frame.read(tick, true);
    } catch {
        clearSyncedSelection();
    }
}

function elementAtPoint(x: number, y: number) {
    const el = getPageElementAtPoint(x, y);
    if (el === syncedOverlay) {
        return null;
    }
    return el;
}

function computeInsertionLineRect(parentId: number, beforeId: number | null) {
    const parent = getElement(parentId);
    if (!parent) return null;
    const beforeEl = beforeId !== null ? getElement(beforeId) : null;

    if (beforeEl) {
        const rect = beforeEl.getBoundingClientRect();
        return {
            x: rect.left,
            y: rect.top - 1,
            w: rect.width,
            h: 2,
        };
    }

    const parentRect = parent.getBoundingClientRect();
    return {
        x: parentRect.left,
        y: parentRect.bottom - 2,
        w: parentRect.width,
        h: 2,
    };
}

function handleMessage(event: MessageEvent) {
    const msg = event.data;
    if (!msg || msg.source !== MSG_SOURCE) {
        return;
    }

    switch (msg.cmd) {
        case 'fetchDomTree':
            post({ evt: 'domTree', tree: fetchDomTree(), requestId: msg.requestId });
            break;
        case 'fetchStyles':
            post({ evt: 'styles', styles: fetchStyles(msg.id), requestId: msg.requestId });
            break;
        case 'fetchDesignTokens':
            post({ evt: 'designTokens', tokens: fetchDesignTokens(), requestId: msg.requestId });
            break;
        case 'fetchElementVariables':
            post({
                evt: 'elementVariables',
                vars: fetchElementVariables(msg.id),
                requestId: msg.requestId,
            });
            break;
        case 'setStyleProperty':
            setStyleProperty(msg.id, msg.prop, msg.value);
            break;
        case 'setAttribute':
            setAttribute(msg.id, msg.name, msg.value);
            break;
        case 'removeAttribute':
            removeAttribute(msg.id, msg.name);
            break;
        case 'setTextContent':
            setTextContent(msg.id, msg.text);
            break;
        case 'setDocumentProperty':
            setDocumentProperty(msg.prop, msg.value);
            break;
        case 'removeDocumentProperty':
            removeDocumentProperty(msg.prop);
            break;
        case 'selectElement':
            selectElement(msg.id);
            break;
        case 'highlightElement':
            highlightElement(msg.id);
            break;
        case 'showSyncedSelection':
            showSyncedSelection(msg.selector);
            break;
        case 'clearSyncedSelection':
            clearSyncedSelection();
            break;
        case 'hitTestHover': {
            const el = elementAtPoint(msg.x, msg.y);
            if (el) {
                const id = getId(el);
                const rect = el.getBoundingClientRect();
                post({
                    evt: 'hoverResult',
                    id,
                    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                });
            } else {
                post({ evt: 'hoverResult', id: null, rect: null });
            }
            break;
        }
        case 'hitTestDrawParent': {
            const { x, y, w, h } = msg;
            const cx = x + w / 2;
            const cy = y + h / 2;
            let candidate = elementAtPoint(cx, cy) ?? document.body;
            while (candidate && candidate !== document.body) {
                const rect = candidate.getBoundingClientRect();
                if (x >= rect.left && y >= rect.top && x + w <= rect.right && y + h <= rect.bottom) {
                    break;
                }
                candidate = candidate.parentElement ?? document.body;
            }
            const parent = candidate ?? document.body;
            const id = getId(parent);
            const rect = parent.getBoundingClientRect();
            const beforeId = findInsertionSibling(id, { x, y, w, h });
            const lineRect = computeInsertionLineRect(id, beforeId);
            post({
                evt: 'drawParentResult',
                id,
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                beforeId,
                lineRect,
                requestId: msg.requestId,
            });
            break;
        }
        case 'hitTestPick': {
            const el = elementAtPoint(msg.x, msg.y);
            if (!el) break;
            const id = getId(el);
            const selector = buildElementSelector(id);
            const rect = el.getBoundingClientRect();
            post({
                evt: 'picked',
                id,
                selector: selector ?? undefined,
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            });
            break;
        }
        case 'resolveSelector': {
            let resolvedId: number | null = null;
            try {
                const el = document.querySelector(msg.selector);
                if (el) {
                    resolvedId = getId(el);
                }
            } catch {}
            post({ evt: 'selectorResolved', id: resolvedId, requestId: msg.requestId });
            break;
        }
        case 'buildSelector':
            post({
                evt: 'selectorBuilt',
                selector: buildElementSelector(msg.id),
                requestId: msg.requestId,
            });
            break;
        case 'activateControls': {
            const el = getElement(msg.id);
            if (!el) break;
            const computed = getComputedStyle(el);
            const styles: Record<string, string> = {};
            for (let i = 0; i < computed.length; i += 1) {
                const prop = computed[i];
                if (prop) {
                    styles[prop] = computed.getPropertyValue(prop);
                }
            }
            activateControls(el, styles, getTheme() ?? {}, (prop, val) => {
                post({ evt: 'controlStyleChange', prop, val });
            });
            break;
        }
        case 'deactivateControls':
            deactivateControls();
            break;
        case 'getElementRect':
            post({ evt: 'elementRect', rect: getElementRect(msg.id), requestId: msg.requestId });
            break;
        case 'getElementQuad': {
            const el = getElement(msg.id);
            const quad = el ? getElementQuad(el) : null;
            post({
                evt: 'elementQuad',
                quad: quad
                    ? {
                          untransformedX: quad.untransformedX,
                          untransformedY: quad.untransformedY,
                          width: quad.width,
                          height: quad.height,
                          hasTransform: quad.hasTransform,
                          cssTransform: quad.cssTransform,
                          scaleX: quad.scaleX,
                          scaleY: quad.scaleY,
                          corners: quad.corners.map((corner) => ({ x: corner.x, y: corner.y })),
                      }
                    : null,
                requestId: msg.requestId,
            });
            break;
        }
        case 'fetchPageMetadata':
            post({ evt: 'pageMetadata', metadata: fetchPageMetadata(), requestId: msg.requestId });
            break;
        case 'setPageMetadataField':
            setPageMetadataField(msg.field, msg.value);
            break;
        case 'removeElement':
            post({ evt: 'elementRemoved', success: removeElement(msg.id), requestId: msg.requestId });
            break;
        case 'retainAndDetach': {
            const el = getElement(msg.id);
            if (el?.parentNode) {
                el.parentNode.removeChild(el);
                retainedElements.set(msg.id, el);
                post({ evt: 'elementRetained', success: true, requestId: msg.requestId });
            } else {
                post({ evt: 'elementRetained', success: false, requestId: msg.requestId });
            }
            break;
        }
        case 'reinsertRetained': {
            const el = retainedElements.get(msg.id);
            const parent = getElement(msg.parentId);
            if (el && parent) {
                const before =
                    msg.beforeSiblingId !== null ? getElement(msg.beforeSiblingId) ?? null : null;
                if (before?.parentNode === parent) {
                    parent.insertBefore(el, before);
                } else {
                    parent.appendChild(el);
                }
                retainedElements.delete(msg.id);
                post({ evt: 'elementReinserted', success: true, requestId: msg.requestId });
            } else {
                post({ evt: 'elementReinserted', success: false, requestId: msg.requestId });
            }
            break;
        }
        case 'addChildElement':
            void addChildElement(msg.parentId, msg.tag, msg.beforeId).then((result) =>
                post({ evt: 'childAdded', ...result, requestId: msg.requestId }),
            );
            break;
        case 'addSiblingElement':
            void addSiblingElement(msg.siblingId, msg.tag).then((result) =>
                post({ evt: 'siblingAdded', ...result, requestId: msg.requestId }),
            );
            break;
        case 'duplicateElement':
            void duplicateElement(msg.id).then((result) =>
                post({ evt: 'elementDuplicated', ...result, requestId: msg.requestId }),
            );
            break;
        case 'replaceTag':
            post({ evt: 'tagReplaced', newId: replaceTag(msg.id, msg.newTag), requestId: msg.requestId });
            break;
        case 'moveElement':
            post({
                evt: 'elementMoved',
                success: !!msg.id,
                requestId: msg.requestId,
            });
            break;
        case 'getParentId':
            post({ evt: 'parentId', id: getParentId(msg.id), requestId: msg.requestId });
            break;
        case 'getNextSiblingId':
            post({ evt: 'nextSiblingId', id: getNextSiblingId(msg.id), requestId: msg.requestId });
            break;
        case 'getSiblingIds':
            post({ evt: 'siblingIds', ids: getSiblingIds(msg.parentId), requestId: msg.requestId });
            break;
        case 'getChildRectsAndIds':
            post({
                evt: 'childRectsAndIds',
                items: getChildRectsAndIds(msg.parentId),
                requestId: msg.requestId,
            });
            break;
        case 'getFlexInfo':
            post({ evt: 'flexInfo', info: getFlexInfo(msg.id), requestId: msg.requestId });
            break;
        case 'getAbsolutePositionInfo':
            post({
                evt: 'absolutePositionInfo',
                info: getAbsolutePositionInfo(msg.id),
                requestId: msg.requestId,
            });
            break;
        case 'startDragTransform':
            startDragTransform(msg.id);
            break;
        case 'updateDragTransform':
            updateDragTransform(msg.id, msg.dx, msg.dy);
            break;
        case 'clearDragTransform':
            clearDragTransform(msg.id);
            break;
        case 'startAbsDragTransform':
            startAbsDragTransform(msg.id);
            break;
        case 'clearAbsDragTransform':
            clearAbsDragTransform(msg.id);
            break;
        case 'fetchKeyframes':
            post({ evt: 'keyframes', rules: fetchKeyframes(), requestId: msg.requestId });
            break;
        case 'fetchElementAnimations':
            post({
                evt: 'elementAnimations',
                animations: fetchElementAnimations(msg.id),
                requestId: msg.requestId,
            });
            break;
        case 'previewKeyframes':
            previewKeyframes(msg.id, msg.keyframes, msg.options, msg.currentTime);
            break;
        case 'scrubPreview':
            previewKeyframes(-1, [], { duration: 0 }, msg.time);
            break;
        case 'scrollIntoView':
            scrollElementIntoView(msg.id);
            break;
        case 'ping':
            post({ evt: 'ready' });
            break;
    }
}

export function startIframeAgent() {
    const listener = (event: MessageEvent) => handleMessage(event);
    window.addEventListener('message', listener);
    post({ evt: 'ready' });
    return () => {
        clearSyncedSelection();
        window.removeEventListener('message', listener);
    };
}
