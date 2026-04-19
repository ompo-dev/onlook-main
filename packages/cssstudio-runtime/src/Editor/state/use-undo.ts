import { create } from 'zustand';

export interface StyleOp {
    type: 'style';
    nodeId: number;
    property: string;
    oldValue: string;
    newValue: string;
    newAnimSnapshot?: unknown;
}

export interface KeyframeOp {
    type: 'keyframe';
    nodeId: null;
    property: string;
    oldValue: string;
    newValue: string;
    oldAnimSnapshot?: unknown;
    newAnimSnapshot?: unknown;
}

export interface DomOp {
    type: 'dom';
    description?: string;
    undo?: () => void;
    redo?: () => void;
    action?: string;
    nodeId?: number;
    element?: Element;
    parentId?: number;
    beforeSiblingId?: number | null;
    [key: string]: unknown;
}

export interface BatchOp {
    type: 'batch';
    operations: UndoEntry[];
}

export type UndoEntry = StyleOp | KeyframeOp | DomOp | BatchOp;

interface UndoState {
    past: UndoEntry[];
    future: UndoEntry[];
    push: (op: UndoEntry | any) => void;
    pushDom: (op: DomOp | any) => void;
    pushBatch: (ops: UndoEntry[]) => void;
    undo: () => UndoEntry | undefined;
    redo: () => UndoEntry | undefined;
    clear: () => void;
}

export const useUndoStore = create<UndoState>()((set, get) => ({
    past: [],
    future: [],
    push: (op) => {
        const { past } = get();
        const last = past[past.length - 1];
        if (last && last.type !== 'batch' && last.type === op.type && (last as StyleOp).nodeId === (op as StyleOp).nodeId && (last as StyleOp).property === (op as StyleOp).property) {
            const merged = { ...last, newValue: (op as StyleOp).newValue } as StyleOp;
            if ((op as StyleOp).newAnimSnapshot) merged.newAnimSnapshot = (op as StyleOp).newAnimSnapshot;
            set({ past: [...past.slice(0, -1), merged], future: [] });
        } else {
            set({ past: [...past, op], future: [] });
        }
    },
    pushDom: (op) => { const { past } = get(); set({ past: [...past, op], future: [] }); },
    pushBatch: (ops) => {
        if (ops.length === 0) return;
        if (ops.length === 1) { get().push(ops[0]); return; }
        const { past } = get();
        set({ past: [...past, { type: 'batch', operations: ops }], future: [] });
    },
    undo: () => {
        const { past, future } = get();
        if (past.length === 0) return undefined;
        const entry = past[past.length - 1];
        set({ past: past.slice(0, -1), future: [entry, ...future] });
        return entry;
    },
    redo: () => {
        const { past, future } = get();
        if (future.length === 0) return undefined;
        const entry = future[0];
        set({ past: [...past, entry], future: future.slice(1) });
        return entry;
    },
    clear: () => set({ past: [], future: [] }),
}));
