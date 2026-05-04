import type { StateCreator } from 'zustand';

export type ChatRole = 'user' | 'agent' | 'status' | 'error';

export interface ChatAttachment {
    nodeId: number;
    label: string;
}

export interface DraftImage {
    id: string;
    filename: string;
    dataUrl: string;
}

export interface ChatMessage {
    id: string;
    role: ChatRole;
    text: string;
    timestamp: number;
    isError?: boolean;
    pending?: boolean;
    attachments?: ChatAttachment[];
}

export interface ChatDraft {
    text: string;
    images: DraftImage[];
    pendingAttachments: ChatAttachment[];
}

export const EMPTY_DRAFT: Readonly<ChatDraft> = Object.freeze({
    text: '',
    images: [],
    pendingAttachments: [],
});

export function selectActiveDraft(state: {
    activeTaskId: string | null;
    newTaskDraft: ChatDraft;
    tasks?: Record<string, { draft?: ChatDraft }>;
}) {
    if (state.activeTaskId === null) {
        return state.newTaskDraft;
    }

    const task = state.tasks?.[state.activeTaskId];
    if (!task?.draft) {
        return EMPTY_DRAFT;
    }

    return task.draft;
}

function syncVisiblePendingAttachments(state: { pendingAttachments: ChatAttachment[] } & {
    activeTaskId: string | null;
    newTaskDraft: ChatDraft;
    tasks?: Record<string, { draft?: ChatDraft }>;
}) {
    state.pendingAttachments = [...selectActiveDraft(state).pendingAttachments];
}

function writeActiveDraft(
    state: {
        activeTaskId: string | null;
        newTaskDraft: ChatDraft;
        tasks?: Record<string, { draft?: ChatDraft }>;
    },
    mutate: (draft: ChatDraft) => void,
) {
    if (state.activeTaskId === null) {
        mutate(state.newTaskDraft);
        return;
    }

    const task = state.tasks?.[state.activeTaskId];
    if (!task) {
        return;
    }

    if (!task.draft) {
        task.draft = {
            text: '',
            images: [],
            pendingAttachments: [],
        };
    }

    mutate(task.draft);
}

export interface ChatSlice {
    chatMessages: ChatMessage[];
    agentResponding: boolean;
    pendingAttachments: ChatAttachment[];
    newTaskDraft: ChatDraft;
    activeTaskId: string | null;
    newTaskSlotOpen: boolean;
    chatFocusToken: number;
    addChatMessage: (msg: Partial<ChatMessage> & { role: ChatRole; text: string }) => void;
    acknowledgeMessages: (ids: string[]) => void;
    setAgentResponding: (active: boolean) => void;
    setDraftText: (text: string) => void;
    clearDraftText: () => void;
    addDraftImage: (img: DraftImage) => void;
    removeDraftImage: (id: string) => void;
    clearDraftImages: () => void;
    addPendingAttachment: (attachment: ChatAttachment) => void;
    removePendingAttachment: (nodeId: number) => void;
    clearPendingAttachments: () => void;
    clearActiveDraft: () => void;
    setActiveTask: (id: string | null) => void;
    openNewTaskSlot: () => void;
    requestChatFocus: () => void;
}

export const createChatSlice: StateCreator<any, [['zustand/immer', never]], [], ChatSlice> = (set) => ({
    chatMessages: [],
    agentResponding: false,
    pendingAttachments: [],
    newTaskDraft: {
        text: '',
        images: [],
        pendingAttachments: [],
    },
    activeTaskId: null,
    newTaskSlotOpen: false,
    chatFocusToken: 0,
    addChatMessage: (msg) =>
        set((state: { chatMessages: ChatMessage[] }) => {
            state.chatMessages.push({
                ...msg,
                id: msg.id ?? crypto.randomUUID(),
                timestamp: msg.timestamp ?? Date.now(),
            });
            if (state.chatMessages.length > 400) {
                state.chatMessages = state.chatMessages.slice(-400);
            }
        }),
    acknowledgeMessages: (ids) =>
        set((state: { chatMessages: ChatMessage[] }) => {
            const idSet = new Set(ids);
            for (const msg of state.chatMessages) {
                if (idSet.has(msg.id)) {
                    msg.pending = false;
                }
            }
        }),
    setAgentResponding: (active) =>
        set((state: { agentResponding: boolean }) => {
            if (state.agentResponding !== active) {
                state.agentResponding = active;
            }
        }),
    setDraftText: (text) =>
        set((state: any) => {
            writeActiveDraft(state, (draft) => {
                draft.text = text;
            });
        }),
    clearDraftText: () =>
        set((state: any) => {
            writeActiveDraft(state, (draft) => {
                draft.text = '';
            });
        }),
    addDraftImage: (img) =>
        set((state: any) => {
            writeActiveDraft(state, (draft) => {
                if (!draft.images.some((existing) => existing.id === img.id)) {
                    draft.images.push(img);
                }
            });
        }),
    removeDraftImage: (id) =>
        set((state: any) => {
            writeActiveDraft(state, (draft) => {
                draft.images = draft.images.filter((image) => image.id !== id);
            });
        }),
    clearDraftImages: () =>
        set((state: any) => {
            writeActiveDraft(state, (draft) => {
                draft.images = [];
            });
        }),
    addPendingAttachment: (attachment) =>
        set((state: any) => {
            writeActiveDraft(state, (draft) => {
                if (
                    !draft.pendingAttachments.some(
                        (existing) =>
                            existing.nodeId === attachment.nodeId &&
                            existing.label === attachment.label,
                    )
                ) {
                    draft.pendingAttachments.push(attachment);
                }
            });
            syncVisiblePendingAttachments(state);
        }),
    removePendingAttachment: (nodeId) =>
        set((state: any) => {
            writeActiveDraft(state, (draft) => {
                draft.pendingAttachments = draft.pendingAttachments.filter(
                    (attachment) => attachment.nodeId !== nodeId,
                );
            });
            syncVisiblePendingAttachments(state);
        }),
    clearPendingAttachments: () =>
        set((state: any) => {
            writeActiveDraft(state, (draft) => {
                draft.pendingAttachments = [];
            });
            syncVisiblePendingAttachments(state);
        }),
    clearActiveDraft: () =>
        set((state: any) => {
            if (state.activeTaskId === null) {
                state.newTaskDraft = {
                    text: '',
                    images: [],
                    pendingAttachments: [],
                };
            } else if (state.tasks?.[state.activeTaskId]) {
                state.tasks[state.activeTaskId].draft = undefined;
            }
            syncVisiblePendingAttachments(state);
        }),
    setActiveTask: (id) =>
        set((state: any) => {
            state.activeTaskId = id;
            if (id !== null) {
                state.newTaskSlotOpen = false;
            }
            syncVisiblePendingAttachments(state);
        }),
    openNewTaskSlot: () =>
        set((state: any) => {
            state.activeTaskId = null;
            state.newTaskSlotOpen = true;
            syncVisiblePendingAttachments(state);
        }),
    requestChatFocus: () =>
        set((state: { chatFocusToken: number }) => {
            state.chatFocusToken += 1;
        }),
});
