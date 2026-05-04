'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getStudioControlsLayer } from '../../host';
import { BrailleSpinner } from '../ChatTray/BrailleSpinner';
import { getElement, findReplacementElement, getId } from '../state/dom-bridge';
import { useStore } from '../state/use-store';
import styles from './TaskOverlays.module.css';
import { trackNodeRect } from '../utils/track-node-rect';

const EMPTY_IMPLEMENTING_VARIANTS: Record<string, string> = {};

function hasVariantsHtml(result: unknown) {
    if (!result || typeof result !== 'object') return false;
    const html = (result as { html?: unknown }).html;
    return typeof html === 'string' && html.length > 0;
}

function overlayMessage(task: any, isImplementing = false) {
    const { kind } = task.payload;
    const status = task.status;
    if (isImplementing) return 'Implementing…';
    if (status === 'queued' || status === 'in-progress') {
        if (kind === 'variant') {
            return task.result ? 'Iterating variants…' : 'Generating variants…';
        }
        if (kind === 'responsive') return 'Adapting for viewport…';
        if (status === 'queued') return 'Queued…';
        return 'Working…';
    }
    if (kind === 'variant' && (status === 'ready' || status === 'awaiting')) {
        return hasVariantsHtml(task.result) ? 'Variants ready' : '';
    }
    return '';
}

function resolveVariantWrapperNodeId(taskId: string) {
    if (typeof document === 'undefined') return null;
    try {
        const wrapper = document.querySelector(
            `css-studio-variants[data-cs-task-id="${CSS.escape(taskId)}"]`,
        );
        if (!wrapper) return null;

        let anchor: Element | null = null;
        for (const child of Array.from(wrapper.children)) {
            if (child.localName === 'css-studio-variant' && child.hasAttribute('data-active')) {
                anchor = child;
                break;
            }
        }
        if (!anchor) {
            anchor = wrapper.firstElementChild;
        }
        return getId(anchor ?? wrapper);
    } catch {
        return null;
    }
}

function overlayTarget(task: any, isImplementing = false) {
    const firstNode = task.payload.attachments.find((a: any) => typeof a.nodeId === 'number')?.nodeId;
    if (typeof firstNode !== 'number' || firstNode < 0) return null;
    if (task.payload.kind === 'prompt') return null;
    if (isImplementing) return firstNode;
    if (task.payload.kind === 'variant' && (task.status === 'ready' || task.status === 'awaiting')) {
        return firstNode;
    }
    if (task.status === 'queued' || task.status === 'in-progress') return firstNode;
    return null;
}

function resolveOverlayNodeId(task: any, isImplementing = false) {
    const baseNodeId = overlayTarget(task, isImplementing);
    if (baseNodeId === null) return null;
    const live = getElement(baseNodeId);
    if (live && live.isConnected) return baseNodeId;

    const selector = task.payload.attachments.find((a: any) => typeof a.nodeId === 'number')?.selector;
    if (!selector || typeof document === 'undefined') return null;
    return findReplacementElement(selector, baseNodeId);
}

export function TaskOverlays({ bridge }: { bridge: any }) {
    const tasks = useStore((s: any) => s.tasks);
    const taskOrder = useStore((s: any) => s.taskOrder);
    const currentUrl = useStore((s: any) => s.currentUrl);
    const mcpStatus = useStore((s: any) => s.mcpStatus);
    const implementingVariants = useStore(
        (s: any) => s.implementingVariants ?? EMPTY_IMPLEMENTING_VARIANTS,
    );
    const setActiveTask = useStore((s: any) => s.setActiveTask);
    const requestChatFocus = useStore((s: any) => s.requestChatFocus);

    const layer = typeof document !== 'undefined' ? getStudioControlsLayer() : null;
    if (!layer) return null;

    const items: { taskId: string; nodeId: number; message: string; blocking: boolean }[] = [];
    for (const id of taskOrder as string[]) {
        const task = tasks[id];
        if (!task) continue;
        if (currentUrl && task.payload.url && task.payload.url !== currentUrl) continue;

        const selector = task.payload.attachments[0]?.selector;
        const isImplementing =
            task.payload.kind === 'variant' &&
            !!selector &&
            implementingVariants[selector] === 'pending';

        const baseNodeId = resolveOverlayNodeId(task, isImplementing);
        if (baseNodeId === null) continue;

        const variantWrapperNodeId =
            task.payload.kind === 'variant' ? resolveVariantWrapperNodeId(task.id) : null;
        if (task.payload.kind === 'variant' && variantWrapperNodeId !== null && !isImplementing) {
            continue;
        }

        const nodeId = variantWrapperNodeId ?? baseNodeId;
        const baseMessage = overlayMessage(task, isImplementing);
        if (!baseMessage) continue;
        const message =
            task.status === 'queued' && mcpStatus !== 'connected'
                ? 'Waiting for connection'
                : baseMessage;
        items.push({ taskId: id, nodeId, message, blocking: isImplementing });
    }

    if (items.length === 0) return null;

    const openTask = (taskId: string) => {
        setActiveTask(taskId);
        requestChatFocus();
    };

    return createPortal(
        items.map((item) => (
            <TaskOverlay
                key={item.taskId}
                nodeId={item.nodeId}
                message={item.message}
                blocking={item.blocking}
                bridge={bridge}
                onOpen={() => openTask(item.taskId)}
            />
        )),
        layer,
    );
}

function TaskOverlay({
    nodeId,
    message,
    blocking,
    bridge,
    onOpen,
}: {
    nodeId: number;
    message: string;
    blocking: boolean;
    bridge: any;
    onOpen: () => void;
}) {
    const wrapRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;

        return trackNodeRect(nodeId, bridge, (rect) => {
            if (!rect) {
                el.style.display = 'none';
                return;
            }
            el.style.display = 'flex';
            el.style.left = `${rect.x}px`;
            el.style.top = `${rect.y}px`;
            el.style.width = `${rect.width}px`;
            el.style.height = `${rect.height}px`;
            if (rect.hasTransform) {
                el.style.transform = rect.cssTransform;
                el.style.transformOrigin = '0 0';
            } else {
                el.style.transform = '';
                el.style.transformOrigin = '';
            }
        });
    }, [nodeId, bridge]);

    return (
        <div
            ref={wrapRef}
            data-cs-task-overlay=""
            data-cs-blocking={blocking || undefined}
            className={styles.wrap}
        >
            <button type="button" className={styles.pill} onClick={onOpen} title="Open task">
                <BrailleSpinner size={13} />
                <span className={styles.label}>{message}</span>
            </button>
        </div>
    );
}
