import type { DomNode } from '../../utils/convert-tree';
import type { StateCreator } from 'zustand';

export interface DomSlice {
    domTree: DomNode | null;
    selectedNodeId: number | null;
    selectedNodeIds: number[];
    expandedNodes: Record<number, boolean>;
    setDomTree: (tree: DomNode) => void;
    selectNode: (nodeId: number | null) => void;
    selectNodes: (nodeIds: number[]) => void;
    toggleNodeSelection: (nodeId: number) => void;
    removeFromSelection: (nodeId: number) => void;
    setPrimaryNode: (nodeId: number) => void;
    clearSelection: () => void;
    toggleNode: (nodeId: number) => void;
    expandToNode: (nodeId: number) => void;
}

function findNodePath(tree: DomNode, targetId: number): number[] | null {
    if (tree.id === targetId) return [tree.id];
    for (const child of tree.children) {
        const path = findNodePath(child, targetId);
        if (path) return [tree.id, ...path];
    }
    return null;
}

export const createDomSlice: StateCreator<any, [['zustand/immer', never]], [], DomSlice> = (set) => ({
    domTree: null,
    selectedNodeId: null,
    selectedNodeIds: [],
    expandedNodes: {},
    setDomTree: (tree) => set((s: any) => { s.domTree = tree; }),
    selectNode: (nodeId) => set((s: any) => { s.selectedNodeIds = nodeId !== null ? [nodeId] : []; }),
    selectNodes: (nodeIds) => set((s: any) => { s.selectedNodeIds = nodeIds; }),
    toggleNodeSelection: (nodeId) => set((s: any) => {
        const idx = s.selectedNodeIds.indexOf(nodeId);
        if (idx >= 0) s.selectedNodeIds.splice(idx, 1);
        else s.selectedNodeIds.push(nodeId);
    }),
    removeFromSelection: (nodeId) => set((s: any) => {
        s.selectedNodeIds = s.selectedNodeIds.filter((id: number) => id !== nodeId);
    }),
    setPrimaryNode: (nodeId) => set((s: any) => {
        const idx = s.selectedNodeIds.indexOf(nodeId);
        if (idx < 0) return;
        s.selectedNodeIds.splice(idx, 1);
        s.selectedNodeIds.push(nodeId);
    }),
    clearSelection: () => set((s: any) => { s.selectedNodeIds = []; }),
    toggleNode: (nodeId) => set((s: any) => {
        if (s.expandedNodes[nodeId]) delete s.expandedNodes[nodeId];
        else s.expandedNodes[nodeId] = true;
    }),
    expandToNode: (nodeId) => set((s: any) => {
        const tree = s.domTree;
        if (!tree) return;
        const path = findNodePath(tree, nodeId);
        if (path) for (const id of path) s.expandedNodes[id] = true;
    }),
});
