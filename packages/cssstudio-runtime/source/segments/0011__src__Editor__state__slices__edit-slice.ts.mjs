// src/Editor/state/slices/edit-slice.ts
function coalesceOrPush(changes, change) {
  const last = changes[changes.length - 1];
  if (last && last.type === change.type && last.element === change.element && last.path === change.path && last.name === change.name) {
    const fromValue = last.value?.split(" \u2192 ")[0];
    const toValue = change.value?.split(" \u2192 ")[1];
    if (fromValue !== void 0 && toValue !== void 0) {
      if (fromValue === toValue) {
        changes.pop();
        return;
      }
      last.value = `${fromValue} \u2192 ${toValue}`;
    } else {
      last.value = change.value;
    }
  } else {
    changes.push(change);
  }
}
function coalesceKeyframeOrPush(changes, name, css2) {
  const last = changes[changes.length - 1];
  if (last && last.type === "keyframe" && last.name === name) {
    last.value = css2;
  } else {
    changes.push({ type: "keyframe", name, value: css2 });
  }
}
var createEditSlice = (set2, _get) => ({
  autoApply: false,
  editVersion: 0,
  pendingChanges: [],
  pendingChangesCopied: false,
  stagedChanges: [],
  applying: false,
  hasEverHadChanges: false,
  setAutoApply: (autoApply) => set2((state2) => {
    state2.autoApply = autoApply;
  }),
  queueEdit: (change) => set2((state2) => {
    state2.editVersion++;
    state2.hasEverHadChanges = true;
    if (state2.pendingChangesCopied) {
      state2.pendingChanges = [];
      state2.pendingChangesCopied = false;
    }
    coalesceOrPush(state2.pendingChanges, change);
    coalesceOrPush(state2.stagedChanges, change);
  }),
  clearPendingChanges: () => set2((state2) => {
    state2.pendingChangesCopied = true;
  }),
  clearStagedChanges: () => set2((state2) => {
    state2.stagedChanges = [];
  }),
  setApplying: (applying) => set2((state2) => {
    state2.applying = applying;
  })
});

