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
import { createResponsiveSlice, type ResponsiveSlice } from './slices/responsive-slice';
import { createTasksSlice, type TasksSlice } from './slices/tasks-slice';

export type StoreState = DomSlice & StylesSlice & UiSlice & EditSlice & AuthSlice & ChatSlice & AnimationSlice & ErrorSlice & PanelsSlice & ResponsiveSlice & TasksSlice;

export const useStore = create<StoreState>()(
    immer((rawSet, get, store) => {
        const set = (fn: (state: StoreState) => void) =>
            rawSet((state) => {
                fn(state);
                (state as any).selectedNodeId = (state as any).selectedNodeIds.at(-1) ?? null;
            });

        return {
            ...createDomSlice(set, get, store),
            ...createStylesSlice(set, get, store),
            ...createUiSlice(set, get, store),
            ...createEditSlice(set, get, store),
            ...createAuthSlice(set, get, store),
            ...createChatSlice(set, get, store),
            ...createAnimationSlice(set, get, store),
            ...createErrorSlice(set, get, store),
            ...createPanelsSlice(set, get, store),
            ...createResponsiveSlice(set, get, store),
            ...createTasksSlice(set, get, store),
        };
    }),
);
