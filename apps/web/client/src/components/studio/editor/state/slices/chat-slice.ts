import type { StateCreator } from 'zustand';

export type ChatRole = 'user' | 'agent' | 'status' | 'error';

export interface ChatAttachment {
    nodeId: number;
    label: string;
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

export interface ChatSlice {
    chatMessages: ChatMessage[];
    agentResponding: boolean;
    pendingAttachments: ChatAttachment[];
    addChatMessage: (msg: Partial<ChatMessage> & { role: ChatRole; text: string }) => void;
    acknowledgeMessages: (ids: string[]) => void;
    setAgentResponding: (active: boolean) => void;
    addPendingAttachment: (a: ChatAttachment) => void;
    removePendingAttachment: (nodeId: number) => void;
    clearPendingAttachments: () => void;
}

export const createChatSlice: StateCreator<any, [['zustand/immer', never]], [], ChatSlice> = (set) => ({
    chatMessages: [],
    agentResponding: false,
    pendingAttachments: [],
    addChatMessage: (msg) => set((s: any) => {
        s.chatMessages.push({ ...msg, id: msg.id ?? crypto.randomUUID(), timestamp: Date.now() });
        if (s.chatMessages.length > 200) s.chatMessages = s.chatMessages.slice(-200);
    }),
    acknowledgeMessages: (ids) => set((s: any) => {
        const idSet = new Set(ids);
        for (const msg of s.chatMessages) { if (idSet.has(msg.id)) msg.pending = false; }
    }),
    setAgentResponding: (active) => set((s: any) => { if (s.agentResponding !== active) s.agentResponding = active; }),
    addPendingAttachment: (a) => set((s: any) => {
        if (!s.pendingAttachments.some((p: ChatAttachment) => p.nodeId === a.nodeId && p.label === a.label)) {
            s.pendingAttachments.push(a);
        }
    }),
    removePendingAttachment: (nodeId) => set((s: any) => {
        s.pendingAttachments = s.pendingAttachments.filter((a: ChatAttachment) => a.nodeId !== nodeId);
    }),
    clearPendingAttachments: () => set((s: any) => { s.pendingAttachments = []; }),
});
