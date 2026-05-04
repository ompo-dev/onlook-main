import { getElementInfoById } from '../InPagePanel/element-info';
import { buildElementSelector } from '../state/dom-bridge';
import { useStore } from '../state/use-store';
import type { EditChange } from '../state/slices/edit-slice';
import type { TaskAttachment, TaskMessage, TaskPayload, TaskViewport } from '../state/slices/tasks-slice';

export function resolveElementAttachment(nodeId: number, label?: string): TaskAttachment {
    const info = getElementInfoById(nodeId);
    const hostSelector = useStore.getState().responsiveMode ? null : buildElementSelector(nodeId);
    const selector = hostSelector ?? info.element;

    return {
        selector,
        path: info.path,
        children: info.children,
        component: info.component,
        source: info.source,
        nodeId,
        label: label ?? info.element,
    };
}

interface TaskElementRef {
    nodeId: number;
    label?: string;
}

interface TaskMessageInput {
    id: string;
    role: string;
    text: string;
    viewport: TaskViewport;
    timestamp: number;
    isError?: boolean;
    elements?: TaskElementRef[];
}

interface BuildTaskPayloadInput {
    id: string;
    kind: string;
    prompt: string;
    url: string;
    createdAt: number;
    attachedElements: TaskElementRef[];
    edits: EditChange[];
    messages: TaskMessageInput[];
    imageAttachments?: unknown[];
}

function buildAttachments(refs: TaskElementRef[]) {
    const attachments: TaskAttachment[] = [];
    const indexByNodeId = new Map<number, number>();

    for (const ref of refs) {
        if (indexByNodeId.has(ref.nodeId)) {
            continue;
        }
        indexByNodeId.set(ref.nodeId, attachments.length);
        attachments.push(resolveElementAttachment(ref.nodeId, ref.label));
    }

    return { attachments, indexByNodeId };
}

function translateEdit(change: EditChange, attachments: TaskAttachment[]) {
    let attachment = 0;

    if (change.element) {
        const target = change.path ? `${change.path} > ${change.element}` : change.element;
        const foundIndex = attachments.findIndex((item) => {
            const composed = item.path ? `${item.path} > ${item.selector}` : item.selector;
            return composed === target || item.selector === change.element;
        });

        if (foundIndex !== -1) {
            attachment = foundIndex;
        }
    }

    return { ...change, attachment };
}

export function buildTaskPayload(input: BuildTaskPayloadInput): TaskPayload {
    const allRefs = [...input.attachedElements];
    for (const message of input.messages) {
        if (!message.elements) {
            continue;
        }
        for (const element of message.elements) {
            allRefs.push(element);
        }
    }

    const { attachments, indexByNodeId } = buildAttachments(allRefs);
    const edits = input.edits.map((change) => translateEdit(change, attachments));
    const messages: TaskMessage[] = input.messages.map((message) => {
        const attachmentIndices: number[] = [];
        if (message.elements) {
            for (const ref of message.elements) {
                const index = indexByNodeId.get(ref.nodeId);
                if (index !== undefined && !attachmentIndices.includes(index)) {
                    attachmentIndices.push(index);
                }
            }
        }

        return {
            id: message.id,
            role: message.role,
            text: message.text,
            attachments: attachmentIndices,
            viewport: message.viewport,
            timestamp: message.timestamp,
            isError: message.isError,
        };
    });

    return {
        id: input.id,
        kind: input.kind,
        prompt: input.prompt,
        url: input.url,
        attachments,
        imageAttachments: input.imageAttachments ?? [],
        edits,
        messages,
        createdAt: input.createdAt,
    };
}
