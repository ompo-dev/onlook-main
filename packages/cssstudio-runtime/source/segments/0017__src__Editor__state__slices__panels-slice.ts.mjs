// src/Editor/state/slices/panels-slice.ts
var DEFAULT_PANELS = {
  inspector: { open: false, dock: "right", size: 320, activeTab: "design" },
  navigator: { open: false, dock: "left", size: 300, activeTab: "elements" },
  timeline: { open: false, dock: "bottom", size: 250, activeTab: "animations" }
};
function recomputeClaims(panels) {
  const claims = { left: 0, right: 0, bottom: 0 };
  for (const panel of Object.values(panels)) {
    if (panel.open) {
      claims[panel.dock] = Math.max(claims[panel.dock], panel.size);
    }
  }
  return claims;
}
var createPanelsSlice = (set2, _get) => ({
  panels: { ...DEFAULT_PANELS },
  dockedClaims: { left: 0, right: 0, bottom: 0 },
  setPanelOpen: (id3, open) => set2((state2) => {
    state2.panels[id3].open = open;
    state2.dockedClaims = recomputeClaims(state2.panels);
  }),
  togglePanel: (id3) => set2((state2) => {
    state2.panels[id3].open = !state2.panels[id3].open;
    state2.dockedClaims = recomputeClaims(state2.panels);
  }),
  setPanelDock: (id3, dock) => set2((state2) => {
    state2.panels[id3].dock = dock;
    state2.dockedClaims = recomputeClaims(state2.panels);
  }),
  setPanelSize: (id3, size) => set2((state2) => {
    state2.panels[id3].size = size;
    state2.dockedClaims = recomputeClaims(state2.panels);
  }),
  setPanelActiveTab: (id3, tab) => set2((state2) => {
    state2.panels[id3].activeTab = tab;
  }),
  togglePanelTab: (id3, tab) => set2((state2) => {
    const panel = state2.panels[id3];
    if (panel.open && panel.activeTab === tab) {
      panel.open = false;
    } else {
      panel.open = true;
      panel.activeTab = tab;
    }
    state2.dockedClaims = recomputeClaims(state2.panels);
  }),
  openChat: () => set2((state2) => {
    state2.panels.navigator.open = true;
    state2.panels.navigator.activeTab = "chat";
    state2.dockedClaims = recomputeClaims(state2.panels);
  })
});

