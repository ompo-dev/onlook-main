import type { StateCreator } from 'zustand';
import type { EditChange } from './edit-slice';
import { appendChange } from '../utils/coalesce-edits';
import { safeRandomId } from '../utils/safe-random-id';

export interface TaskAttachment {
    selector: string;
    path: string;
    children: string[];
    component?: string;
    source?: string;
    nodeId: number;
    label: string;
}

export interface TaskViewport {
    width: number;
    height: number;
}

export interface TaskMessage {
    id: string;
    role: string;
    text: string;
    attachments: TaskAttachment[] | number[];
    viewport: TaskViewport;
    timestamp: number;
    isError?: boolean;
    pending?: boolean;
}

export interface TaskQuestion {
    askId: string;
    text: string;
    options?: string[];
    answered?: boolean;
    answer?: string;
}

export interface TaskPanic {
    reason: string;
    element?: string;
}

export interface TaskPayload {
    id: string;
    kind: string;
    prompt: string;
    url: string;
    attachments: TaskAttachment[];
    imageAttachments: unknown[];
    edits: EditChange[];
    messages: TaskMessage[];
    createdAt: number;
}

export interface TaskLocalFlags {
    pending?: boolean;
    queued?: boolean;
}

export interface TaskState {
    id: string;
    payload: TaskPayload;
    pendingEdits: EditChange[];
    status: string;
    updatedAt: number;
    localFlags?: Record<string, TaskLocalFlags>;
    localMessageImages?: Record<string, unknown[]>;
    localMessageEdits?: Record<string, EditChange[]>;
    responding?: boolean;
    verb?: string;
    error?: string;
    undoAnchor: unknown;
    drifted?: string;
    mountedOnce?: boolean;
    result?: unknown;
    expectedVariantCount?: number;
    name?: string;
    question?: TaskQuestion;
    panic?: TaskPanic;
    resolution?: string;
    leaseState?: string;
    draft?: {
        text: string;
        images: unknown[];
        pendingAttachments: { nodeId: number; label: string }[];
    };
}

export interface CreateTaskInput {
    id?: string;
    kind: string;
    prompt?: string;
    url?: string;
    attachments?: TaskAttachment[];
    initialUserMessage?: TaskMessage;
}

export interface TaskEvent {
    kind: string;
    [key: string]: unknown;
}

export interface TasksSlice {
    tasks: Record<string, TaskState>;
    taskOrder: string[];
    taskIdsByNode: Record<number, string[]>;
    currentUrl: string | null;
    setCurrentUrl: (url: string | null) => void;
    createTask: (init: CreateTaskInput) => string;
    appendTaskMessage: (taskId: string, msg: TaskMessage) => void;
    appendTaskAttachments: (taskId: string, attachments: TaskAttachment[]) => void;
    acknowledgeTaskMessages: (ids: string[]) => void;
    attachMessageImages: (taskId: string, messageId: string, images: unknown[]) => void;
    attachMessageEdits: (taskId: string, messageId: string, edits: EditChange[]) => void;
    setTaskStatus: (taskId: string, status: string, error?: string) => void;
    setTaskResponding: (taskId: string, responding: boolean) => void;
    setTaskUndoAnchor: (taskId: string, anchor: unknown) => void;
    setTaskDrifted: (taskId: string, drifted: string | null) => void;
    setTaskMountedOnce: (taskId: string, mounted: boolean) => void;
    setTaskResult: (taskId: string, result: unknown) => void;
    setTaskExpectedVariantCount: (taskId: string, count: number) => void;
    setTaskName: (taskId: string, name: string) => void;
    appendEditToTask: (taskId: string, change: EditChange) => void;
    clearTaskEdits: (taskId: string) => void;
    flushPendingEditsToPayload: (taskId: string) => void;
    removeTask: (taskId: string) => void;
    replaceTasks: (tasks: TaskState[]) => void;
    applyTaskEvent: (taskId: string, event: TaskEvent) => void;
    setTaskQuestion: (taskId: string, question: TaskQuestion | null) => void;
    setTaskPanic: (taskId: string, panic: TaskPanic | null) => void;
    setTaskLeaseState: (taskId: string, leaseState: string) => void;
    retargetDraftTask: (
        taskId: string,
        update: { kind: string; attachments: TaskAttachment[] },
    ) => void;
    reassignTaskId: (oldId: string, newId: string) => void;
}

