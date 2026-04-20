import type { StateCreator } from 'zustand';

export type McpStatus = 'connecting' | 'connected' | 'disconnected';
export type AgentStatus = 'idle' | 'polling' | 'implementing';

export interface AuthSlice {
    isPickingElement: boolean;
    isDrawingElement: boolean;
    isAuthenticated: boolean;
    isAuthChecking: boolean;
    mcpStatus: McpStatus;
    agentPolling: boolean;
    agentStatus: AgentStatus;
    setPickingElement: (picking: boolean) => void;
    setDrawingElement: (drawing: boolean) => void;
    setIsAuthenticated: (authenticated: boolean) => void;
    setIsAuthChecking: (checking: boolean) => void;
    setMcpStatus: (status: McpStatus) => void;
    setAgentPolling: (polling: boolean) => void;
    setAgentStatus: (status: AgentStatus) => void;
}

export const createAuthSlice: StateCreator<any, [['zustand/immer', never]], [], AuthSlice> = (set) => ({
    isPickingElement: false,
    isDrawingElement: false,
    isAuthenticated: false,
    isAuthChecking: true,
    mcpStatus: 'disconnected',
    agentPolling: false,
    agentStatus: 'idle',
    setPickingElement: (picking) => set((s: any) => { s.isPickingElement = picking; if (picking) s.isDrawingElement = false; }),
    setDrawingElement: (drawing) => set((s: any) => { s.isDrawingElement = drawing; if (drawing) s.isPickingElement = false; }),
    setIsAuthenticated: (authenticated) => set((s: any) => { s.isAuthenticated = authenticated; s.isAuthChecking = false; }),
    setIsAuthChecking: (checking) => set((s: any) => { s.isAuthChecking = checking; }),
    setMcpStatus: (status) => set((s: any) => {
        s.mcpStatus = status;
        if (status === 'disconnected') { s.agentPolling = false; s.agentStatus = 'idle'; }
    }),
    setAgentPolling: (polling) => set((s: any) => { s.agentPolling = polling; }),
    setAgentStatus: (status) => set((s: any) => {
        if (s.agentStatus === status) return;
        s.agentStatus = status;
        s.agentPolling = status === 'polling' || status === 'implementing';
    }),
});
