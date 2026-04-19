import type { StateCreator } from 'zustand';

export interface EditChange {
    type: string;
    element?: string;
    path?: string;
    name?: string;
    value?: string;
}

export interface EditSlice {
    autoApply: boolean;
    editVersion: number;
    pendingChanges: EditChange[];
    pendingChangesCopied: boolean;
    stagedChanges: EditChange[];
    applying: boolean;
    hasEverHadChanges: boolean;
    setAutoApply: (autoApply: boolean) => void;
    queueEdit: (change: EditChange) => void;
    clearPendingChanges: () => void;
    clearStagedChanges: () => void;
    setApplying: (applying: boolean) => void;
}

function coalesceOrPush(changes: EditChange[], change: EditChange): void {
    const last = changes[changes.length - 1];
    if (last && last.type === change.type && last.element === change.element && last.path === change.path && last.name === change.name) {
        const fromValue = last.value?.split(' → ')[0];
        const toValue = change.value?.split(' → ')[1];
        if (fromValue !== undefined && toValue !== undefined) {
            if (fromValue === toValue) { changes.pop(); return; }
            last.value = `${fromValue} → ${toValue}`;
        } else {
            last.value = change.value;
        }
    } else {
        changes.push(change);
    }
}

export function coalesceKeyframeOrPush(changes: EditChange[], name: string, css: string): void {
    const last = changes[changes.length - 1];
    if (last && last.type === 'keyframe' && last.name === name) {
        last.value = css;
    } else {
        changes.push({ type: 'keyframe', name, value: css });
    }
}

export const createEditSlice: StateCreator<any, [['zustand/immer', never]], [], EditSlice> = (set) => ({
    autoApply: false,
    editVersion: 0,
    pendingChanges: [],
    pendingChangesCopied: false,
    stagedChanges: [],
    applying: false,
    hasEverHadChanges: false,
    setAutoApply: (autoApply) => set((s: any) => { s.autoApply = autoApply; }),
    queueEdit: (change) => set((s: any) => {
        s.editVersion++;
        s.hasEverHadChanges = true;
        if (s.pendingChangesCopied) { s.pendingChanges = []; s.pendingChangesCopied = false; }
        coalesceOrPush(s.pendingChanges, change);
        coalesceOrPush(s.stagedChanges, change);
    }),
    clearPendingChanges: () => set((s: any) => { s.pendingChangesCopied = true; }),
    clearStagedChanges: () => set((s: any) => { s.stagedChanges = []; }),
    setApplying: (applying) => set((s: any) => { s.applying = applying; }),
});
