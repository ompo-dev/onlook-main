import type { EditChange } from '../slices/edit-slice';
import { resolveElementAttachment, type TaskAttachment } from '../../utils/build-task-payload';
import { appendChange } from './coalesce-edits';
import { safeRandomId } from './safe-random-id';

interface ActiveTaskState {
    selectedNodeIds: number[];
    currentUrl: string | null;
    activeTaskId: string | null;
    tasks: Record<
        string,
        {
            id: string;
            payload: {
                id: string;
                kind: string;
                prompt: string;
                url: string;
                attachments: TaskAttachment[];
                imageAttachments: unknown[];
                edits: EditChange[];
                messages: unknown[];
                createdAt: number;
            };
            status: string;
            updatedAt: number;
            pendingEdits: EditChange[];
            undoAnchor: unknown;
        }
    >;
    taskOrder: string[];
    taskIdsByNode: Record<number, string[]>;
}

export function autoCreateDraftTask(state: ActiveTaskState) {
    const id = safeRandomId();
    const now = Date.now();
    const selectedNodeIds = Array.isArray(state.selectedNodeIds) ? [...state.selectedNodeIds] : [];
    const attachments = selectedNodeIds.map((nodeId) => resolveElementAttachment(nodeId));

    state.tasks[id] = {
        id,
        payload: {
            id,
            kind: 'prompt',
            prompt: '',
            url: state.currentUrl ?? '',
            attachments,
            imageAttachments: [],
            edits: [],
            messages: [],
            createdAt: now,
        },
        status: 'queued',
        updatedAt: now,
        pendingEdits: [],
        undoAnchor: null,
    };

    state.taskOrder.push(id);
    state.activeTaskId = id;

    for (const nodeId of selectedNodeIds) {
        const existing = state.taskIdsByNode[nodeId] ?? [];
        if (!existing.includes(id)) {
            existing.push(id);
        }
        state.taskIdsByNode[nodeId] = existing;
    }

    return id;
}

export function pushEditToActiveTask(state: ActiveTaskState, change: EditChange) {
    let activeId = state.activeTaskId;
    if (!activeId || !state.tasks[activeId]) {
        activeId = autoCreateDraftTask(state);
    }

    const task = state.tasks[activeId];
    if (!task) {
        return;
    }

    appendChange(task.pendingEdits, change);
    task.updatedAt = Date.now();
}
