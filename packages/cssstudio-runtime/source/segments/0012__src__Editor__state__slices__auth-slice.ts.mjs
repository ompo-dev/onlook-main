// src/Editor/state/slices/auth-slice.ts
var createAuthSlice = (set2, _get) => ({
  isPickingElement: false,
  isDrawingElement: false,
  isAuthenticated: false,
  isAuthChecking: true,
  mcpStatus: "disconnected",
  agentPolling: false,
  agentStatus: "idle",
  setPickingElement: (picking) => set2((state2) => {
    state2.isPickingElement = picking;
    if (picking) state2.isDrawingElement = false;
  }),
  setDrawingElement: (drawing) => set2((state2) => {
    state2.isDrawingElement = drawing;
    if (drawing) state2.isPickingElement = false;
  }),
  setIsAuthenticated: (authenticated) => set2((state2) => {
    state2.isAuthenticated = authenticated;
    state2.isAuthChecking = false;
  }),
  setIsAuthChecking: (checking) => set2((state2) => {
    state2.isAuthChecking = checking;
  }),
  setMcpStatus: (status) => set2((state2) => {
    state2.mcpStatus = status;
    if (status === "disconnected") {
      state2.agentPolling = false;
      state2.agentStatus = "idle";
    }
  }),
  setAgentPolling: (polling) => set2((state2) => {
    state2.agentPolling = polling;
  }),
  setAgentStatus: (status) => set2((state2) => {
    if (state2.agentStatus === status) return;
    state2.agentStatus = status;
    state2.agentPolling = status === "polling" || status === "implementing";
  })
});