const EMPTY_VIEWPORT: TaskViewport = { width: 0, height: 0 };

function nodeIdsFromAttachments(attachments: TaskAttachment[]) {
    const out: number[] = [];
    for (const attachment of attachments) {
        if (typeof attachment.nodeId === 'number' && !out.includes(attachment.nodeId)) {
            out.push(attachment.nodeId);
        }
    }
    return out;
}

function addToNodeIndex(
    state: Pick<TasksSlice, 'taskIdsByNode'>,
    nodeIds: number[],
    taskId: string,
) {
    for (const nodeId of nodeIds) {
        const list = state.taskIdsByNode[nodeId] ?? [];
        if (!list.includes(taskId)) {
            list.push(taskId);
        }
        state.taskIdsByNode[nodeId] = list;
    }
}

function removeFromNodeIndex(
    state: Pick<TasksSlice, 'taskIdsByNode'>,
    nodeIds: number[],
    taskId: string,
) {
    for (const nodeId of nodeIds) {
        const list = state.taskIdsByNode[nodeId];
        if (!list) {
            continue;
        }
        const index = list.indexOf(taskId);
        if (index !== -1) {
            list.splice(index, 1);
        }
        if (list.length === 0) {
            delete state.taskIdsByNode[nodeId];
        }
    }
}

