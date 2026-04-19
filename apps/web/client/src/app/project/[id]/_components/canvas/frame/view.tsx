'use client';

import type { IframeHTMLAttributes } from 'react';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { connect, WindowMessenger } from 'penpal';

import type { Frame } from '@onlook/models';
import type {
    PenpalChildMethods,
    PenpalParentMethods,
    PromisifiedPendpalChildMethods,
} from '@onlook/penpal';
import { PENPAL_PARENT_CHANNEL } from '@onlook/penpal';
import { WebPreview, WebPreviewBody } from '@onlook/ui/ai-elements';
import { cn } from '@onlook/ui/utils';

import { useEditorEngine } from '@/components/store/editor';
import { LOCAL_MODE_ENABLED } from '@/utils/local-mode';
import {
    getLocalPreviewIframeSrc,
    LOCAL_PREVIEW_PROXY_URL,
    resolveLocalPreviewFrameUrl,
} from '@/utils/local-mode/preview-url';

function logPenpalParent(...args: unknown[]) {
    const [message, data] = args;
    const prefix = `${PENPAL_PARENT_CHANNEL} -`;

    if (typeof message === 'string') {
        if (data === undefined) {
            console.log(`${prefix} ${message}`);
            return;
        }

        console.log(`${prefix} ${message}`, data);
        return;
    }

    console.log(prefix, ...args);
}

function getEffectiveSrc(url: string): string {
    if (!LOCAL_MODE_ENABLED || !url) return url;
    return getLocalPreviewIframeSrc(url);
}

async function registerProxyUpstream(url: string) {
    try {
        const upstreamUrl = resolveLocalPreviewFrameUrl(url);
        if (!upstreamUrl) {
            return;
        }

        const origin = new URL(upstreamUrl).origin;
        await fetch(`${LOCAL_PREVIEW_PROXY_URL}/__onlook_target`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: origin }),
        });
    } catch {
        // proxy server may not be running; ignore silently
    }
}

export type IFrameView = HTMLIFrameElement & {
    setZoomLevel: (level: number) => void;
    supportsOpenDevTools: () => boolean;
    reload: () => void;
    isLoading: () => boolean;
} & PromisifiedPendpalChildMethods;

const createSafeFallbackMethod = <T,>(
    methodName: string,
): ((..._args: any[]) => Promise<T>) => {
    return async () => {
        if (
            methodName.startsWith('get') ||
            methodName.includes('capture') ||
            methodName.includes('build')
        ) {
            return null as T;
        }
        if (methodName.includes('Count')) {
            return 0 as T;
        }
        if (methodName.includes('Editable') || methodName.includes('supports')) {
            return false as T;
        }
        return undefined as T;
    };
};

const createSafeFallbackMethods = (): PromisifiedPendpalChildMethods => {
    return {
        processDom: createSafeFallbackMethod('processDom'),
        getElementAtLoc: createSafeFallbackMethod('getElementAtLoc'),
        getElementByDomId: createSafeFallbackMethod('getElementByDomId'),
        setFrameId: createSafeFallbackMethod('setFrameId'),
        setBranchId: createSafeFallbackMethod('setBranchId'),
        getElementIndex: createSafeFallbackMethod('getElementIndex'),
        getComputedStyleByDomId: createSafeFallbackMethod('getComputedStyleByDomId'),
        updateElementInstance: createSafeFallbackMethod('updateElementInstance'),
        getFirstOnlookElement: createSafeFallbackMethod('getFirstOnlookElement'),
        setElementType: createSafeFallbackMethod('setElementType'),
        getElementType: createSafeFallbackMethod('getElementType'),
        getParentElement: createSafeFallbackMethod('getParentElement'),
        getChildrenCount: createSafeFallbackMethod('getChildrenCount'),
        getOffsetParent: createSafeFallbackMethod('getOffsetParent'),
        getActionLocation: createSafeFallbackMethod('getActionLocation'),
        getActionElement: createSafeFallbackMethod('getActionElement'),
        getInsertLocation: createSafeFallbackMethod('getInsertLocation'),
        getRemoveAction: createSafeFallbackMethod('getRemoveAction'),
        getTheme: createSafeFallbackMethod('getTheme'),
        setTheme: createSafeFallbackMethod('setTheme'),
        startDrag: createSafeFallbackMethod('startDrag'),
        drag: createSafeFallbackMethod('drag'),
        dragAbsolute: createSafeFallbackMethod('dragAbsolute'),
        endDragAbsolute: createSafeFallbackMethod('endDragAbsolute'),
        endDrag: createSafeFallbackMethod('endDrag'),
        endAllDrag: createSafeFallbackMethod('endAllDrag'),
        startEditingText: createSafeFallbackMethod('startEditingText'),
        editText: createSafeFallbackMethod('editText'),
        stopEditingText: createSafeFallbackMethod('stopEditingText'),
        updateStyle: createSafeFallbackMethod('updateStyle'),
        insertElement: createSafeFallbackMethod('insertElement'),
        removeElement: createSafeFallbackMethod('removeElement'),
        moveElement: createSafeFallbackMethod('moveElement'),
        groupElements: createSafeFallbackMethod('groupElements'),
        ungroupElements: createSafeFallbackMethod('ungroupElements'),
        insertImage: createSafeFallbackMethod('insertImage'),
        removeImage: createSafeFallbackMethod('removeImage'),
        isChildTextEditable: createSafeFallbackMethod('isChildTextEditable'),
        handleBodyReady: createSafeFallbackMethod('handleBodyReady'),
        captureScreenshot: createSafeFallbackMethod('captureScreenshot'),
        buildLayerTree: createSafeFallbackMethod('buildLayerTree'),
    };
};

