// src/Editor/state/slices/dom-slice.ts
function findNodePath(tree, targetId) {
  if (tree.id === targetId) return [tree.id];
  for (const child of tree.children) {
    const path = findNodePath(child, targetId);
    if (path) return [tree.id, ...path];
  }
  return null;
}
var createDomSlice = (set2, _get) => ({
  domTree: null,
  selectedNodeId: null,
  selectedNodeIds: [],
  expandedNodes: {},
  setDomTree: (tree) => set2((state2) => {
    state2.domTree = tree;
  }),
  selectNode: (nodeId) => set2((state2) => {
    state2.selectedNodeIds = nodeId !== null ? [nodeId] : [];
  }),
  selectNodes: (nodeIds) => set2((state2) => {
    state2.selectedNodeIds = nodeIds;
  }),
  toggleNodeSelection: (nodeId) => set2((state2) => {
    const idx = state2.selectedNodeIds.indexOf(nodeId);
    if (idx >= 0) {
      state2.selectedNodeIds.splice(idx, 1);
    } else {
      state2.selectedNodeIds.push(nodeId);
    }
  }),
  removeFromSelection: (nodeId) => set2((state2) => {
    state2.selectedNodeIds = state2.selectedNodeIds.filter((id3) => id3 !== nodeId);
  }),
  setPrimaryNode: (nodeId) => set2((state2) => {
    const idx = state2.selectedNodeIds.indexOf(nodeId);
    if (idx < 0) return;
    state2.selectedNodeIds.splice(idx, 1);
    state2.selectedNodeIds.push(nodeId);
  }),
  clearSelection: () => set2((state2) => {
    state2.selectedNodeIds = [];
  }),
  toggleNode: (nodeId) => set2((state2) => {
    if (state2.expandedNodes[nodeId]) {
      delete state2.expandedNodes[nodeId];
    } else {
      state2.expandedNodes[nodeId] = true;
    }
  }),
  expandToNode: (nodeId) => set2((state2) => {
    const tree = state2.domTree;
    if (!tree) return;
    const path = findNodePath(tree, nodeId);
    if (path) {
      for (const id3 of path) {
        state2.expandedNodes[id3] = true;
      }
    }
  })
});

