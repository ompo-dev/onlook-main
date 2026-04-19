import type { StateCreator } from 'zustand';

export type PanelId = 'inspector' | 'navigator' | 'timeline';
export type PanelDock = 'left' | 'right' | 'bottom';

export interface PanelState {
    open: boolean;
    dock: PanelDock;
    size: number;
    activeTab: string;
}

export interface DockedClaims {
    left: number;
    right: number;
    bottom: number;
}

export interface PanelsSlice {
    panels: Record<PanelId, PanelState>;
    dockedClaims: DockedClaims;
    setPanelOpen: (id: PanelId, open: boolean) => void;
    togglePanel: (id: PanelId) => void;
    setPanelDock: (id: PanelId, dock: PanelDock) => void;
    setPanelSize: (id: PanelId, size: number) => void;
    setPanelActiveTab: (id: PanelId, tab: string) => void;
    togglePanelTab: (id: PanelId, tab: string) => void;
    openChat: () => void;
}

const DEFAULT_PANELS: Record<PanelId, PanelState> = {
    inspector: { open: false, dock: 'right', size: 320, activeTab: 'design' },
    navigator: { open: false, dock: 'left', size: 300, activeTab: 'elements' },
    timeline: { open: false, dock: 'bottom', size: 250, activeTab: 'animations' },
};

function recomputeClaims(panels: Record<string, PanelState>): DockedClaims {
    const claims: DockedClaims = { left: 0, right: 0, bottom: 0 };
    for (const panel of Object.values(panels)) {
        if (panel.open) claims[panel.dock as keyof DockedClaims] = Math.max(claims[panel.dock as keyof DockedClaims], panel.size);
    }
    return claims;
}

export const createPanelsSlice: StateCreator<any, [['zustand/immer', never]], [], PanelsSlice> = (set) => ({
    panels: { ...DEFAULT_PANELS },
    dockedClaims: { left: 0, right: 0, bottom: 0 },
    setPanelOpen: (id, open) => set((s: any) => { s.panels[id].open = open; s.dockedClaims = recomputeClaims(s.panels); }),
    togglePanel: (id) => set((s: any) => { s.panels[id].open = !s.panels[id].open; s.dockedClaims = recomputeClaims(s.panels); }),
    setPanelDock: (id, dock) => set((s: any) => { s.panels[id].dock = dock; s.dockedClaims = recomputeClaims(s.panels); }),
    setPanelSize: (id, size) => set((s: any) => { s.panels[id].size = size; s.dockedClaims = recomputeClaims(s.panels); }),
    setPanelActiveTab: (id, tab) => set((s: any) => { s.panels[id].activeTab = tab; }),
    togglePanelTab: (id, tab) => set((s: any) => {
        const panel = s.panels[id];
        if (panel.open && panel.activeTab === tab) panel.open = false;
        else { panel.open = true; panel.activeTab = tab; }
        s.dockedClaims = recomputeClaims(s.panels);
    }),
    openChat: () => set((s: any) => {
        s.panels.navigator.open = true;
        s.panels.navigator.activeTab = 'chat';
        s.dockedClaims = recomputeClaims(s.panels);
    }),
});
