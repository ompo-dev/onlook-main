import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createDomSlice, type DomSlice } from './slices/dom-slice';
import { createStylesSlice, type StylesSlice } from './slices/styles-slice';
import { createUiSlice, type UiSlice } from './slices/ui-slice';
import { createEditSlice, type EditSlice } from './slices/edit-slice';
import { createAuthSlice, type AuthSlice } from './slices/auth-slice';
import { createChatSlice, type ChatSlice } from './slices/chat-slice';
import { createAnimationSlice, type AnimationSlice } from './slices/animation-slice';
import { createErrorSlice, type ErrorSlice } from './slices/error-slice';
import { createPanelsSlice, type PanelsSlice } from './slices/panels-slice';

export type StoreState = DomSlice & StylesSlice & UiSlice & EditSlice & AuthSlice & ChatSlice & AnimationSlice & ErrorSlice & PanelsSlice;

export const useStore = create<StoreState>()(
    immer((rawSet, get) => {
        const set = (fn: (state: StoreState) => void) =>
            rawSet((state) => {
                fn(state);
                (state as any).selectedNodeId = (state as any).selectedNodeIds.at(-1) ?? null;
            });

        return {
            ...createDomSlice(set, get, rawSet, {} as any),
            ...createStylesSlice(set, get, rawSet, {} as any),
            ...createUiSlice(set, get, rawSet, {} as any),
            ...createEditSlice(set, get, rawSet, {} as any),
            ...createAuthSlice(set, get, rawSet, {} as any),
            ...createChatSlice(set, get, rawSet, {} as any),
            ...createAnimationSlice(set, get, rawSet, {} as any),
            ...createErrorSlice(set, get, rawSet, {} as any),
            ...createPanelsSlice(set, get, rawSet, {} as any),
        };
    }),
);
