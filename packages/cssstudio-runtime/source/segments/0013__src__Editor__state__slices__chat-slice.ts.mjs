// src/Editor/state/slices/chat-slice.ts
var createChatSlice = (set2, _get) => ({
  chatMessages: [],
  agentResponding: false,
  pendingAttachments: [],
  addChatMessage: (msg) => set2((state2) => {
    state2.chatMessages.push({
      ...msg,
      id: msg.id ?? crypto.randomUUID(),
      timestamp: Date.now()
    });
    if (state2.chatMessages.length > 200) {
      state2.chatMessages = state2.chatMessages.slice(-200);
    }
  }),
  acknowledgeMessages: (ids) => set2((state2) => {
    const idSet = new Set(ids);
    for (const msg of state2.chatMessages) {
      if (idSet.has(msg.id)) msg.pending = false;
    }
  }),
  setAgentResponding: (active) => set2((state2) => {
    if (state2.agentResponding !== active) state2.agentResponding = active;
  }),
  addPendingAttachment: (a) => set2((state2) => {
    if (!state2.pendingAttachments.some((p) => p.nodeId === a.nodeId && p.label === a.label)) {
      state2.pendingAttachments.push(a);
    }
  }),
  removePendingAttachment: (nodeId) => set2((state2) => {
    state2.pendingAttachments = state2.pendingAttachments.filter((a) => a.nodeId !== nodeId);
  }),
  clearPendingAttachments: () => set2((state2) => {
    state2.pendingAttachments = [];
  })
});

