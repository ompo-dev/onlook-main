import { getIframeScale, mapPointToIframe, mapQuadToHost, mapRectToHost } from '../utils/iframe-coords';

const MSG_SOURCE = 'css-studio';

type PendingResolver = {
    resolve: (value: any) => void;
    reject: (reason?: unknown) => void;
    timer: ReturnType<typeof setTimeout>;
};

export interface HostMappedRect {
    id: number;
    rect: DOMRect;
}

export class ResponsiveBridgeProxy {
    private requestId = 0;
    private pending = new Map<number, PendingResolver>();
    private readyState = false;
    private readyResolve!: () => void;
    private readonly readyStatePromise: Promise<void>;
    private readonly listener: (event: MessageEvent) => void;

    private hoverResultHandler: ((id: number | null, rect: any) => void) | null = null;
    private pickHandler: ((id: number, selector?: string, rect?: any) => void) | null = null;
    private marqueePickHandler: ((ids: number[]) => void) | null = null;
    private elementClickHandler:
        | ((id: number, selector: string | undefined, x: number, y: number) => void)
        | null = null;
    private controlStyleChangeHandler: ((prop: string, val: string) => void) | null = null;
    private bodyDirtyHandler: (() => void) | null = null;
    private contentHeightHandler: ((height: number) => void) | null = null;
    private wheelHandler:
        | ((deltaX: number, deltaY: number, clientX: number, clientY: number, ctrlKey: boolean, metaKey: boolean) => void)
        | null = null;

    constructor(public readonly iframe: HTMLIFrameElement) {
        this.readyStatePromise = new Promise<void>((resolve) => {
            this.readyResolve = resolve;
        });

        this.listener = (event) => {
            if (event.source !== this.iframe.contentWindow) {
                return;
            }
            const msg = event.data;
            if (!msg || msg.source !== MSG_SOURCE) {
                return;
            }
            this.handleMessage(msg);
        };

        window.addEventListener('message', this.listener);
    }

    get ready() {
        return this.readyState;
    }

    get readyPromise() {
        return this.readyStatePromise;
    }

    private handleMessage(msg: any) {
        if (msg.requestId !== undefined && this.pending.has(msg.requestId)) {
            const pending = this.pending.get(msg.requestId);
            this.pending.delete(msg.requestId);
            pending?.resolve(msg);
        }

        switch (msg.evt) {
            case 'ready':
                this.readyState = true;
                this.readyResolve();
                break;
            case 'hoverResult':
                this.hoverResultHandler?.(msg.id ?? null, msg.rect ?? null);
                break;
            case 'picked':
                this.pickHandler?.(msg.id, msg.selector, msg.rect);
                break;
            case 'marqueePicked':
                this.marqueePickHandler?.(msg.ids ?? []);
                break;
            case 'elementClicked':
                this.elementClickHandler?.(msg.id, msg.selector, msg.x, msg.y);
                break;
            case 'controlStyleChange':
                this.controlStyleChangeHandler?.(msg.prop, msg.val);
                break;
            case 'bodyDirty':
                this.bodyDirtyHandler?.();
                break;
            case 'contentHeight':
                this.contentHeightHandler?.(msg.height);
                break;
            case 'wheel':
                this.wheelHandler?.(
                    msg.deltaX,
                    msg.deltaY,
                    msg.clientX,
                    msg.clientY,
                    !!msg.ctrlKey,
                    !!msg.metaKey,
                );
                break;
        }
    }

    private send(data: Record<string, unknown>) {
        this.iframe.contentWindow?.postMessage({ source: MSG_SOURCE, ...data }, '*');
    }

