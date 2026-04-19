import type { StateCreator } from 'zustand';

export interface UiSlice {
    splitAxis: Record<string, boolean>;
    splitCorners: Record<string, boolean>;
    showMinMax: Record<string, 'min' | 'max' | 'both' | null>;
    toggleSplitAxis: (prop: string) => void;
    toggleSplitCorners: (prop: string) => void;
    toggleMinMax: (prop: string, which: 'min' | 'max') => void;
}

export const createUiSlice: StateCreator<any, [['zustand/immer', never]], [], UiSlice> = (set) => ({
    splitAxis: {},
    splitCorners: {},
    showMinMax: {},
    toggleSplitAxis: (prop) => set((s: any) => { s.splitAxis[prop] = !s.splitAxis[prop]; }),
    toggleSplitCorners: (prop) => set((s: any) => { s.splitCorners[prop] = !s.splitCorners[prop]; }),
    toggleMinMax: (prop, which) => set((s: any) => {
        const current = s.showMinMax[prop];
        if (current === which) s.showMinMax[prop] = null;
        else if (current === null || current === undefined) s.showMinMax[prop] = which;
        else if (current !== which) s.showMinMax[prop] = 'both';
        else s.showMinMax[prop] = null;
    }),
});
