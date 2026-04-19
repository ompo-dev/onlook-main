import type { StateCreator } from 'zustand';
import { buildTimelineValue, parseTimelineValue, buildAnimationProperties, triggerDefaults, type AnimationEntry, type TriggerType } from '../types';
import { coalesceKeyframeOrPush } from './edit-slice';

export interface KeyframeStop {
    id: string;
    offset: number;
    properties: Record<string, string>;
    isEdited: boolean;
    isUserCreated?: boolean;
    easing?: string;
    springConfig?: unknown;
    [key: string]: unknown;
}

export interface KeyframesRule {
    name: string;
    sourceHref: string | null;
    propertyNames: string[];
    userCreated?: boolean;
    stops: KeyframeStop[];
}

export interface ValueAnimation {
    id: string;
    propertyName: string;
    keyframes: Record<string, KeyframeStop>;
    duration: number;
    delay: number;
}

export interface SelectedKeyframe {
    propertyId: string;
    keyframeId: string;
}

export interface AnimationSlice {
    keyframesRules: KeyframesRule[];
    selectedKeyframesName: string | null;
    animValueAnimations: ValueAnimation[];
    animSelectedKeyframes: SelectedKeyframe[];
    animPlaybackOrigin: { startedAt: number; originTime: number } | null;
    animScale: number;
    animCurrentTime: number;
    animDuration: number;
    creatingAnimation: boolean;
    animTimeline: string;
    animScrollScroller: string;
    animScrollAxis: string;
    animViewAxis: string;
    animViewInsetStart: string;
    animViewInsetEnd: string;
    animRangeStart: string;
    animRangeEnd: string;
    animationEntries: AnimationEntry[];
    selectedAnimationIndex: number | null;
    animPanelWasOpen: boolean;
    _animCssWriter: ((prop: string, value: string) => void) | null;
    scrollPreviewActive: boolean;
    setKeyframesRules: (rules: KeyframesRule[]) => void;
    selectKeyframesRule: (name: string | null) => void;
    selectAnimKeyframe: (kf: SelectedKeyframe) => void;
    deselectAnimKeyframes: () => void;
    addAnimKeyframe: (propertyId: string, offset: number) => void;
    moveAnimKeyframe: (propertyId: string, keyframeId: string, offset: number) => void;
    deleteAnimKeyframe: (kf: SelectedKeyframe) => void;
    updateAnimKeyframeValue: (propertyId: string, keyframeId: string, value: string) => void;
    updateAnimKeyframeEasing: (propertyId: string, keyframeId: string, easing: string, springConfig?: unknown) => void;
    renameAnimProperty: (propertyId: string, newName: string) => void;
    addAnimProperty: (name: string) => void;
    deleteAnimProperty: (propertyId: string) => void;
    setAnimValueAnimations: (anims: ValueAnimation[]) => void;
    animScrubTo: (time: number) => void;
    animStartPlaying: () => void;
    animStopPlaying: () => void;
    setAnimDuration: (duration: number) => void;
    setAnimTimeline: (type: string) => void;
    setAnimScrollScroller: (value: string) => void;
    setAnimScrollAxis: (value: string) => void;
    setAnimViewAxis: (value: string) => void;
    setAnimViewInsetStart: (value: string) => void;
    setAnimViewInsetEnd: (value: string) => void;
    setAnimRangeStart: (value: string) => void;
    setAnimRangeEnd: (value: string) => void;
    createAnimation: () => void;
    commitAnimationName: (name: string) => void;
    cancelCreateAnimation: () => void;
    setAnimCssWriter: (fn: ((prop: string, value: string) => void) | null) => void;
    setScrollPreviewActive: (active: boolean) => void;
    setAnimationEntries: (entries: AnimationEntry[]) => void;
    selectAnimationEntry: (index: number | null) => void;
    addAnimationEntry: (trigger: TriggerType) => void;
    removeAnimationEntry: (index: number) => void;
    updateAnimationEntry: (index: number, updates: Partial<AnimationEntry>) => void;
    closeAnimationEntry: () => void;
}

