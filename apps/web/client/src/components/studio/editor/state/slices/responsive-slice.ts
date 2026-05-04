import type { StateCreator } from 'zustand';

export interface Breakpoint {
    label: string;
    width: number;
}

export interface ResponsiveTransform {
    x: number;
    y: number;
    scale: number;
}

export interface ResponsiveViewport {
    width: number;
    height: number;
}

export interface ResponsiveSlice {
    responsiveMode: boolean;
    breakpoints: Breakpoint[];
    primaryBreakpointIndex: number;
    activeBreakpointIndex: number;
    responsiveTransform: ResponsiveTransform | null;
    responsiveViewport: ResponsiveViewport;
    responsiveCacheVersion: number;
    setResponsiveMode: (on: boolean) => void;
    setActiveBreakpoint: (index: number) => void;
    setResponsiveTransform: (transform: ResponsiveTransform) => void;
    setResponsiveViewport: (viewport: ResponsiveViewport) => void;
    bumpResponsiveCacheVersion: () => void;
}

const DEFAULT_BREAKPOINTS: Breakpoint[] = [
    { label: 'Desktop', width: 1440 },
    { label: 'Mobile', width: 390 },
];

const VIEWPORT_PRESETS = {
    phone: { width: 390, height: 844 },
    monitor: { width: 1440, height: 900 },
} satisfies Record<string, ResponsiveViewport>;

const DEFAULT_RESPONSIVE_VIEWPORT: ResponsiveViewport = { ...VIEWPORT_PRESETS.phone };

export const createResponsiveSlice: StateCreator<
    any,
    [['zustand/immer', never]],
    [],
    ResponsiveSlice
> = (set) => ({
    responsiveMode: false,
    breakpoints: DEFAULT_BREAKPOINTS,
    primaryBreakpointIndex: 0,
    activeBreakpointIndex: 0,
    responsiveTransform: null,
    responsiveViewport: { ...DEFAULT_RESPONSIVE_VIEWPORT },
    responsiveCacheVersion: 0,
    setResponsiveMode: (on) =>
        set((state: ResponsiveSlice) => {
            state.responsiveMode = on;
            if (on) {
                state.activeBreakpointIndex = state.primaryBreakpointIndex;
            }
        }),
    setActiveBreakpoint: (index) =>
        set((state: ResponsiveSlice) => {
            state.activeBreakpointIndex = index;
        }),
    setResponsiveTransform: (transform) =>
        set((state: ResponsiveSlice) => {
            const previous = state.responsiveTransform;
            if (
                previous &&
                previous.x === transform.x &&
                previous.y === transform.y &&
                previous.scale === transform.scale
            ) {
                return;
            }
            state.responsiveTransform = transform;
        }),
    setResponsiveViewport: (viewport) =>
        set((state: ResponsiveSlice) => {
            const previous = state.responsiveViewport;
            if (
                previous.width === viewport.width &&
                previous.height === viewport.height
            ) {
                return;
            }
            state.responsiveViewport = viewport;
        }),
    bumpResponsiveCacheVersion: () =>
        set((state: ResponsiveSlice) => {
            state.responsiveCacheVersion += 1;
        }),
});
