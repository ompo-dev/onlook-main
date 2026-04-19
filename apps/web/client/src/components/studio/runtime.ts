'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

export type StudioMode = 'off' | 'original' | 'native';

export interface StudioAvailability {
    original: boolean;
    native: boolean;
}

export interface NativeStudioSettings {
    appearance: 'auto' | 'dark' | 'light';
    autoApply: boolean;
    collapsed: boolean;
    highContrast: boolean;
    scheme: 'indigo' | 'emerald' | 'rose' | 'amber' | 'ocean';
}

interface StudioRuntimeSnapshot {
    availability: StudioAvailability;
    mode: StudioMode;
    settings: NativeStudioSettings;
}

const STUDIO_MODE_STORAGE_KEY = 'onlook:studio:mode';
const NATIVE_STUDIO_SETTINGS_STORAGE_KEY = 'onlook:studio:native:settings';
const STUDIO_RUNTIME_EVENT = 'onlook:studio:runtime-change';
const DEFAULT_NATIVE_SETTINGS: NativeStudioSettings = {
    appearance: 'auto',
    autoApply: false,
    collapsed: false,
    highContrast: false,
    scheme: 'indigo',
};
const DEFAULT_STUDIO_MODE: StudioMode =
    process.env.NODE_ENV === 'development' ? 'original' : 'off';
const DEFAULT_STUDIO_AVAILABILITY: StudioAvailability = {
    original: process.env.NODE_ENV === 'development',
    native: false,
};
const DEFAULT_STUDIO_RUNTIME_SNAPSHOT: StudioRuntimeSnapshot = {
    availability: DEFAULT_STUDIO_AVAILABILITY,
    mode: resolveModeForAvailability(DEFAULT_STUDIO_MODE, DEFAULT_STUDIO_AVAILABILITY),
    settings: DEFAULT_NATIVE_SETTINGS,
};

const listeners = new Set<() => void>();
let cachedRuntimeSnapshotKey: string | null = null;
let cachedRuntimeSnapshot: StudioRuntimeSnapshot = DEFAULT_STUDIO_RUNTIME_SNAPSHOT;

function emitRuntimeChange() {
    for (const listener of listeners) {
        listener();
    }
}

function normalizeMode(value: unknown): StudioMode {
    if (value === 'native' || value === 'original' || value === 'off') {
        return value;
    }
    return process.env.NODE_ENV === 'development' ? 'original' : 'off';
}

export function getStudioAvailability(pathname?: string): StudioAvailability {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const currentPath = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
    const isProjectRoute = currentPath.startsWith('/project/');

    return {
        original: isDevelopment,
        native: isDevelopment && isProjectRoute,
    };
}

function resolveModeForAvailability(mode: StudioMode, availability: StudioAvailability): StudioMode {
    if (mode === 'native' && !availability.native) {
        return 'off';
    }

    if (mode === 'original' && !availability.original) {
        return 'off';
    }

    return mode;
}

function getRuntimeSnapshot(pathname?: string): StudioRuntimeSnapshot {
    const availability = getStudioAvailability(pathname);
    const mode = resolveModeForAvailability(
        typeof window === 'undefined' ? DEFAULT_STUDIO_MODE : getStoredStudioMode(),
        availability,
    );
    const settings =
        typeof window === 'undefined' ? DEFAULT_NATIVE_SETTINGS : getNativeStudioSettings();

    const snapshotKey = JSON.stringify({
        availability,
        mode,
        pathname: pathname ?? '',
        settings,
    });

    if (cachedRuntimeSnapshotKey === snapshotKey) {
        return cachedRuntimeSnapshot;
    }

    cachedRuntimeSnapshotKey = snapshotKey;
    cachedRuntimeSnapshot = {
        availability,
        mode,
        settings,
    };

    return cachedRuntimeSnapshot;
}

export function getStoredStudioMode(): StudioMode {
    if (typeof window === 'undefined') {
        return normalizeMode(undefined);
    }

    return normalizeMode(window.localStorage.getItem(STUDIO_MODE_STORAGE_KEY));
}

export function getStudioMode(pathname?: string): StudioMode {
    const availability = getStudioAvailability(pathname);
    return resolveModeForAvailability(getStoredStudioMode(), availability);
}

export function setStudioMode(mode: StudioMode) {
    if (typeof window === 'undefined') {
        return;
    }

    const normalizedMode = normalizeMode(mode);
    window.localStorage.setItem(STUDIO_MODE_STORAGE_KEY, normalizedMode);
    window.dispatchEvent(new Event(STUDIO_RUNTIME_EVENT));
    emitRuntimeChange();
}

export function subscribeToStudioRuntime(listener: () => void) {
    listeners.add(listener);

    if (typeof window !== 'undefined') {
        const onStorage = (event: StorageEvent) => {
            if (
                event.key === STUDIO_MODE_STORAGE_KEY ||
                event.key === NATIVE_STUDIO_SETTINGS_STORAGE_KEY
            ) {
                listener();
            }
        };
        const onRuntimeChange = () => listener();

        window.addEventListener('storage', onStorage);
        window.addEventListener(STUDIO_RUNTIME_EVENT, onRuntimeChange);

        return () => {
            listeners.delete(listener);
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(STUDIO_RUNTIME_EVENT, onRuntimeChange);
        };
    }

    return () => {
        listeners.delete(listener);
    };
}

export function getNativeStudioSettings(): NativeStudioSettings {
    if (typeof window === 'undefined') {
        return DEFAULT_NATIVE_SETTINGS;
    }

    const raw = window.localStorage.getItem(NATIVE_STUDIO_SETTINGS_STORAGE_KEY);
    if (!raw) {
        return DEFAULT_NATIVE_SETTINGS;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<NativeStudioSettings>;
        return {
            ...DEFAULT_NATIVE_SETTINGS,
            ...parsed,
        };
    } catch {
        return DEFAULT_NATIVE_SETTINGS;
    }
}

export function updateNativeStudioSettings(
    nextSettings: Partial<NativeStudioSettings>,
): NativeStudioSettings {
    const merged = {
        ...getNativeStudioSettings(),
        ...nextSettings,
    };

    if (typeof window !== 'undefined') {
        window.localStorage.setItem(
            NATIVE_STUDIO_SETTINGS_STORAGE_KEY,
            JSON.stringify(merged),
        );
        window.dispatchEvent(new Event(STUDIO_RUNTIME_EVENT));
        emitRuntimeChange();
    }

    return merged;
}

export function useStudioRuntime() {
    const pathname = usePathname();

    const snapshot = useSyncExternalStore(
        subscribeToStudioRuntime,
        () => getRuntimeSnapshot(pathname ?? undefined),
        () => getRuntimeSnapshot(pathname ?? undefined),
    );

    const setMode = useCallback((mode: StudioMode) => {
        setStudioMode(mode);
    }, []);

    const setSettings = useCallback((nextSettings: Partial<NativeStudioSettings>) => {
        updateNativeStudioSettings(nextSettings);
    }, []);

    return useMemo(
        () => ({
            ...snapshot,
            setMode,
            setSettings,
        }),
        [setMode, setSettings, snapshot],
    );
}