export const createTasksSlice: StateCreator<any, [['zustand/immer', never]], [], TasksSlice> = (set) => ({
    tasks: {},
    taskOrder: [],
    taskIdsByNode: {},
    currentUrl: null,
    setCurrentUrl: (url) =>
        set((state: TasksSlice) => {
            state.currentUrl = url;
        }),
    createTask: (init) => {
        const id = init.id ?? safeRandomId();
        const now = Date.now();

        set((state: TasksSlice) => {
            if (state.tasks[id]) {
                return;
            }

            const attachments = init.attachments ?? [];
            const messages = init.initialUserMessage
                ? [
                      {
                          ...init.initialUserMessage,
                          attachments: init.initialUserMessage.attachments ?? [],
                          viewport: init.initialUserMessage.viewport ?? EMPTY_VIEWPORT,
                      },
                  ]
                : [];

            const localFlags: Record<string, TaskLocalFlags> = {};
            if (init.initialUserMessage?.pending) {
                localFlags[init.initialUserMessage.id] = { pending: true };
            }

            state.tasks[id] = {
                id,
                payload: {
                    id,
                    kind: init.kind,
                    prompt: init.prompt ?? '',
                    url: init.url ?? '',
                    attachments,
                    imageAttachments: [],
                    edits: [],
                    messages,
                    createdAt: now,
                },
                pendingEdits: [],
                status: 'queued',
                updatedAt: now,
                localFlags: Object.keys(localFlags).length > 0 ? localFlags : undefined,
                undoAnchor: null,
            };
            state.taskOrder.push(id);
            addToNodeIndex(state, nodeIdsFromAttachments(attachments), id);
        });

        return id;
    },
    appendTaskMessage: (taskId, msg) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (!task || task.payload.messages.some((message) => message.id === msg.id)) {
                return;
            }

            task.payload.messages.push({
                ...msg,
                attachments: msg.attachments ?? [],
                viewport: msg.viewport ?? EMPTY_VIEWPORT,
            });

            if (msg.pending) {
                task.localFlags ??= {};
                task.localFlags[msg.id] = { pending: true };
            }

            task.updatedAt = Date.now();
            if (task.payload.messages.length > 400) {
                task.payload.messages = task.payload.messages.slice(-400);
            }
        }),
    appendTaskAttachments: (taskId, attachments) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (!task || attachments.length === 0) {
                return;
            }

            const existing = new Set(
                task.payload.attachments
                    .filter((attachment) => typeof attachment.nodeId === 'number')
                    .map((attachment) => attachment.nodeId),
            );

            const toAdd = attachments.filter((attachment) => {
                if (existing.has(attachment.nodeId)) {
                    return false;
                }
                existing.add(attachment.nodeId);
                return true;
            });

            if (toAdd.length === 0) {
                return;
            }

            task.payload.attachments.push(...toAdd);
            addToNodeIndex(state, nodeIdsFromAttachments(toAdd), taskId);
            task.updatedAt = Date.now();
        }),
    acknowledgeTaskMessages: (ids) =>
        set((state: TasksSlice) => {
            const idSet = new Set(ids);
            for (const task of Object.values(state.tasks)) {
                if (!task.localFlags) {
                    continue;
                }
                for (const id of Object.keys(task.localFlags)) {
                    if (idSet.has(id)) {
                        delete task.localFlags[id];
                    }
                }
            }
        }),
    attachMessageImages: (taskId, messageId, images) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (!task || images.length === 0) {
                return;
            }
            task.localMessageImages ??= {};
            task.localMessageImages[messageId] = [...images];
        }),
    attachMessageEdits: (taskId, messageId, edits) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (!task || edits.length === 0) {
                return;
            }
            task.localMessageEdits ??= {};
            task.localMessageEdits[messageId] = edits.map((edit) => ({ ...edit }));
        }),
    setTaskStatus: (taskId, status, error) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (!task || (task.status === status && (error === undefined || task.error === error))) {
                return;
            }
            task.status = status;
            task.updatedAt = Date.now();
            if (error !== undefined) {
                task.error = error;
            }
            if (status !== 'in-progress') {
                task.responding = false;
                task.verb = undefined;
            }
        }),
    setTaskResponding: (taskId, responding) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (!task || task.responding === responding) {
                return;
            }
            task.responding = responding;
            if (!responding) {
                task.verb = undefined;
            }
        }),
    setTaskUndoAnchor: (taskId, anchor) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (task) {
                task.undoAnchor = anchor;
            }
        }),
    setTaskDrifted: (taskId, drifted) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (task) {
                task.drifted = drifted ?? undefined;
            }
        }),
    setTaskMountedOnce: (taskId, mounted) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (task) {
                task.mountedOnce = mounted || undefined;
            }
        }),
    setTaskResult: (taskId, result) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (task && task.result !== result) {
                task.result = result;
            }
        }),
    setTaskExpectedVariantCount: (taskId, count) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (task && task.expectedVariantCount !== count) {
                task.expectedVariantCount = count;
            }
        }),
    setTaskName: (taskId, name) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (task && task.name !== name) {
                task.name = name;
            }
        }),
    appendEditToTask: (taskId, change) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (!task) {
                return;
            }
            appendChange(task.pendingEdits, change);
            task.updatedAt = Date.now();
        }),
    clearTaskEdits: (taskId) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (task && task.pendingEdits.length > 0) {
                task.pendingEdits = [];
                task.updatedAt = Date.now();
            }
        }),
    flushPendingEditsToPayload: (taskId) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (task && task.pendingEdits.length > 0) {
                task.pendingEdits = [];
                task.updatedAt = Date.now();
            }
        }),
    removeTask: (taskId) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (!task) {
                return;
            }
            removeFromNodeIndex(state, nodeIdsFromAttachments(task.payload.attachments), taskId);
            const index = state.taskOrder.indexOf(taskId);
            if (index !== -1) {
                state.taskOrder.splice(index, 1);
            }
            delete state.tasks[taskId];
        }),
    replaceTasks: (tasks) =>
        set((state: TasksSlice) => {
            state.tasks = {};
            state.taskOrder = [];
            state.taskIdsByNode = {};
            for (const task of tasks) {
                state.tasks[task.id] = { ...task, pendingEdits: task.pendingEdits ?? [] };
                state.taskOrder.push(task.id);
                addToNodeIndex(state, nodeIdsFromAttachments(task.payload.attachments), task.id);
            }
        }),
    applyTaskEvent: (taskId, event) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (!task) {
                return;
            }

            const touch = () => {
                task.updatedAt = Date.now();
            };

            switch (event.kind) {
                case 'message': {
                    const message = event.message as TaskMessage | undefined;
                    if (!message || task.payload.messages.some((existing) => existing.id === message.id)) {
                        return;
                    }
                    task.payload.messages.push({
                        ...message,
                        attachments: message.attachments ?? [],
                        viewport: message.viewport ?? EMPTY_VIEWPORT,
                    });
                    if (task.payload.messages.length > 400) {
                        task.payload.messages = task.payload.messages.slice(-400);
                    }
                    touch();
                    return;
                }
                case 'payload':
                    if (event.payload) {
                        task.payload = event.payload as TaskPayload;
                        touch();
                    }
                    return;
                case 'ask':
                    task.question = {
                        askId: String(event.id ?? ''),
                        text: String(event.question ?? ''),
                        options: Array.isArray(event.options)
                            ? event.options.map((option) => String(option))
                            : undefined,
                    };
                    touch();
                    return;
                case 'answer':
                    if (
                        task.question &&
                        task.question.askId === String(event.askId ?? '')
                    ) {
                        task.question.answered = true;
                        task.question.answer = String(event.answer ?? '');
                        touch();
                    }
                    return;
                case 'panic':
                    task.panic = {
                        reason: String(event.reason ?? ''),
                        element:
                            typeof event.element === 'string' ? event.element : undefined,
                    };
                    touch();
                    return;
                case 'calm':
                    task.panic = undefined;
                    touch();
                    return;
                case 'responding':
                    task.responding = Boolean(event.active);
                    task.verb =
                        task.responding && typeof event.verb === 'string'
                            ? event.verb
                            : undefined;
                    touch();
                    return;
                case 'status':
                    task.status = String(event.status ?? task.status);
                    if (typeof event.error === 'string') {
                        task.error = event.error;
                    }
                    if ('result' in event) {
                        task.result = event.result;
                    }
                    if (typeof event.resolution === 'string') {
                        task.resolution = event.resolution;
                    }
                    if (task.status !== 'in-progress') {
                        task.responding = false;
                        task.verb = undefined;
                    }
                    touch();
                    return;
                case 'name':
                    if (typeof event.name === 'string' && task.name !== event.name) {
                        task.name = event.name;
                        touch();
                    }
                    return;
                case 'user-message-ack': {
                    const messageIds = Array.isArray(event.messageIds)
                        ? event.messageIds.map((id) => String(id))
                        : [];
                    if (Boolean(event.queued)) {
                        task.localFlags ??= {};
                        for (const messageId of messageIds) {
                            task.localFlags[messageId] = { queued: true };
                        }
                        touch();
                        return;
                    }
                    if (!task.localFlags) {
                        return;
                    }
                    for (const messageId of messageIds) {
                        delete task.localFlags[messageId];
                    }
                    touch();
                    return;
                }
                case 'user-message-dequeued':
                    if (!task.localFlags) {
                        return;
                    }
                    if (Array.isArray(event.messageIds)) {
                        for (const messageId of event.messageIds.map((id) => String(id))) {
                            delete task.localFlags[messageId];
                        }
                        touch();
                    }
                    return;
                default:
                    return;
            }
        }),
    setTaskQuestion: (taskId, question) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (task) {
                task.question = question ?? undefined;
            }
        }),
    setTaskPanic: (taskId, panic) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (task) {
                task.panic = panic ?? undefined;
            }
        }),
    setTaskLeaseState: (taskId, leaseState) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (task && task.leaseState !== leaseState) {
                task.leaseState = leaseState;
            }
        }),
    retargetDraftTask: (taskId, update) =>
        set((state: TasksSlice) => {
            const task = state.tasks[taskId];
            if (!task) {
                return;
            }
            removeFromNodeIndex(state, nodeIdsFromAttachments(task.payload.attachments), taskId);
            task.payload.kind = update.kind;
            task.payload.attachments = update.attachments;
            task.updatedAt = Date.now();
            addToNodeIndex(state, nodeIdsFromAttachments(update.attachments), taskId);
        }),
    reassignTaskId: (oldId, newId) =>
        set((state: TasksSlice) => {
            const task = state.tasks[oldId];
            if (!task || oldId === newId || state.tasks[newId]) {
                return;
            }

            const nodeIds = nodeIdsFromAttachments(task.payload.attachments);
            removeFromNodeIndex(state, nodeIds, oldId);
            task.id = newId;
            task.payload.id = newId;
            task.updatedAt = Date.now();
            delete state.tasks[oldId];
            state.tasks[newId] = task;

            const index = state.taskOrder.indexOf(oldId);
            if (index !== -1) {
                state.taskOrder[index] = newId;
            } else {
                state.taskOrder.push(newId);
            }

            addToNodeIndex(state, nodeIds, newId);
        }),
});