export function buildKeyframeCss(name: string, animations: ValueAnimation[]): string {
    const offsetMap = new Map<number, Record<string, string>>();
    const easingMap = new Map<number, string>();
    for (const anim of animations) {
        for (const kf of Object.values(anim.keyframes)) {
            const existing = offsetMap.get(kf.offset) ?? {};
            const val = kf.properties[anim.propertyName];
            if (val !== undefined && val !== '') existing[anim.propertyName] = val;
            offsetMap.set(kf.offset, existing);
            if (kf.easing) easingMap.set(kf.offset, kf.easing);
        }
    }
    const offsets = Array.from(offsetMap.keys()).sort((a, b) => a - b);
    const lines = [`@keyframes ${name} {`];
    for (const offset of offsets) {
        const props = offsetMap.get(offset)!;
        const easing = easingMap.get(offset);
        const pct = `${Math.round(offset * 100)}%`;
        const decls = Object.entries(props).map(([p, v]) => `${p}: ${v}`);
        if (easing) decls.push(`animation-timing-function: ${easing}`);
        lines.push(`  ${pct} { ${decls.join('; ')} }`);
    }
    lines.push('}');
    return lines.join('\n');
}

export const createAnimationSlice: StateCreator<any, [['zustand/immer', never]], [], AnimationSlice> = (set, get) => ({
    keyframesRules: [],
    selectedKeyframesName: null,
    animValueAnimations: [],
    animSelectedKeyframes: [],
    animPlaybackOrigin: null,
    animScale: 200,
    animCurrentTime: 0,
    animDuration: 1,
    creatingAnimation: false,
    animTimeline: 'auto',
    animScrollScroller: 'nearest',
    animScrollAxis: 'block',
    animViewAxis: 'block',
    animViewInsetStart: 'auto',
    animViewInsetEnd: 'auto',
    animRangeStart: 'normal',
    animRangeEnd: 'normal',
    animationEntries: [],
    selectedAnimationIndex: null,
    animPanelWasOpen: false,
    _animCssWriter: null,
    scrollPreviewActive: false,

    setKeyframesRules: (rules) => set((s: any) => { s.keyframesRules = rules; }),
    selectKeyframesRule: (name) => set((s: any) => {
        s.selectedKeyframesName = name;
        s.animSelectedKeyframes = [];
        s.animPlaybackOrigin = null;
        s.animCurrentTime = 0;
        if (!name) { s.animValueAnimations = []; return; }
        const rule = s.keyframesRules.find((r: KeyframesRule) => r.name === name);
        if (!rule) { s.animValueAnimations = []; return; }
        s.animValueAnimations = rule.propertyNames.map((prop: string) => {
            const kfs: Record<string, KeyframeStop> = {};
            for (const stop of rule.stops) { if (prop in stop.properties) kfs[stop.id] = stop; }
            return { id: `${name}-${prop}`, propertyName: prop, keyframes: kfs, duration: s.animDuration, delay: 0 };
        });
    }),
    selectAnimKeyframe: (kf) => set((s: any) => { s.animSelectedKeyframes = [kf]; }),
    deselectAnimKeyframes: () => set((s: any) => { s.animSelectedKeyframes = []; }),
    addAnimKeyframe: (propertyId, offset) => set((s: any) => {
        const anim = s.animValueAnimations.find((a: ValueAnimation) => a.id === propertyId);
        if (!anim) return;
        const snapped = Math.round(Math.max(0, Math.min(1, offset)) * 100) / 100;
        const id = crypto.randomUUID();
        const kfs = Object.values(anim.keyframes).sort((a: any, b: any) => a.offset - b.offset);
        let defaultValue = '';
        for (let i = kfs.length - 1; i >= 0; i--) {
            if ((kfs[i] as KeyframeStop).offset <= snapped) { defaultValue = (kfs[i] as KeyframeStop).properties[anim.propertyName] ?? ''; break; }
        }
        if (!defaultValue && kfs.length > 0) defaultValue = (kfs[0] as KeyframeStop).properties[anim.propertyName] ?? '';
        anim.keyframes[id] = { id, offset: snapped, properties: { [anim.propertyName]: defaultValue }, isEdited: false, isUserCreated: true };
        s.animSelectedKeyframes = [{ propertyId, keyframeId: id }];
        s.editVersion++; s.hasEverHadChanges = true;
        const css = buildKeyframeCss(s.selectedKeyframesName, s.animValueAnimations);
        coalesceKeyframeOrPush(s.pendingChanges, s.selectedKeyframesName, css);
        coalesceKeyframeOrPush(s.stagedChanges, s.selectedKeyframesName, css);
    }),
    moveAnimKeyframe: (propertyId, keyframeId, offset) => set((s: any) => {
        const anim = s.animValueAnimations.find((a: ValueAnimation) => a.id === propertyId);
        if (!anim) return;
        const kf = anim.keyframes[keyframeId];
        if (!kf) return;
        kf.offset = Math.max(0, Math.min(1, Math.round(offset * 100) / 100));
        kf.isEdited = true;
        const css = buildKeyframeCss(s.selectedKeyframesName, s.animValueAnimations);
        s.editVersion++; s.hasEverHadChanges = true;
        coalesceKeyframeOrPush(s.pendingChanges, s.selectedKeyframesName, css);
        coalesceKeyframeOrPush(s.stagedChanges, s.selectedKeyframesName, css);
    }),
    deleteAnimKeyframe: (kf) => set((s: any) => {
        const anim = s.animValueAnimations.find((a: ValueAnimation) => a.id === kf.propertyId);
        if (!anim) return;
        delete anim.keyframes[kf.keyframeId];
        s.animSelectedKeyframes = s.animSelectedKeyframes.filter((sel: SelectedKeyframe) => sel.keyframeId !== kf.keyframeId);
        const css = buildKeyframeCss(s.selectedKeyframesName, s.animValueAnimations);
        s.editVersion++; s.hasEverHadChanges = true;
        coalesceKeyframeOrPush(s.pendingChanges, s.selectedKeyframesName, css);
        coalesceKeyframeOrPush(s.stagedChanges, s.selectedKeyframesName, css);
    }),
    updateAnimKeyframeValue: (propertyId, keyframeId, value) => set((s: any) => {
        const anim = s.animValueAnimations.find((a: ValueAnimation) => a.id === propertyId);
        if (!anim) return;
        const kf = anim.keyframes[keyframeId];
        if (!kf) return;
        kf.properties[anim.propertyName] = value; kf.isEdited = true;
        const css = buildKeyframeCss(s.selectedKeyframesName, s.animValueAnimations);
        s.editVersion++; s.hasEverHadChanges = true;
        coalesceKeyframeOrPush(s.pendingChanges, s.selectedKeyframesName, css);
        coalesceKeyframeOrPush(s.stagedChanges, s.selectedKeyframesName, css);
    }),
    updateAnimKeyframeEasing: (propertyId, keyframeId, easing, springConfig) => set((s: any) => {
        const anim = s.animValueAnimations.find((a: ValueAnimation) => a.id === propertyId);
        if (!anim) return;
        const kf = anim.keyframes[keyframeId];
        if (!kf) return;
        kf.easing = easing; kf.springConfig = springConfig; kf.isEdited = true;
        for (const other of s.animValueAnimations) {
            for (const otherKf of Object.values(other.keyframes) as KeyframeStop[]) {
                if (otherKf.offset === kf.offset) { otherKf.easing = easing; otherKf.springConfig = springConfig; }
            }
        }
        const css = buildKeyframeCss(s.selectedKeyframesName, s.animValueAnimations);
        s.editVersion++; s.hasEverHadChanges = true;
        coalesceKeyframeOrPush(s.pendingChanges, s.selectedKeyframesName, css);
        coalesceKeyframeOrPush(s.stagedChanges, s.selectedKeyframesName, css);
    }),
    renameAnimProperty: (propertyId, newName) => set((s: any) => {
        const anim = s.animValueAnimations.find((a: ValueAnimation) => a.id === propertyId);
        if (!anim) return;
        const oldName = anim.propertyName;
        anim.propertyName = newName;
        anim.id = `${s.selectedKeyframesName}-${newName}`;
        for (const kf of Object.values(anim.keyframes) as KeyframeStop[]) {
            if (oldName in kf.properties) { kf.properties[newName] = kf.properties[oldName]!; delete kf.properties[oldName]; kf.isEdited = true; }
        }
        const css = buildKeyframeCss(s.selectedKeyframesName, s.animValueAnimations);
        s.editVersion++; s.hasEverHadChanges = true;
        coalesceKeyframeOrPush(s.pendingChanges, s.selectedKeyframesName, css);
        coalesceKeyframeOrPush(s.stagedChanges, s.selectedKeyframesName, css);
    }),
    addAnimProperty: (name) => set((s: any) => {
        if (s.animValueAnimations.some((a: ValueAnimation) => a.propertyName === name)) return;
        const id0 = crypto.randomUUID(), id1 = crypto.randomUUID();
        s.animValueAnimations.push({
            id: `${s.selectedKeyframesName}-${name}`, propertyName: name,
            keyframes: {
                [id0]: { id: id0, offset: 0, properties: { [name]: '' }, isEdited: false, isUserCreated: true },
                [id1]: { id: id1, offset: 1, properties: { [name]: '' }, isEdited: false, isUserCreated: true },
            },
            duration: s.animDuration, delay: 0,
        });
        const css = buildKeyframeCss(s.selectedKeyframesName, s.animValueAnimations);
        s.editVersion++; s.hasEverHadChanges = true;
        coalesceKeyframeOrPush(s.pendingChanges, s.selectedKeyframesName, css);
        coalesceKeyframeOrPush(s.stagedChanges, s.selectedKeyframesName, css);
    }),
    deleteAnimProperty: (propertyId) => set((s: any) => {
        s.animValueAnimations = s.animValueAnimations.filter((a: ValueAnimation) => a.id !== propertyId);
        s.animSelectedKeyframes = s.animSelectedKeyframes.filter((sel: SelectedKeyframe) => sel.propertyId !== propertyId);
        const css = buildKeyframeCss(s.selectedKeyframesName, s.animValueAnimations);
        s.editVersion++; s.hasEverHadChanges = true;
        coalesceKeyframeOrPush(s.pendingChanges, s.selectedKeyframesName, css);
        coalesceKeyframeOrPush(s.stagedChanges, s.selectedKeyframesName, css);
    }),
    setAnimValueAnimations: (anims) => set((s: any) => { s.animValueAnimations = anims; }),
    animScrubTo: (time) => set((s: any) => { if (s.animCurrentTime !== time) s.animCurrentTime = time; }),
    animStartPlaying: () => set((s: any) => { s.animPlaybackOrigin = { startedAt: performance.now(), originTime: s.animCurrentTime }; }),
    animStopPlaying: () => set((s: any) => { s.animPlaybackOrigin = null; }),
    setAnimDuration: (duration) => set((s: any) => { s.animDuration = duration; for (const a of s.animValueAnimations) a.duration = duration; }),
    setAnimTimeline: (type) => set((s: any) => {
        s.animTimeline = type; s.animPlaybackOrigin = null; s.animCurrentTime = 0;
        const i = s.selectedAnimationIndex;
        if (i !== null && s.animationEntries[i]) {
            s.animationEntries[i].timeline = buildTimelineValue({ type, scroller: s.animScrollScroller, scrollAxis: s.animScrollAxis, viewAxis: s.animViewAxis });
        }
    }),
    setAnimScrollScroller: (value) => set((s: any) => {
        s.animScrollScroller = value;
        const i = s.selectedAnimationIndex;
        if (i !== null && s.animationEntries[i]) s.animationEntries[i].timeline = buildTimelineValue({ type: s.animTimeline, scroller: value, scrollAxis: s.animScrollAxis, viewAxis: s.animViewAxis });
    }),
    setAnimScrollAxis: (value) => set((s: any) => {
        s.animScrollAxis = value;
        const i = s.selectedAnimationIndex;
        if (i !== null && s.animationEntries[i]) s.animationEntries[i].timeline = buildTimelineValue({ type: s.animTimeline, scroller: s.animScrollScroller, scrollAxis: value, viewAxis: s.animViewAxis });
    }),
    setAnimViewAxis: (value) => set((s: any) => {
        s.animViewAxis = value;
        const i = s.selectedAnimationIndex;
        if (i !== null && s.animationEntries[i]) s.animationEntries[i].timeline = buildTimelineValue({ type: s.animTimeline, scroller: s.animScrollScroller, scrollAxis: s.animScrollAxis, viewAxis: value });
    }),
    setAnimViewInsetStart: (value) => set((s: any) => {
        s.animViewInsetStart = value;
        const i = s.selectedAnimationIndex;
        if (i !== null && s.animationEntries[i]) s.animationEntries[i].viewInsetStart = value;
    }),
    setAnimViewInsetEnd: (value) => set((s: any) => {
        s.animViewInsetEnd = value;
        const i = s.selectedAnimationIndex;
        if (i !== null && s.animationEntries[i]) s.animationEntries[i].viewInsetEnd = value;
    }),
    setAnimRangeStart: (value) => set((s: any) => {
        s.animRangeStart = value;
        const i = s.selectedAnimationIndex;
        if (i !== null && s.animationEntries[i]) { s.animationEntries[i].rangeStart = value; }
    }),
    setAnimRangeEnd: (value) => set((s: any) => {
        s.animRangeEnd = value;
        const i = s.selectedAnimationIndex;
        if (i !== null && s.animationEntries[i]) { s.animationEntries[i].rangeEnd = value; }
    }),
    createAnimation: () => set((s: any) => { s.panels.timeline.open = true; s.creatingAnimation = true; }),
    commitAnimationName: (name) => set((s: any) => {
        s.creatingAnimation = false;
        if (!name) return;
        const id0 = crypto.randomUUID(), id1 = crypto.randomUUID();
        const newRule: KeyframesRule = {
            name, sourceHref: null, propertyNames: ['opacity'], userCreated: true,
            stops: [
                { id: id0, offset: 0, properties: { opacity: '1' }, isEdited: false },
                { id: id1, offset: 1, properties: { opacity: '1' }, isEdited: false },
            ],
        };
        s.keyframesRules.push(newRule);
        s.selectedKeyframesName = name;
        s.animValueAnimations = [{ id: `${name}-opacity`, propertyName: 'opacity', keyframes: { [id0]: newRule.stops[0], [id1]: newRule.stops[1] }, duration: s.animDuration, delay: 0 }];
        s.animSelectedKeyframes = []; s.animPlaybackOrigin = null; s.animCurrentTime = 0;
        s.editVersion++; s.hasEverHadChanges = true;
        const kfChange: any = { type: 'keyframe', name, value: `@keyframes ${name} {\n  0% { opacity: 1 }\n  100% { opacity: 1 }\n}` };
        s.pendingChanges.push(kfChange); s.stagedChanges.push({ ...kfChange });
    }),
    cancelCreateAnimation: () => set((s: any) => { s.creatingAnimation = false; }),
    setAnimCssWriter: (fn) => set((s: any) => { s._animCssWriter = fn; }),
    setScrollPreviewActive: (active) => set((s: any) => { s.scrollPreviewActive = active; }),
    setAnimationEntries: (entries) => set((s: any) => { s.animationEntries = entries; }),
    selectAnimationEntry: (index) => set((s: any) => {
        s.selectedAnimationIndex = index;
        if (index === null) return;
        const entry = s.animationEntries[index];
        if (!entry) return;
        if (!s.panels.timeline.open) { s.animPanelWasOpen = false; s.panels.timeline.open = true; } else { s.animPanelWasOpen = true; }
        const parsed = parseTimelineValue(entry.timeline);
        s.animTimeline = parsed.type;
    }),
    addAnimationEntry: (trigger) => {
        const entry = triggerDefaults(trigger);
        set((s: any) => {
            if (s.keyframesRules.length > 0) { entry.name = s.keyframesRules[0].name; s.selectedKeyframesName = entry.name; }
            s.animationEntries.push(entry);
            const index = s.animationEntries.length - 1;
            s.selectedAnimationIndex = index;
            if (!s.panels.timeline.open) { s.animPanelWasOpen = false; s.panels.timeline.open = true; } else { s.animPanelWasOpen = true; }
        });
        const state = get() as any;
        if (state._animCssWriter) {
            const props = buildAnimationProperties(state.animationEntries);
            for (const [prop, value] of Object.entries(props)) state._animCssWriter(prop, value);
        }
    },
    removeAnimationEntry: (index) => {
        set((s: any) => {
            s.animationEntries.splice(index, 1);
            if (s.selectedAnimationIndex === index) {
                s.selectedAnimationIndex = null; s.selectedKeyframesName = null;
                s.animValueAnimations = []; s.animSelectedKeyframes = []; s.animPlaybackOrigin = null; s.animCurrentTime = 0;
            } else if (s.selectedAnimationIndex !== null && s.selectedAnimationIndex > index) {
                s.selectedAnimationIndex--;
            }
        });
        const state = get() as any;
        if (state._animCssWriter) {
            const props = buildAnimationProperties(state.animationEntries);
            for (const [prop, value] of Object.entries(props)) state._animCssWriter(prop, value);
            if (state.animationEntries.length === 0) state._animCssWriter('animation-name', 'none');
        }
    },
    updateAnimationEntry: (index, updates) => {
        set((s: any) => {
            const entry = s.animationEntries[index];
            if (!entry) return;
            Object.assign(entry, updates);
        });
        const state = get() as any;
        if (state._animCssWriter) {
            const props = buildAnimationProperties(state.animationEntries);
            for (const [prop, value] of Object.entries(props)) state._animCssWriter(prop, value);
        }
    },
    closeAnimationEntry: () => set((s: any) => {
        s.selectedAnimationIndex = null;
        if (!s.animPanelWasOpen) s.panels.timeline.open = false;
    }),
});
