// src/Editor/state/use-animation-edits.ts
import { useCallback as useCallback39, useRef as useRef34 } from "react";
function snapshot() {
  const state2 = useStore2.getState();
  const name = state2.selectedKeyframesName ?? "";
  const anims = structuredClone(state2.animValueAnimations);
  const css2 = name ? buildKeyframeCss(name, anims) : "";
  return { css: css2, anims };
}
function pushUndo(before, after) {
  const name = useStore2.getState().selectedKeyframesName;
  if (!name) return;
  if (before.css === after.css) return;
  useUndoStore.getState().push({
    type: "keyframe",
    nodeId: null,
    property: name,
    oldValue: before.css,
    newValue: after.css,
    oldAnimSnapshot: before.anims,
    newAnimSnapshot: after.anims
  });
}
function useAnimationEdits() {
  const dragSnapshotRef = useRef34(null);
  const beginDrag = useCallback39(() => {
    dragSnapshotRef.current = snapshot();
  }, []);
  const endDrag2 = useCallback39(() => {
    const before = dragSnapshotRef.current;
    if (!before) return;
    dragSnapshotRef.current = null;
    pushUndo(before, snapshot());
  }, []);
  const addKeyframe = useCallback39((propertyId, offset) => {
    const before = snapshot();
    useStore2.getState().addAnimKeyframe(propertyId, offset);
    pushUndo(before, snapshot());
  }, []);
  const moveKeyframe = useCallback39((propertyId, keyframeId, offset) => {
    useStore2.getState().moveAnimKeyframe(propertyId, keyframeId, offset);
  }, []);
  const deleteKeyframe = useCallback39((kf) => {
    const before = snapshot();
    useStore2.getState().deleteAnimKeyframe(kf);
    pushUndo(before, snapshot());
  }, []);
  const updateKeyframeValue = useCallback39((propertyId, keyframeId, value) => {
    const before = snapshot();
    useStore2.getState().updateAnimKeyframeValue(propertyId, keyframeId, value);
    pushUndo(before, snapshot());
  }, []);
  const updateKeyframeEasing = useCallback39((propertyId, keyframeId, easing, springConfig) => {
    const before = snapshot();
    useStore2.getState().updateAnimKeyframeEasing(propertyId, keyframeId, easing, springConfig);
    pushUndo(before, snapshot());
  }, []);
  const renameProperty = useCallback39((propertyId, newName) => {
    const before = snapshot();
    useStore2.getState().renameAnimProperty(propertyId, newName);
    pushUndo(before, snapshot());
  }, []);
  const addProperty = useCallback39((name) => {
    const before = snapshot();
    useStore2.getState().addAnimProperty(name);
    pushUndo(before, snapshot());
  }, []);
  const deleteProperty = useCallback39((propertyId) => {
    const before = snapshot();
    useStore2.getState().deleteAnimProperty(propertyId);
    pushUndo(before, snapshot());
  }, []);
  return {
    addKeyframe,
    moveKeyframe,
    deleteKeyframe,
    updateKeyframeValue,
    updateKeyframeEasing,
    renameProperty,
    addProperty,
    deleteProperty,
    beginDrag,
    endDrag: endDrag2
  };
}