    private request<T = any>(data: Record<string, unknown>): Promise<T> {
        const id = ++this.requestId;
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Responsive bridge request timed out (cmd: ${String(data.cmd)})`));
            }, 10000);

            this.pending.set(id, {
                resolve: (value) => {
                    clearTimeout(timer);
                    resolve(value as T);
                },
                reject,
                timer,
            });

            this.send({ ...data, requestId: id });
        });
    }

    onHoverResult(cb: (id: number | null, rect: any) => void) {
        this.hoverResultHandler = cb;
    }

    onPick(cb: (id: number, selector?: string, rect?: any) => void) {
        this.pickHandler = cb;
    }

    onMarqueePick(cb: (ids: number[]) => void) {
        this.marqueePickHandler = cb;
    }

    onElementClick(cb: (id: number, selector: string | undefined, x: number, y: number) => void) {
        this.elementClickHandler = cb;
    }

    onControlStyleChange(cb: (prop: string, val: string) => void) {
        this.controlStyleChangeHandler = cb;
    }

    onBodyDirty(cb: () => void) {
        this.bodyDirtyHandler = cb;
    }

    onContentHeight(cb: (height: number) => void) {
        this.contentHeightHandler = cb;
    }

    onWheel(
        cb: (
            deltaX: number,
            deltaY: number,
            clientX: number,
            clientY: number,
            ctrlKey: boolean,
            metaKey: boolean,
        ) => void,
    ) {
        this.wheelHandler = cb;
    }

    hitTestHover(x: number, y: number) {
        this.send({ cmd: 'hitTestHover', x, y });
    }

    hitTestPick(x: number, y: number) {
        this.send({ cmd: 'hitTestPick', x, y });
    }

    async hitTestDrawParent(rect: { x: number; y: number; w: number; h: number }) {
        const res = await this.request<any>({
            cmd: 'hitTestDrawParent',
            x: rect.x,
            y: rect.y,
            w: rect.w,
            h: rect.h,
        });
        return {
            id: res.id as number,
            rect: res.rect,
            beforeId: (res.beforeId ?? null) as number | null,
            lineRect: res.lineRect ?? null,
        };
    }

    async fetchDomTree() {
        const res = await this.request<any>({ cmd: 'fetchDomTree' });
        return res.tree;
    }

    async fetchStyles(id: number) {
        const res = await this.request<any>({ cmd: 'fetchStyles', id });
        return res.styles;
    }

    async fetchDesignTokens() {
        const res = await this.request<any>({ cmd: 'fetchDesignTokens' });
        return res.tokens;
    }

    async fetchElementVariables(id: number) {
        const res = await this.request<any>({ cmd: 'fetchElementVariables', id });
        return res.vars;
    }

    async resolveSelector(selector: string) {
        const res = await this.request<any>({ cmd: 'resolveSelector', selector });
        return (res.id ?? null) as number | null;
    }

    async buildSelector(id: number) {
        const res = await this.request<any>({ cmd: 'buildSelector', id });
        return (res.selector ?? null) as string | null;
    }

    async getElementRect(id: number) {
        const res = await this.request<any>({ cmd: 'getElementRect', id });
        return res.rect ?? null;
    }

    setStyleProperty(id: number, prop: string, value: string) {
        this.send({ cmd: 'setStyleProperty', id, prop, value });
    }

    setAttribute(id: number, name: string, value: string) {
        this.send({ cmd: 'setAttribute', id, name, value });
    }

    removeAttribute(id: number, name: string) {
        this.send({ cmd: 'removeAttribute', id, name });
    }

    setTextContent(id: number, text: string) {
        this.send({ cmd: 'setTextContent', id, text });
    }

    setDocumentProperty(prop: string, value: string) {
        this.send({ cmd: 'setDocumentProperty', prop, value });
    }

    removeDocumentProperty(prop: string) {
        this.send({ cmd: 'removeDocumentProperty', prop });
    }

    selectElement(id: number) {
        this.send({ cmd: 'selectElement', id });
    }

    highlightElement(id: number | null) {
        this.send({ cmd: 'highlightElement', id });
    }

    startPicker() {
        this.send({ cmd: 'startPicker' });
    }

    stopPicker() {
        this.send({ cmd: 'stopPicker' });
    }

    showSyncedSelection(selector: string) {
        this.send({ cmd: 'showSyncedSelection', selector });
    }

    clearSyncedSelection() {
        this.send({ cmd: 'clearSyncedSelection' });
    }

    activateControls(id: number) {
        this.send({ cmd: 'activateControls', id });
    }

    deactivateControls() {
        this.send({ cmd: 'deactivateControls' });
    }

    ping() {
        this.send({ cmd: 'ping' });
    }

    async getHostElementRect(id: number) {
        const rect = await this.getElementRect(id);
        if (!rect) return null;
        const mapped = mapRectToHost(this.iframe, rect);
        return new DOMRect(mapped.x, mapped.y, mapped.width, mapped.height);
    }

    async getHostElementQuad(id: number) {
        const res = await this.request<any>({ cmd: 'getElementQuad', id });
        if (!res.quad) return null;
        return mapQuadToHost(this.iframe, res.quad);
    }

    async getFlexChildRects(id: number) {
        const res = await this.request<any>({ cmd: 'getFlexChildRects', id });
        return (res.rects ?? []) as any[];
    }

    async getChildRectsAndIdsHost(parentId: number): Promise<HostMappedRect[]> {
        const res = await this.request<any>({ cmd: 'getChildRectsAndIds', parentId });
        return ((res.items ?? []) as any[]).map((item) => {
            const mapped = mapRectToHost(this.iframe, item);
            return {
                id: item.id as number,
                rect: new DOMRect(mapped.x, mapped.y, mapped.width, mapped.height),
            };
        });
    }

    async getFlexInfo(id: number) {
        const res = await this.request<any>({ cmd: 'getFlexInfo', id });
        return res.info ?? null;
    }

    async getAbsolutePositionInfo(id: number) {
        const res = await this.request<any>({ cmd: 'getAbsolutePositionInfo', id });
        return res.info ?? null;
    }

    startDragTransform(id: number) {
        this.send({ cmd: 'startDragTransform', id });
    }

    updateDragTransform(id: number, dx: number, dy: number) {
        const { x: sx, y: sy } = getIframeScale(this.iframe);
        this.send({
            cmd: 'updateDragTransform',
            id,
            dx: dx * (1 / (sx || 1)),
            dy: dy * (1 / (sy || 1)),
        });
    }

    clearDragTransform(id: number) {
        this.send({ cmd: 'clearDragTransform', id });
    }

    startAbsDragTransform(id: number) {
        this.send({ cmd: 'startAbsDragTransform', id });
    }

    clearAbsDragTransform(id: number) {
        this.send({ cmd: 'clearAbsDragTransform', id });
    }

    getScale() {
        return getIframeScale(this.iframe);
    }

    async fetchPageMetadata() {
        const res = await this.request<any>({ cmd: 'fetchPageMetadata' });
        return res.metadata;
    }

    setPageMetadataField(field: string, value: string) {
        this.send({ cmd: 'setPageMetadataField', field, value });
    }

    async removeElement(id: number) {
        const res = await this.request<any>({ cmd: 'removeElement', id });
        return !!res.success;
    }

    async retainAndDetach(id: number) {
        const res = await this.request<any>({ cmd: 'retainAndDetach', id });
        return !!res.success;
    }

    async reinsertRetained(id: number, parentId: number, beforeSiblingId: number | null) {
        const res = await this.request<any>({ cmd: 'reinsertRetained', id, parentId, beforeSiblingId });
        return !!res.success;
    }

    addChildElement(parentId: number, tag: string, beforeId?: number | null) {
        return this.request({ cmd: 'addChildElement', parentId, tag, beforeId });
    }

    addSiblingElement(siblingId: number, tag: string) {
        return this.request({ cmd: 'addSiblingElement', siblingId, tag });
    }

    duplicateElement(id: number) {
        return this.request({ cmd: 'duplicateElement', id });
    }

    async replaceTag(id: number, newTag: string) {
        const res = await this.request<any>({ cmd: 'replaceTag', id, newTag });
        return (res.newId ?? null) as number | null;
    }

    async moveElement(id: number, newParentId: number, beforeSiblingId: number | null) {
        const res = await this.request<any>({ cmd: 'moveElement', id, newParentId, beforeSiblingId });
        return !!res.success;
    }

    async getParentId(id: number) {
        const res = await this.request<any>({ cmd: 'getParentId', id });
        return (res.id ?? null) as number | null;
    }

    async getNextSiblingId(id: number) {
        const res = await this.request<any>({ cmd: 'getNextSiblingId', id });
        return (res.id ?? null) as number | null;
    }

    async getSiblingIds(parentId: number) {
        const res = await this.request<any>({ cmd: 'getSiblingIds', parentId });
        return (res.ids ?? []) as number[];
    }

    previewKeyframes(id: number, keyframes: unknown, options: unknown, currentTime?: number) {
        this.send({ cmd: 'previewKeyframes', id, keyframes, options, currentTime });
    }

    scrubPreview(time: number) {
        this.send({ cmd: 'scrubPreview', time });
    }

    cancelPreview() {
        this.send({ cmd: 'cancelPreview' });
    }

    destroy() {
        window.removeEventListener('message', this.listener);
        for (const entry of this.pending.values()) {
            clearTimeout(entry.timer);
            entry.reject(new Error('Responsive bridge destroyed'));
        }
        this.pending.clear();
    }
}

export { mapPointToIframe };