interface FrameViewProps extends IframeHTMLAttributes<HTMLIFrameElement> {
    frame: Frame;
    reloadIframe: () => void;
    onConnectionFailed: () => void;
    onConnectionSuccess: () => void;
    onFrameLoad?: () => void;
    penpalTimeoutMs?: number;
    isInDragSelection?: boolean;
}

export const FrameComponent = observer(
    forwardRef<IFrameView, FrameViewProps>(
        (
            {
                frame,
                reloadIframe,
                onConnectionFailed,
                onConnectionSuccess,
                onFrameLoad,
                penpalTimeoutMs = 5000,
                isInDragSelection = false,
                ...restProps
            },
            ref,
        ) => {
            const { popover, ...props } = restProps;
            const editorEngine = useEditorEngine();
            const iframeRef = useRef<HTMLIFrameElement>(null);
            const zoomLevel = useRef(1);
            const isConnecting = useRef(false);
            const connectionRef = useRef<ReturnType<typeof connect> | null>(null);
            const [penpalChild, setPenpalChild] = useState<PenpalChildMethods | null>(null);
            const isSelected = editorEngine.frames.isSelected(frame.id);
            const isActiveBranch = editorEngine.branches.activeBranch.id === frame.branchId;

            const setupPenpalConnection = () => {
                try {
                    if (!allowConnection.current) {
                        console.log(
                            `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Skipping setup until local preview src is ready`,
                        );
                        return;
                    }

                    console.log(
                        `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Starting setup for ${effectiveSrc || frame.url || 'unknown src'}`,
                    );

                    if (!iframeRef.current?.contentWindow) {
                        console.error(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - No iframe found`);
                        onConnectionFailed();
                        return;
                    }

                    if (isConnecting.current) {
                        console.log(
                            `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Connection already in progress`,
                        );
                        return;
                    }
                    isConnecting.current = true;

                    // Destroy any existing connection
                    if (connectionRef.current) {
                        connectionRef.current.destroy();
                        connectionRef.current = null;
                    }

                    const messenger = new WindowMessenger({
                        remoteWindow: iframeRef.current.contentWindow,
                        allowedOrigins: ['*'],
                    });

                    const connection = connect({
                        messenger,
                        log: logPenpalParent,
                        methods: {
                            getFrameId: () => frame.id,
                            getBranchId: () => frame.branchId,
                            onWindowMutated: () => {
                                editorEngine.frameEvent.handleWindowMutated();
                            },
                            onWindowResized: () => {
                                editorEngine.frameEvent.handleWindowResized();
                            },
                            onDomProcessed: (data: {
                                layerMap: Record<string, any>;
                                rootNode: any;
                            }) => {
                                editorEngine.frameEvent.handleDomProcessed(frame.id, data);
                            },
                        } satisfies PenpalParentMethods,
                    });

                    connectionRef.current = connection;

                    const timeoutId = window.setTimeout(() => {
                        if (LOCAL_MODE_ENABLED) {
                            console.warn(
                                `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Penpal connection still pending after ${penpalTimeoutMs}ms`,
                            );
                            return;
                        }

                        isConnecting.current = false;
                        console.error(
                            `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Penpal connection timeout after ${penpalTimeoutMs}ms`,
                        );
                        onConnectionFailed();
                    }, penpalTimeoutMs);

                    connection.promise
                        .then((child) => {
                            clearTimeout(timeoutId);
                            isConnecting.current = false;
                            if (!child) {
                                console.error(
                                    `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Connection failed: child is null`,
                                );
                                onConnectionFailed();
                                return;
                            }

                            console.log(
                                `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Penpal connection set`,
                            );

                            const remote = child as unknown as PenpalChildMethods;
                            setPenpalChild(remote);
                            remote.setFrameId(frame.id);
                            remote.setBranchId(frame.branchId);
                            remote.handleBodyReady();
                            remote.processDom();

                            // Notify parent of successful connection
                            onConnectionSuccess();
                        })
                        .catch((error) => {
                            clearTimeout(timeoutId);
                            isConnecting.current = false;
                            console.error(
                                `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Failed to setup penpal connection:`,
                                error,
                            );
                            onConnectionFailed();
                        });
                } catch (error) {
                    isConnecting.current = false;
                    console.error(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Setup failed:`, error);
                    onConnectionFailed();
                }
            };

            const promisifyMethod = <T extends (...args: any[]) => any>(
                method: T | undefined,
            ): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
                return async (...args: Parameters<T>) => {
                    try {
                        if (!method) throw new Error('Method not initialized');
                        return method(...args);
                    } catch (error) {
                        console.error(
                            `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Method failed:`,
                            error,
                        );
                    }
                };
            };

            const remoteMethods = useMemo((): PromisifiedPendpalChildMethods => {
                if (!penpalChild) {
                    return createSafeFallbackMethods();
                }

                return {
                    processDom: promisifyMethod(penpalChild?.processDom),
                    getElementAtLoc: promisifyMethod(penpalChild?.getElementAtLoc),
                    getElementByDomId: promisifyMethod(penpalChild?.getElementByDomId),
                    setFrameId: promisifyMethod(penpalChild?.setFrameId),
                    setBranchId: promisifyMethod(penpalChild?.setBranchId),
                    getElementIndex: promisifyMethod(penpalChild?.getElementIndex),
                    getComputedStyleByDomId: promisifyMethod(penpalChild?.getComputedStyleByDomId),
                    updateElementInstance: promisifyMethod(penpalChild?.updateElementInstance),
                    getFirstOnlookElement: promisifyMethod(penpalChild?.getFirstOnlookElement),
                    setElementType: promisifyMethod(penpalChild?.setElementType),
                    getElementType: promisifyMethod(penpalChild?.getElementType),
                    getParentElement: promisifyMethod(penpalChild?.getParentElement),
                    getChildrenCount: promisifyMethod(penpalChild?.getChildrenCount),
                    getOffsetParent: promisifyMethod(penpalChild?.getOffsetParent),
                    getActionLocation: promisifyMethod(penpalChild?.getActionLocation),
                    getActionElement: promisifyMethod(penpalChild?.getActionElement),
                    getInsertLocation: promisifyMethod(penpalChild?.getInsertLocation),
                    getRemoveAction: promisifyMethod(penpalChild?.getRemoveAction),
                    getTheme: promisifyMethod(penpalChild?.getTheme),
                    setTheme: promisifyMethod(penpalChild?.setTheme),
                    startDrag: promisifyMethod(penpalChild?.startDrag),
                    drag: promisifyMethod(penpalChild?.drag),
                    dragAbsolute: promisifyMethod(penpalChild?.dragAbsolute),
                    endDragAbsolute: promisifyMethod(penpalChild?.endDragAbsolute),
                    endDrag: promisifyMethod(penpalChild?.endDrag),
                    endAllDrag: promisifyMethod(penpalChild?.endAllDrag),
                    startEditingText: promisifyMethod(penpalChild?.startEditingText),
                    editText: promisifyMethod(penpalChild?.editText),
                    stopEditingText: promisifyMethod(penpalChild?.stopEditingText),
                    updateStyle: promisifyMethod(penpalChild?.updateStyle),
                    insertElement: promisifyMethod(penpalChild?.insertElement),
                    removeElement: promisifyMethod(penpalChild?.removeElement),
                    moveElement: promisifyMethod(penpalChild?.moveElement),
                    groupElements: promisifyMethod(penpalChild?.groupElements),
                    ungroupElements: promisifyMethod(penpalChild?.ungroupElements),
                    insertImage: promisifyMethod(penpalChild?.insertImage),
                    removeImage: promisifyMethod(penpalChild?.removeImage),
                    isChildTextEditable: promisifyMethod(penpalChild?.isChildTextEditable),
                    handleBodyReady: promisifyMethod(penpalChild?.handleBodyReady),
                    captureScreenshot: promisifyMethod(penpalChild?.captureScreenshot),
                    buildLayerTree: promisifyMethod(penpalChild?.buildLayerTree),
                };
            }, [penpalChild]);

            useImperativeHandle(ref, (): IFrameView => {
                const iframe = iframeRef.current;
                if (!iframe) {
                    console.error(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Iframe - Not found`);
                    // Return safe fallback with no-op methods and safe defaults
                    const fallbackElement = document.createElement('iframe');
                    const safeFallback: IFrameView = Object.assign(fallbackElement, {
                        // Custom sync methods with safe no-op implementations
                        supportsOpenDevTools: () => false,
                        setZoomLevel: () => { },
                        reload: () => { },
                        isLoading: () => false,
                        // Reuse the safe fallback methods from remoteMethods
                        ...remoteMethods,
                    });
                    return safeFallback;
                }

                // Register the iframe with the editor engine
                editorEngine.frames.registerView(frame, iframe as IFrameView);

                const syncMethods = {
                    supportsOpenDevTools: () =>
                        !!iframe.contentWindow && 'openDevTools' in iframe.contentWindow,
                    setZoomLevel: (level: number) => {
                        zoomLevel.current = level;
                        iframe.style.transform = `scale(${level})`;
                        iframe.style.transformOrigin = 'top left';
                    },
                    reload: () => reloadIframe(),
                    isLoading: () => iframe.contentDocument?.readyState !== 'complete',
                };

                if (!penpalChild) {
                    return Object.assign(iframe, syncMethods, remoteMethods) as IFrameView;
                }

                return Object.assign(iframe, {
                    ...syncMethods,
                    ...remoteMethods,
                });
            }, [penpalChild, frame, iframeRef]);

            // In local mode, block connection until the real proxy URL is ready
            const allowConnection = useRef(!LOCAL_MODE_ENABLED);

            const [effectiveSrc, setEffectiveSrc] = useState<string>(() =>
                LOCAL_MODE_ENABLED ? '' : (frame.url ?? ''),
            );

            useEffect(() => {
                if (!LOCAL_MODE_ENABLED) {
                    setEffectiveSrc(frame.url ?? '');
                    return;
                }
                const url = frame.url;
                if (!url) return;
                registerProxyUpstream(url).then(() => {
                    const proxySrc = getEffectiveSrc(url);
                    // Reset connection state so the real load triggers a fresh Penpal handshake
                    if (connectionRef.current) {
                        connectionRef.current.destroy();
                        connectionRef.current = null;
                    }
                    isConnecting.current = false;
                    setPenpalChild(null);
                    allowConnection.current = true;
                    setEffectiveSrc(proxySrc);
                });
            }, [frame.url]);

            useEffect(() => {
                if (!LOCAL_MODE_ENABLED) {
                    return;
                }

                const handleMessage = (event: MessageEvent) => {
                    if (event.source !== iframeRef.current?.contentWindow) {
                        return;
                    }

                    console.log(`${PENPAL_PARENT_CHANNEL} - Raw message from iframe`, {
                        origin: event.origin,
                        data: event.data,
                    });
                };

                window.addEventListener('message', handleMessage);

                return () => {
                    window.removeEventListener('message', handleMessage);
                };
            }, []);

            useEffect(() => {
                return () => {
                    if (connectionRef.current) {
                        connectionRef.current.destroy();
                        connectionRef.current = null;
                    }
                    setPenpalChild(null);
                    isConnecting.current = false;
                };
            }, []);

            return (
                <WebPreview>
                    <WebPreviewBody
                        ref={iframeRef}
                        id={frame.id}
                        className={cn(
                            'outline outline-4 backdrop-blur-sm transition',
                            isActiveBranch && 'outline-teal-400',
                            isActiveBranch && !isSelected && 'outline-dashed',
                            !isActiveBranch && isInDragSelection && 'outline-teal-500',
                        )}
                        src={effectiveSrc}
                        sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads"
                        allow="geolocation; microphone; camera; midi; encrypted-media"
                        style={{ width: frame.dimension.width, height: frame.dimension.height }}
                        onLoad={() => {
                            console.log(
                                `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Iframe loaded ${effectiveSrc || frame.url || 'unknown src'}`,
                            );
                            onFrameLoad?.();
                            setupPenpalConnection();
                        }}
                        {...props}
                    />
                </WebPreview>
            );
        },
    ),
);
