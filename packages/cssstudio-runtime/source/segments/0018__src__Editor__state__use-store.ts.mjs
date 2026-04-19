// src/Editor/state/use-store.ts
var useStore2 = create()(
  immer2((rawSet, get) => {
    const set2 = (fn) => rawSet((state2) => {
      fn(state2);
      state2.selectedNodeId = state2.selectedNodeIds.at(-1) ?? null;
    });
    return {
      ...createDomSlice(set2, get),
      ...createStylesSlice(set2, get),
      ...createUiSlice(set2, get),
      ...createEditSlice(set2, get),
      ...createAuthSlice(set2, get),
      ...createChatSlice(set2, get),
      ...createAnimationSlice(set2, get),
      ...createErrorSlice(set2, get),
      ...createPanelsSlice(set2, get)
    };
  })
);

