// src/Editor/state/slices/animation-slice.ts
function syncEntryTimeline(state2) {
  const i = state2.selectedAnimationIndex;
  if (i === null || !state2.animationEntries[i]) return;
  state2.animationEntries[i].timeline = buildTimelineValue({
    type: state2.animTimeline,
    scroller: state2.animScrollScroller,
    scrollAxis: state2.animScrollAxis,
    viewAxis: state2.animViewAxis
  });
}
function parseDurationToSeconds(value) {
  const match = value.match(/^([\d.]+)\s*(ms|s)?$/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  return match[2] === "ms" ? num / 1e3 : num;
}
function syncLegacyFields(state2, entry) {
  const parsed = parseTimelineValue(entry.timeline);
  state2.animTimeline = parsed.type;
  if (parsed.type === "scroll") {
    state2.animScrollScroller = parsed.scroller ?? "nearest";
    state2.animScrollAxis = parsed.axis ?? "block";
  } else if (parsed.type === "view") {
    state2.animViewAxis = parsed.axis ?? "block";
    state2.animViewInsetStart = entry.viewInsetStart;
    state2.animViewInsetEnd = entry.viewInsetEnd;
  }
  state2.animRangeStart = entry.rangeStart;
  state2.animRangeEnd = entry.rangeEnd;
}
function writeAnimCss(state2) {
  const writer = state2._animCssWriter;
  if (!writer) return;
  const props = buildAnimationProperties(state2.animationEntries);
  for (const [prop, value] of Object.entries(props)) {
    writer(prop, value);
  }
  if (state2.animationEntries.length === 0) {
    writer("animation-name", "none");
  }
}
function buildKeyframeCss(name, animations2) {
  const offsetMap = /* @__PURE__ */ new Map();
  const easingMap = /* @__PURE__ */ new Map();
  for (const anim of animations2) {
    for (const kf of Object.values(anim.keyframes)) {
      const existing = offsetMap.get(kf.offset) ?? {};
      const val = kf.properties[anim.propertyName];
      if (val !== void 0 && val !== "") {
        existing[anim.propertyName] = val;
      }
      offsetMap.set(kf.offset, existing);
      if (kf.easing) {
        easingMap.set(kf.offset, kf.easing);
      }
    }
  }
  const offsets = Array.from(offsetMap.keys()).sort((a, b) => a - b);
  const lines = [`@keyframes ${name} {`];
  for (const offset of offsets) {
    const props = offsetMap.get(offset);
    const easing = easingMap.get(offset);
    const pct = `${Math.round(offset * 100)}%`;
    const allDeclarations = Object.entries(props).map(([p, v]) => `${p}: ${v}`);
    if (easing) {
      allDeclarations.push(`animation-timing-function: ${easing}`);
    }
    lines.push(`  ${pct} { ${allDeclarations.join("; ")} }`);
  }
  lines.push("}");
  return lines.join("\n");
}
function queueKeyframeChange(state2) {
  const name = state2.selectedKeyframesName;
  if (!name) return;
  const css2 = buildKeyframeCss(name, state2.animValueAnimations);
  state2.editVersion++;
  state2.hasEverHadChanges = true;
  coalesceKeyframeOrPush(state2.pendingChanges, name, css2);
  coalesceKeyframeOrPush(state2.stagedChanges, name, css2);
}
var createAnimationSlice = (set2, _get) => ({
  keyframesRules: [],
  selectedKeyframesName: null,
  animValueAnimations: [],
  animSelectedKeyframes: [],
  animPlaybackOrigin: null,
  animScale: 200,
  animCurrentTime: 0,
  animDuration: 1,
  creatingAnimation: false,
  animTimeline: "auto",
  animScrollScroller: "nearest",
  animScrollAxis: "block",
  animViewAxis: "block",
  animViewInsetStart: "auto",
  animViewInsetEnd: "auto",
  animRangeStart: "normal",
  animRangeEnd: "normal",
  setKeyframesRules: (rules) => set2((state2) => {
    state2.keyframesRules = rules;
  }),
  selectKeyframesRule: (name) => set2((state2) => {
    state2.selectedKeyframesName = name;
    state2.animSelectedKeyframes = [];
    state2.animPlaybackOrigin = null;
    state2.animCurrentTime = 0;
    if (!name) {
      state2.animValueAnimations = [];
      return;
    }
    const rule = state2.keyframesRules.find((r) => r.name === name);
    if (!rule) {
      state2.animValueAnimations = [];
      return;
    }
    state2.animValueAnimations = rule.propertyNames.map((prop) => {
      const kfs = {};
      for (const stop of rule.stops) {
        if (prop in stop.properties) {
          kfs[stop.id] = stop;
        }
      }
      return {
        id: `${name}-${prop}`,
        propertyName: prop,
        keyframes: kfs,
        duration: state2.animDuration,
        delay: 0
      };
    });
  }),
  selectAnimKeyframe: (kf) => set2((state2) => {
    state2.animSelectedKeyframes = [kf];
  }),
  deselectAnimKeyframes: () => set2((state2) => {
    state2.animSelectedKeyframes = [];
  }),
  addAnimKeyframe: (propertyId, offset) => set2((state2) => {
    const anim = state2.animValueAnimations.find((a) => a.id === propertyId);
    if (!anim) return;
    const clamped = Math.max(0, Math.min(1, offset));
    const snapped = Math.round(clamped * 100) / 100;
    const id3 = crypto.randomUUID();
    let defaultValue = "";
    const kfs = Object.values(anim.keyframes).sort((a, b) => a.offset - b.offset);
    for (let i = kfs.length - 1; i >= 0; i--) {
      if (kfs[i].offset <= snapped) {
        defaultValue = kfs[i].properties[anim.propertyName] ?? "";
        break;
      }
    }
    if (!defaultValue && kfs.length > 0) {
      defaultValue = kfs[0].properties[anim.propertyName] ?? "";
    }
    anim.keyframes[id3] = {
      id: id3,
      offset: snapped,
      properties: { [anim.propertyName]: defaultValue },
      isEdited: false,
      isUserCreated: true
    };
    state2.animSelectedKeyframes = [{ propertyId, keyframeId: id3 }];
    queueKeyframeChange(state2);
  }),
  moveAnimKeyframe: (propertyId, keyframeId, offset) => set2((state2) => {
    const anim = state2.animValueAnimations.find((a) => a.id === propertyId);
    if (!anim) return;
    const kf = anim.keyframes[keyframeId];
    if (!kf) return;
    kf.offset = Math.max(0, Math.min(1, Math.round(offset * 100) / 100));
    kf.isEdited = true;
    queueKeyframeChange(state2);
  }),
  deleteAnimKeyframe: (kf) => set2((state2) => {
    const anim = state2.animValueAnimations.find((a) => a.id === kf.propertyId);
    if (!anim) return;
    delete anim.keyframes[kf.keyframeId];
    state2.animSelectedKeyframes = state2.animSelectedKeyframes.filter(
      (s) => s.keyframeId !== kf.keyframeId
    );
    queueKeyframeChange(state2);
  }),
  updateAnimKeyframeValue: (propertyId, keyframeId, value) => set2((state2) => {
    const anim = state2.animValueAnimations.find((a) => a.id === propertyId);
    if (!anim) return;
    const kf = anim.keyframes[keyframeId];
    if (!kf) return;
    kf.properties[anim.propertyName] = value;
    kf.isEdited = true;
    queueKeyframeChange(state2);
  }),
  updateAnimKeyframeEasing: (propertyId, keyframeId, easing, springConfig) => set2((state2) => {
    const anim = state2.animValueAnimations.find((a) => a.id === propertyId);
    if (!anim) return;
    const kf = anim.keyframes[keyframeId];
    if (!kf) return;
    kf.easing = easing;
    kf.springConfig = springConfig;
    kf.isEdited = true;
    for (const other of state2.animValueAnimations) {
      for (const otherKf of Object.values(other.keyframes)) {
        if (otherKf.offset === kf.offset) {
          otherKf.easing = easing;
          otherKf.springConfig = springConfig;
        }
      }
    }
    queueKeyframeChange(state2);
  }),
  renameAnimProperty: (propertyId, newName) => set2((state2) => {
    const anim = state2.animValueAnimations.find((a) => a.id === propertyId);
    if (!anim) return;
    const oldName = anim.propertyName;
    anim.propertyName = newName;
    anim.id = `${state2.selectedKeyframesName}-${newName}`;
    for (const kf of Object.values(anim.keyframes)) {
      if (oldName in kf.properties) {
        kf.properties[newName] = kf.properties[oldName];
        delete kf.properties[oldName];
        kf.isEdited = true;
      }
    }
    queueKeyframeChange(state2);
  }),
  addAnimProperty: (name) => set2((state2) => {
    const ruleName = state2.selectedKeyframesName;
    if (!ruleName) return;
    if (state2.animValueAnimations.some((a) => a.propertyName === name)) return;
    const id0 = crypto.randomUUID();
    const id1 = crypto.randomUUID();
    state2.animValueAnimations.push({
      id: `${ruleName}-${name}`,
      propertyName: name,
      keyframes: {
        [id0]: { id: id0, offset: 0, properties: { [name]: "" }, isEdited: false, isUserCreated: true },
        [id1]: { id: id1, offset: 1, properties: { [name]: "" }, isEdited: false, isUserCreated: true }
      },
      duration: state2.animDuration,
      delay: 0
    });
    queueKeyframeChange(state2);
  }),
  deleteAnimProperty: (propertyId) => set2((state2) => {
    state2.animValueAnimations = state2.animValueAnimations.filter((a) => a.id !== propertyId);
    state2.animSelectedKeyframes = state2.animSelectedKeyframes.filter((s) => s.propertyId !== propertyId);
    queueKeyframeChange(state2);
  }),
  setAnimValueAnimations: (anims) => set2((state2) => {
    state2.animValueAnimations = anims;
  }),
  animScrubTo: (time2) => set2((state2) => {
    if (state2.animCurrentTime !== time2) state2.animCurrentTime = time2;
  }),
  animStartPlaying: () => set2((state2) => {
    state2.animPlaybackOrigin = {
      startedAt: performance.now(),
      originTime: state2.animCurrentTime
    };
  }),
  animStopPlaying: () => set2((state2) => {
    state2.animPlaybackOrigin = null;
  }),
  setAnimDuration: (duration) => set2((state2) => {
    state2.animDuration = duration;
    for (const anim of state2.animValueAnimations) {
      anim.duration = duration;
    }
  }),
  setAnimTimeline: (type) => set2((state2) => {
    state2.animTimeline = type;
    state2.animPlaybackOrigin = null;
    state2.animCurrentTime = 0;
    syncEntryTimeline(state2);
  }),
  setAnimScrollScroller: (value) => set2((state2) => {
    state2.animScrollScroller = value;
    syncEntryTimeline(state2);
  }),
  setAnimScrollAxis: (value) => set2((state2) => {
    state2.animScrollAxis = value;
    syncEntryTimeline(state2);
  }),
  setAnimViewAxis: (value) => set2((state2) => {
    state2.animViewAxis = value;
    syncEntryTimeline(state2);
  }),
  setAnimViewInsetStart: (value) => set2((state2) => {
    state2.animViewInsetStart = value;
    const i = state2.selectedAnimationIndex;
    if (i !== null && state2.animationEntries[i]) {
      state2.animationEntries[i].viewInsetStart = value;
    }
  }),
  setAnimViewInsetEnd: (value) => set2((state2) => {
    state2.animViewInsetEnd = value;
    const i = state2.selectedAnimationIndex;
    if (i !== null && state2.animationEntries[i]) {
      state2.animationEntries[i].viewInsetEnd = value;
    }
  }),
  setAnimRangeStart: (value) => {
    set2((state2) => {
      state2.animRangeStart = value;
      const i = state2.selectedAnimationIndex;
      if (i !== null && state2.animationEntries[i]) {
        state2.animationEntries[i].rangeStart = value;
      }
    });
    writeAnimCss(_get());
  },
  setAnimRangeEnd: (value) => {
    set2((state2) => {
      state2.animRangeEnd = value;
      const i = state2.selectedAnimationIndex;
      if (i !== null && state2.animationEntries[i]) {
        state2.animationEntries[i].rangeEnd = value;
      }
    });
    writeAnimCss(_get());
  },
  createAnimation: () => set2((state2) => {
    state2.panels.timeline.open = true;
    state2.creatingAnimation = true;
  }),
  commitAnimationName: (name) => set2((state2) => {
    state2.creatingAnimation = false;
    if (!name) return;
    const id0 = crypto.randomUUID();
    const id1 = crypto.randomUUID();
    const newRule = {
      name,
      sourceHref: null,
      propertyNames: ["opacity"],
      userCreated: true,
      stops: [
        { id: id0, offset: 0, properties: { opacity: "1" }, isEdited: false },
        { id: id1, offset: 1, properties: { opacity: "1" }, isEdited: false }
      ]
    };
    state2.keyframesRules.push(newRule);
    state2.selectedKeyframesName = name;
    state2.animValueAnimations = [{
      id: `${name}-opacity`,
      propertyName: "opacity",
      keyframes: {
        [id0]: newRule.stops[0],
        [id1]: newRule.stops[1]
      },
      duration: state2.animDuration,
      delay: 0
    }];
    state2.animSelectedKeyframes = [];
    state2.animPlaybackOrigin = null;
    state2.animCurrentTime = 0;
    state2.editVersion++;
    state2.hasEverHadChanges = true;
    const kfChange = {
      type: "keyframe",
      name,
      value: `@keyframes ${name} {
  0% { opacity: 1 }
  100% { opacity: 1 }
}`
    };
    state2.pendingChanges.push(kfChange);
    state2.stagedChanges.push({ ...kfChange });
  }),
  cancelCreateAnimation: () => set2((state2) => {
    state2.creatingAnimation = false;
  }),
  // ── Multi-animation entry state ──
  animationEntries: [],
  selectedAnimationIndex: null,
  animPanelWasOpen: false,
  _animCssWriter: null,
  scrollPreviewActive: false,
  setAnimCssWriter: (fn) => set2((state2) => {
    state2._animCssWriter = fn;
  }),
  setScrollPreviewActive: (active) => set2((state2) => {
    state2.scrollPreviewActive = active;
  }),
  setAnimationEntries: (entries) => set2((state2) => {
    state2.animationEntries = entries;
  }),
  selectAnimationEntry: (index) => set2((state2) => {
    state2.selectedAnimationIndex = index;
    if (index === null) return;
    const entry = state2.animationEntries[index];
    if (!entry) return;
    if (!state2.panels.timeline.open) {
      state2.animPanelWasOpen = false;
      state2.panels.timeline.open = true;
    } else {
      state2.animPanelWasOpen = true;
    }
    syncLegacyFields(state2, entry);
    const dur = parseDurationToSeconds(entry.duration);
    if (dur > 0) {
      state2.animDuration = dur;
    }
    if (entry.name && entry.name !== "none") {
      const rule = state2.keyframesRules.find((r) => r.name === entry.name);
      if (rule) {
        state2.selectedKeyframesName = entry.name;
        state2.animSelectedKeyframes = [];
        state2.animPlaybackOrigin = null;
        state2.animCurrentTime = 0;
        state2.animValueAnimations = rule.propertyNames.map((prop) => {
          const kfs = {};
          for (const stop of rule.stops) {
            if (prop in stop.properties) {
              kfs[stop.id] = stop;
            }
          }
          return {
            id: `${entry.name}-${prop}`,
            propertyName: prop,
            keyframes: kfs,
            duration: state2.animDuration,
            delay: 0
          };
        });
      }
    }
  }),
  addAnimationEntry: (trigger) => {
    const entry = triggerDefaults(trigger);
    set2((state3) => {
      if (state3.keyframesRules.length > 0) {
        entry.name = state3.keyframesRules[0].name;
        state3.selectedKeyframesName = entry.name;
      }
      state3.animationEntries.push(entry);
      const index = state3.animationEntries.length - 1;
      state3.selectedAnimationIndex = index;
      if (!state3.panels.timeline.open) {
        state3.animPanelWasOpen = false;
        state3.panels.timeline.open = true;
      } else {
        state3.animPanelWasOpen = true;
      }
      syncLegacyFields(state3, entry);
    });
    const state2 = _get();
    writeAnimCss(state2);
  },
  removeAnimationEntry: (index) => {
    set2((state3) => {
      state3.animationEntries.splice(index, 1);
      if (state3.selectedAnimationIndex === index) {
        state3.selectedAnimationIndex = null;
        state3.selectedKeyframesName = null;
        state3.animValueAnimations = [];
        state3.animSelectedKeyframes = [];
        state3.animPlaybackOrigin = null;
        state3.animCurrentTime = 0;
      } else if (state3.selectedAnimationIndex !== null && state3.selectedAnimationIndex > index) {
        state3.selectedAnimationIndex--;
      }
      if (state3.animationEntries.length === 0) {
        state3.animTimeline = "auto";
        state3.animRangeStart = "normal";
        state3.animRangeEnd = "normal";
        state3.animViewInsetStart = "auto";
        state3.animViewInsetEnd = "auto";
      }
    });
    const state2 = _get();
    writeAnimCss(state2);
  },
  updateAnimationEntry: (index, updates) => {
    set2((state3) => {
      const entry = state3.animationEntries[index];
      if (!entry) return;
      Object.assign(entry, updates);
      if (state3.selectedAnimationIndex === index) {
        syncLegacyFields(state3, entry);
        if (updates.duration) {
          const dur = parseDurationToSeconds(entry.duration);
          if (dur > 0) state3.animDuration = dur;
        }
      }
    });
    const state2 = _get();
    writeAnimCss(state2);
  },
  closeAnimationEntry: () => set2((state2) => {
    state2.selectedAnimationIndex = null;
    if (!state2.animPanelWasOpen) {
      state2.panels.timeline.open = false;
    }
  })
});

