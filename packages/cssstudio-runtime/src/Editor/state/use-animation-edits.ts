import { useCallback, useRef } from 'react';
import { useStore } from './use-store';
import { useUndoStore, type KeyframeOp } from './use-undo';
import { buildKeyframeCss } from './slices/animation-slice';
import type { ValueAnimation } from './slices/animation-slice';

interface AnimSnapshot {
    css: string;
    anims: ValueAnimation[];
}

function snapshot(): AnimSnapshot {
    const state = useStore.getState();
    const name = state.selectedKeyframesName ?? '';
    const anims = structuredClone(state.animValueAnimations);
    const css = name ? buildKeyframeCss(name, anims) : '';
    return { css, anims };
}

function pushUndo(before: AnimSnapshot, after: AnimSnapshot) {
    const name = useStore.getState().selectedKeyframesName;
    if (!name) return;
    if (before.css === after.css) return;
    const op: KeyframeOp = {
        type: 'keyframe',
        nodeId: null,
        property: name,
        oldValue: before.css,
        newValue: after.css,
        oldAnimSnapshot: before.anims,
        newAnimSnapshot: after.anims,
    };
    useUndoStore.getState().push(op);
}

export function useAnimationEdits() {
    const dragSnapshotRef = useRef<AnimSnapshot | null>(null);

    const beginDrag = useCallback(() => {
        dragSnapshotRef.current = snapshot();
    }, []);

    const endDrag = useCallback(() => {
        const before = dragSnapshotRef.current;
        if (!before) return;
        dragSnapshotRef.current = null;
        pushUndo(before, snapshot());
    }, []);

    const addKeyframe = useCallback((propertyId: string, offset: number) => {
        const before = snapshot();
        useStore.getState().addAnimKeyframe(propertyId, offset);
        pushUndo(before, snapshot());
    }, []);

    const moveKeyframe = useCallback((propertyId: string, keyframeId: string, offset: number) => {
        useStore.getState().moveAnimKeyframe(propertyId, keyframeId, offset);
    }, []);

    const deleteKeyframe = useCallback((kf: { propertyId: string; keyframeId: string }) => {
        const before = snapshot();
        useStore.getState().deleteAnimKeyframe(kf);
        pushUndo(before, snapshot());
    }, []);

    const updateKeyframeValue = useCallback((propertyId: string, keyframeId: string, value: string) => {
        const before = snapshot();
        useStore.getState().updateAnimKeyframeValue(propertyId, keyframeId, value);
        pushUndo(before, snapshot());
    }, []);

    const updateKeyframeEasing = useCallback((propertyId: string, keyframeId: string, easing: string | undefined, springConfig?: unknown) => {
        const before = snapshot();
        useStore.getState().updateAnimKeyframeEasing(propertyId, keyframeId, easing, springConfig);
        pushUndo(before, snapshot());
    }, []);

    const renameProperty = useCallback((propertyId: string, newName: string) => {
        const before = snapshot();
        useStore.getState().renameAnimProperty(propertyId, newName);
        pushUndo(before, snapshot());
    }, []);

    const addProperty = useCallback((name: string) => {
        const before = snapshot();
        useStore.getState().addAnimProperty(name);
        pushUndo(before, snapshot());
    }, []);

    const deleteProperty = useCallback((propertyId: string) => {
        const before = snapshot();
        useStore.getState().deleteAnimProperty(propertyId);
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
        endDrag,
    };
}
