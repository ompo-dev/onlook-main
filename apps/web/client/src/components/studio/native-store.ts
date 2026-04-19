'use client';

import { produce } from 'immer';
import { create } from 'zustand';
import { getNativeStudioSettings, type NativeStudioSettings } from './runtime';

export type NativeNavigatorTab = 'elements' | 'metadata' | 'chat';
export type NativeInspectorTab = 'design' | 'motion' | 'variables' | 'html';

interface NativeStudioPanelsSlice {
    inspectorOpen: boolean;
    inspectorTab: NativeInspectorTab;
    navigatorOpen: boolean;
    navigatorTab: NativeNavigatorTab;
    timelineOpen: boolean;
}

interface NativeStudioDomSlice {
    expandedNodes: Record<string, boolean>;
}

interface NativeStudioEditSlice {
    htmlDraft: string;
    metadataDescriptionDraft: string;
    metadataTitleDraft: string;
    promptDraft: string;
}

interface NativeStudioAnimationSlice {
    scrubberPosition: number;
}

interface NativeStudioState {
    animation: NativeStudioAnimationSlice;
    dom: NativeStudioDomSlice;
    edit: NativeStudioEditSlice;
    panels: NativeStudioPanelsSlice;
    settings: NativeStudioSettings;
    setInspectorTab: (tab: NativeInspectorTab) => void;
    setNavigatorTab: (tab: NativeNavigatorTab) => void;
    setPromptDraft: (value: string) => void;
    setSetting: (setting: Partial<NativeStudioSettings>) => void;
    setScrubberPosition: (value: number) => void;
    setTextDrafts: (value: Partial<NativeStudioEditSlice>) => void;
    toggleNode: (nodeId: string) => void;
    togglePanel: (panel: keyof NativeStudioPanelsSlice) => void;
}

const INITIAL_EDIT_STATE: NativeStudioEditSlice = {
    htmlDraft: '',
    metadataDescriptionDraft: '',
    metadataTitleDraft: '',
    promptDraft: '',
};

export const useNativeStudioStore = create<NativeStudioState>()((set) => ({
    animation: {
        scrubberPosition: 0,
    },
    dom: {
        expandedNodes: {},
    },
    edit: INITIAL_EDIT_STATE,
    panels: {
        inspectorOpen: true,
        inspectorTab: 'design',
        navigatorOpen: true,
        navigatorTab: 'elements',
        timelineOpen: true,
    },
    settings: getNativeStudioSettings(),
    setInspectorTab: (tab) =>
        set(
            produce<NativeStudioState>((state) => {
                state.panels.inspectorOpen = true;
                state.panels.inspectorTab = tab;
            }),
        ),
    setNavigatorTab: (tab) =>
        set(
            produce<NativeStudioState>((state) => {
                state.panels.navigatorOpen = true;
                state.panels.navigatorTab = tab;
            }),
        ),
    setPromptDraft: (value) =>
        set(
            produce<NativeStudioState>((state) => {
                state.edit.promptDraft = value;
            }),
        ),
    setSetting: (setting) =>
        set(
            produce<NativeStudioState>((state) => {
                state.settings = {
                    ...state.settings,
                    ...setting,
                };
            }),
        ),
    setScrubberPosition: (value) =>
        set(
            produce<NativeStudioState>((state) => {
                state.animation.scrubberPosition = value;
            }),
        ),
    setTextDrafts: (value) =>
        set(
            produce<NativeStudioState>((state) => {
                state.edit = {
                    ...state.edit,
                    ...value,
                };
            }),
        ),
    toggleNode: (nodeId) =>
        set(
            produce<NativeStudioState>((state) => {
                state.dom.expandedNodes[nodeId] = !state.dom.expandedNodes[nodeId];
            }),
        ),
    togglePanel: (panel) =>
        set(
            produce<NativeStudioState>((state) => {
                state.panels[panel] = !state.panels[panel];
            }),
        ),
}));
