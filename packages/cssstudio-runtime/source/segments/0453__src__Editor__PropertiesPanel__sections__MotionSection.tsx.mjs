// src/Editor/PropertiesPanel/sections/MotionSection.tsx
import { Fragment as Fragment23, jsx as jsx57, jsxs as jsxs42 } from "react/jsx-runtime";
function extractBezier2(timingFunction) {
  const named = NAMED_EASINGS[timingFunction];
  if (named) return named;
  const match = timingFunction.match(
    /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/
  );
  if (match) {
    return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]), parseFloat(match[4])];
  }
  return null;
}
function matchesNamedEasing2(bezier) {
  for (const [name, values] of Object.entries(NAMED_EASINGS)) {
    if (bezier[0] === values[0] && bezier[1] === values[1] && bezier[2] === values[2] && bezier[3] === values[3]) return name;
  }
  return "custom";
}
function getEasingLabel(bezier, timingFunction, springConfig) {
  if (springConfig) return "spring";
  if (bezier) return matchesNamedEasing2(bezier);
  return timingFunction;
}
var MOTION_LABELS = {
  transition: "Transition",
  ...TRIGGER_LABELS
};
var FILL_OPTIONS = ["none", "forwards", "backwards", "both"];
var DIRECTION_OPTIONS = ["normal", "reverse", "alternate", "alternate-reverse"];
var DURATION_UNITS = [
  { unit: "s", min: 0, max: 20, step: 0.1 },
  { unit: "ms", min: 0, max: 2e4, step: 100 }
];
var DELAY_UNITS = [
  { unit: "s", min: -10, max: 10, step: 0.1 },
  { unit: "ms", min: -1e4, max: 1e4, step: 100 }
];
var TimelineIcon = /* @__PURE__ */ jsxs42("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ jsx57("path", { d: "M6 5h12" }),
  /* @__PURE__ */ jsx57("path", { d: "M4 12h10" }),
  /* @__PURE__ */ jsx57("path", { d: "M12 19h8" })
] });
function hasNonDefaultSecondary(entry) {
  const defaults = triggerDefaults(entry.trigger);
  return entry.fillMode !== defaults.fillMode || entry.iterationCount !== defaults.iterationCount || entry.direction !== defaults.direction || entry.axis !== defaults.axis || entry.scroller !== defaults.scroller || entry.rangeStart !== defaults.rangeStart || entry.rangeEnd !== defaults.rangeEnd || entry.viewInsetStart !== defaults.viewInsetStart || entry.viewInsetEnd !== defaults.viewInsetEnd;
}
function MotionSection({ getValue, onChange, onFocus }) {
  const filter2 = useFilter();
  const f = (name) => matchesFilter(name, filter2);
  const transitions = useMemo18(() => {
    const parsed = parseTransitions(getValue);
    if (parsed.length === 1 && (parsed[0].property === "none" || parsed[0].property === "all" && parsed[0].duration === "0s")) {
      return [];
    }
    return parsed;
  }, [getValue]);
  const [springConfigs, setSpringConfigs] = useState23({});
  const updateTransitionProperty = useCallback33(
    (index, newProp) => {
      const props = transitions.map((t, i) => i === index ? newProp : t.property);
      onChange("transition-property", serializeLonghand(props));
    },
    [transitions, onChange]
  );
  const updateTransitionTiming = useCallback33(
    (index, newTiming) => {
      const timings = transitions.map(
        (t, i) => i === index ? newTiming : t.bezier ? serializeTimingFunction(t.bezier) : t.timingFunction
      );
      onChange("transition-timing-function", serializeLonghand(timings));
    },
    [transitions, onChange]
  );
  const updateTransitionDuration = useCallback33(
    (index, value) => {
      const durations = transitions.map((t, i) => i === index ? value : t.duration);
      onChange("transition-duration", serializeLonghand(durations));
    },
    [transitions, onChange]
  );
  const updateTransitionDelay = useCallback33(
    (index, value) => {
      const delays = transitions.map((t, i) => i === index ? value : t.delay);
      onChange("transition-delay", serializeLonghand(delays));
    },
    [transitions, onChange]
  );
  const addTransition = useCallback33(() => {
    const props = transitions.map((t) => t.property).concat("all");
    const durations = transitions.map((t) => t.duration).concat("0.15s");
    const timings = transitions.map(
      (t) => t.bezier ? serializeTimingFunction(t.bezier) : t.timingFunction
    ).concat("ease");
    const delays = transitions.map((t) => t.delay).concat("0s");
    onChange("transition-property", serializeLonghand(props));
    onChange("transition-duration", serializeLonghand(durations));
    onChange("transition-timing-function", serializeLonghand(timings));
    onChange("transition-delay", serializeLonghand(delays));
  }, [transitions, onChange]);
  const removeTransition = useCallback33(
    (index) => {
      if (transitions.length <= 1) {
        onChange("transition-property", "none");
        onChange("transition-duration", "0s");
        onChange("transition-timing-function", "ease");
        onChange("transition-delay", "0s");
        return;
      }
      const without = (arr) => arr.filter((_, i) => i !== index);
      const props = without(transitions.map((t) => t.property));
      const durations = without(transitions.map((t) => t.duration));
      const timings = without(transitions.map(
        (t) => t.bezier ? serializeTimingFunction(t.bezier) : t.timingFunction
      ));
      const delays = without(transitions.map((t) => t.delay));
      onChange("transition-property", serializeLonghand(props));
      onChange("transition-duration", serializeLonghand(durations));
      onChange("transition-timing-function", serializeLonghand(timings));
      onChange("transition-delay", serializeLonghand(delays));
      setSpringConfigs((prev) => {
        const next2 = {};
        for (const [k, v] of Object.entries(prev)) {
          const ki = Number(k);
          if (ki < index) next2[ki] = v;
          else if (ki > index) next2[ki - 1] = v;
        }
        return next2;
      });
    },
    [transitions, onChange]
  );
  const entries = useStore2((s) => s.animationEntries);
  const selectedIndex = useStore2((s) => s.selectedAnimationIndex);
  const rules = useStore2((s) => s.keyframesRules);
  const addEntry = useStore2((s) => s.addAnimationEntry);
  const removeEntry = useStore2((s) => s.removeAnimationEntry);
  const updateEntry = useStore2((s) => s.updateAnimationEntry);
  const selectEntry = useStore2((s) => s.selectAnimationEntry);
  const closeEntry = useStore2((s) => s.closeAnimationEntry);
  const setWriter = useStore2((s) => s.setAnimCssWriter);
  const setScrollPreview = useStore2((s) => s.setScrollPreviewActive);
  useEffect30(() => {
    if (selectedIndex === null) {
      setScrollPreview(false);
      return;
    }
    const entry = entries[selectedIndex];
    setScrollPreview(!!entry && entry.trigger !== "duration");
    return () => setScrollPreview(false);
  }, [selectedIndex, entries, setScrollPreview]);
  useEffect30(() => {
    setWriter(onChange);
    return () => setWriter(null);
  }, [onChange, setWriter]);
  const timelineOpen = useStore2((s) => s.panels.timeline.open);
  useEffect30(() => {
    if (!timelineOpen && useStore2.getState().selectedAnimationIndex !== null) {
      closeEntry();
    }
  }, [timelineOpen, closeEntry]);
  useEffect30(() => {
    return () => {
      const state2 = useStore2.getState();
      if (state2.selectedAnimationIndex !== null) {
        closeEntry();
      }
    };
  }, [closeEntry]);
  const handleNameChange = useCallback33((index, name) => {
    updateEntry(index, { name });
    const state2 = useStore2.getState();
    if (name !== "none" && state2.keyframesRules.some((r) => r.name === name)) {
      state2.selectKeyframesRule(name);
    }
  }, [updateEntry]);
  const handleUpdate = useCallback33((index, updates) => {
    updateEntry(index, updates);
  }, [updateEntry]);
  const [addMenuPos, setAddMenuPos] = useState23(null);
  const handleAddClick = useCallback33((e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setAddMenuPos({ x: rect.left + rect.width / 2 - 70, y: rect.bottom + 4 });
  }, []);
  const handleAdd = useCallback33((type) => {
    setAddMenuPos(null);
    if (type === "transition") {
      addTransition();
    } else {
      addEntry(type);
    }
  }, [addTransition, addEntry]);
  if (filter2 && !(f("Motion") || f("Transition") || f("Animation") || f("Easing") || f("Duration") || f("Delay"))) {
    return null;
  }
  const ruleNames = rules.map((r) => r.name);
  return /* @__PURE__ */ jsxs42(Fragment23, { children: [
    /* @__PURE__ */ jsxs42("div", { className: TransitionSection_default.motionList, children: [
      transitions.map((t, i) => /* @__PURE__ */ jsx57(
        TransitionCard,
        {
          transition: t,
          springConfig: springConfigs[i] ?? null,
          onPropertyChange: (v) => updateTransitionProperty(i, v),
          onTimingChange: (v) => updateTransitionTiming(i, v),
          onDurationChange: (v) => updateTransitionDuration(i, v),
          onDelayChange: (v) => updateTransitionDelay(i, v),
          onRemove: () => removeTransition(i),
          onSpringConfigChange: (c) => setSpringConfigs((prev) => ({ ...prev, [i]: c })),
          onClearSpringConfig: () => setSpringConfigs((prev) => {
            const next2 = { ...prev };
            delete next2[i];
            return next2;
          }),
          onFocus
        },
        `t-${t.property}-${i}`
      )),
      entries.map((entry, i) => /* @__PURE__ */ jsx57(
        AnimationCard,
        {
          entry,
          index: i,
          selected: selectedIndex === i,
          ruleNames,
          onNameChange: (name) => handleNameChange(i, name),
          onUpdate: (updates) => handleUpdate(i, updates),
          onEditKeyframes: () => selectEntry(i),
          onRemove: () => removeEntry(i),
          onFocus
        },
        `a-${i}`
      )),
      /* @__PURE__ */ jsxs42("button", { className: TransitionSection_default.addMotionBtn, onClick: handleAddClick, title: "Add motion", children: [
        /* @__PURE__ */ jsx57(PlusIcon, { size: 10 }),
        "Add"
      ] })
    ] }),
    addMenuPos && /* @__PURE__ */ jsx57(
      ContextMenu,
      {
        x: addMenuPos.x,
        y: addMenuPos.y,
        items: [
          { label: MOTION_LABELS["transition"], onClick: () => handleAdd("transition") },
          { label: MOTION_LABELS["duration"], onClick: () => handleAdd("duration") },
          { separator: true },
          { label: MOTION_LABELS["scroll"], onClick: () => handleAdd("scroll") },
          { label: MOTION_LABELS["scroll-enter"], onClick: () => handleAdd("scroll-enter") },
          { label: MOTION_LABELS["scroll-exit"], onClick: () => handleAdd("scroll-exit") }
        ],
        onClose: () => setAddMenuPos(null),
        animate: true,
        transformOrigin: "top center"
      }
    )
  ] });
}
function TransitionCard({
  transition,
  springConfig,
  onPropertyChange,
  onTimingChange,
  onDurationChange,
  onDelayChange,
  onRemove,
  onSpringConfigChange,
  onClearSpringConfig,
  onFocus
}) {
  const { property, duration, timingFunction, delay: delay2, bezier } = transition;
  const [popoverOpen, setPopoverOpen] = useState23(false);
  const nameRef = useRef29(null);
  const triggerRef = useRef29(null);
  const anchorRectRef = useRef29(null);
  const easingLabel = getEasingLabel(bezier, timingFunction, springConfig);
  const handleTriggerClick = useCallback33(() => {
    if (triggerRef.current) {
      anchorRectRef.current = triggerRef.current.getBoundingClientRect();
    }
    setPopoverOpen((prev) => !prev);
    onFocus?.();
  }, [onFocus]);
  const handleClose = useCallback33(() => {
    setPopoverOpen(false);
  }, []);
  const commitName = useCallback33(() => {
    const input = nameRef.current;
    if (!input) return;
    const trimmed = input.value.trim();
    if (trimmed && trimmed !== property) {
      onPropertyChange(trimmed);
    } else {
      input.value = property;
    }
  }, [property, onPropertyChange]);
  return /* @__PURE__ */ jsxs42(
    MotionCard,
    {
      headerLabel: "Transition",
      headerContent: /* @__PURE__ */ jsx57(
        "input",
        {
          ref: nameRef,
          className: TransitionSection_default.propertyInput,
          defaultValue: property,
          onBlur: commitName,
          onKeyDown: (e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              e.currentTarget.value = property;
              e.currentTarget.blur();
            }
          }
        },
        property
      ),
      headerActions: /* @__PURE__ */ jsx57("button", { className: MotionCard_default.iconBtn, onClick: onRemove, title: "Remove transition", children: /* @__PURE__ */ jsx57(XIcon, { size: 10 }) }),
      children: [
        /* @__PURE__ */ jsxs42("div", { className: TransitionSection_default.easingRow, children: [
          /* @__PURE__ */ jsx57("span", { className: TransitionSection_default.easingLabel, children: "Easing" }),
          /* @__PURE__ */ jsxs42(
            "button",
            {
              ref: triggerRef,
              className: TransitionSection_default.easingTrigger,
              onClick: handleTriggerClick,
              title: "Edit easing",
              children: [
                /* @__PURE__ */ jsx57("svg", { className: TransitionSection_default.easingPreview, viewBox: "0 0 32 32", children: springConfig ? /* @__PURE__ */ jsx57(
                  SpringCurve,
                  {
                    spring: springConfig,
                    width: 32,
                    height: 32,
                    left: 2,
                    top: 2,
                    right: 30,
                    bottom: 30,
                    color: "var(--cs-accent)",
                    pathWidth: 1.5
                  }
                ) : bezier ? /* @__PURE__ */ jsx57(
                  EasingCurve,
                  {
                    curve: bezier,
                    width: 32,
                    height: 32,
                    left: 2,
                    top: 2,
                    right: 30,
                    bottom: 30,
                    color: "var(--cs-accent)",
                    pathWidth: 1.5
                  }
                ) : null }),
                /* @__PURE__ */ jsx57("span", { className: TransitionSection_default.easingName, children: easingLabel })
              ]
            }
          )
        ] }),
        popoverOpen && anchorRectRef.current && /* @__PURE__ */ jsx57(
          EasingPopover,
          {
            anchorRect: anchorRectRef.current,
            bezier,
            timingFunction,
            springConfig,
            onTimingChange,
            onDurationChange,
            onSpringConfigChange,
            onClearSpring: onClearSpringConfig,
            onClose: handleClose
          }
        ),
        /* @__PURE__ */ jsx57(
          NumberInput,
          {
            label: "transition-duration",
            displayName: "Duration",
            value: duration,
            step: 0.05,
            min: 0,
            max: 10,
            unit: "s",
            onChange: onDurationChange,
            onFocus
          }
        ),
        /* @__PURE__ */ jsx57(
          NumberInput,
          {
            label: "transition-delay",
            displayName: "Delay",
            value: delay2,
            step: 0.05,
            min: 0,
            max: 10,
            unit: "s",
            onChange: onDelayChange,
            onFocus
          }
        )
      ]
    }
  );
}
function AnimationCard({
  entry,
  selected,
  ruleNames,
  onNameChange,
  onUpdate,
  onEditKeyframes,
  onRemove,
  onFocus
}) {
  const isDuration = entry.trigger === "duration";
  const [easingPopoverOpen, setEasingPopoverOpen] = useState23(false);
  const easingTriggerRef = useRef29(null);
  const easingAnchorRef = useRef29(null);
  const easing = entry.easing || "ease";
  const bezier = extractBezier2(easing);
  const easingLabel = getEasingLabel(bezier, easing, null);
  const handleEasingTriggerClick = useCallback33(() => {
    if (easingTriggerRef.current) {
      easingAnchorRef.current = easingTriggerRef.current.getBoundingClientRect();
    }
    setEasingPopoverOpen((prev) => !prev);
  }, []);
  const handleEasingChange = useCallback33((value) => {
    onUpdate({ easing: value });
  }, [onUpdate]);
  return /* @__PURE__ */ jsxs42(
    MotionCard,
    {
      selected,
      hasNonDefaultSecondary: hasNonDefaultSecondary(entry),
      headerLabel: TRIGGER_LABELS[entry.trigger],
      headerContent: /* @__PURE__ */ jsxs42(
        "select",
        {
          className: AnimationSection_default.entrySelect,
          value: entry.name,
          onChange: (e) => onNameChange(e.target.value),
          onFocus,
          children: [
            /* @__PURE__ */ jsx57("option", { value: "none", children: "none" }),
            ruleNames.map((name) => /* @__PURE__ */ jsx57("option", { value: name, children: name }, name))
          ]
        }
      ),
      headerActions: /* @__PURE__ */ jsxs42(Fragment23, { children: [
        /* @__PURE__ */ jsx57(
          "button",
          {
            className: MotionCard_default.iconBtn,
            onClick: onEditKeyframes,
            title: "Edit keyframes",
            children: TimelineIcon
          }
        ),
        /* @__PURE__ */ jsx57(
          "button",
          {
            className: MotionCard_default.iconBtn,
            onClick: onRemove,
            title: "Remove animation",
            children: /* @__PURE__ */ jsx57(XIcon, { size: 10 })
          }
        )
      ] }),
      secondaryContent: /* @__PURE__ */ jsx57(
        AnimationSecondaryFields,
        {
          entry,
          onUpdate
        }
      ),
      children: [
        /* @__PURE__ */ jsxs42("div", { className: TransitionSection_default.easingRow, children: [
          /* @__PURE__ */ jsx57("span", { className: TransitionSection_default.easingLabel, children: "Easing" }),
          /* @__PURE__ */ jsxs42(
            "button",
            {
              ref: easingTriggerRef,
              className: TransitionSection_default.easingTrigger,
              onClick: handleEasingTriggerClick,
              title: "Edit animation easing",
              children: [
                /* @__PURE__ */ jsx57("svg", { className: TransitionSection_default.easingPreview, viewBox: "0 0 32 32", children: bezier ? /* @__PURE__ */ jsx57(
                  EasingCurve,
                  {
                    curve: bezier,
                    width: 32,
                    height: 32,
                    left: 2,
                    top: 2,
                    right: 30,
                    bottom: 30,
                    color: "var(--cs-accent)",
                    pathWidth: 1.5
                  }
                ) : null }),
                /* @__PURE__ */ jsx57("span", { className: TransitionSection_default.easingName, children: easingLabel })
              ]
            }
          )
        ] }),
        easingPopoverOpen && easingAnchorRef.current && /* @__PURE__ */ jsx57(
          EasingPopover,
          {
            anchorRect: easingAnchorRef.current,
            bezier,
            timingFunction: easing,
            springConfig: null,
            onTimingChange: handleEasingChange,
            onDurationChange: () => {
            },
            onSpringConfigChange: () => {
            },
            onClose: () => setEasingPopoverOpen(false)
          }
        ),
        isDuration && /* @__PURE__ */ jsxs42(Fragment23, { children: [
          /* @__PURE__ */ jsx57(
            NumberInput,
            {
              label: "Duration",
              value: entry.duration,
              units: DURATION_UNITS,
              onChange: (v) => onUpdate({ duration: v }),
              onFocus
            }
          ),
          /* @__PURE__ */ jsx57(
            NumberInput,
            {
              label: "Delay",
              value: entry.delay,
              units: DELAY_UNITS,
              onChange: (v) => onUpdate({ delay: v }),
              onFocus
            }
          )
        ] })
      ]
    }
  );
}
function AnimationSecondaryFields({
  entry,
  onUpdate
}) {
  const isScroll = entry.trigger === "scroll";
  const isView = entry.trigger === "scroll-enter" || entry.trigger === "scroll-exit";
  return /* @__PURE__ */ jsxs42(Fragment23, { children: [
    /* @__PURE__ */ jsx57(
      SelectInput,
      {
        label: "Fill",
        value: entry.fillMode,
        options: FILL_OPTIONS,
        onChange: (v) => onUpdate({ fillMode: v })
      }
    ),
    /* @__PURE__ */ jsx57(
      NumberInput,
      {
        label: "Iterations",
        value: entry.iterationCount,
        min: 1,
        max: 100,
        step: 1,
        unit: "",
        showSlider: false,
        onChange: (v) => onUpdate({ iterationCount: v })
      }
    ),
    /* @__PURE__ */ jsx57(
      SelectInput,
      {
        label: "Direction",
        value: entry.direction,
        options: DIRECTION_OPTIONS,
        onChange: (v) => onUpdate({ direction: v })
      }
    ),
    isScroll && /* @__PURE__ */ jsxs42(Fragment23, { children: [
      /* @__PURE__ */ jsx57(
        SelectInput,
        {
          label: "Source",
          value: entry.scroller,
          options: [...SCROLLER_OPTIONS],
          onChange: (v) => onUpdate({ scroller: v })
        }
      ),
      /* @__PURE__ */ jsx57(
        SelectInput,
        {
          label: "Axis",
          value: entry.axis,
          options: [...AXIS_OPTIONS],
          onChange: (v) => onUpdate({ axis: v })
        }
      )
    ] }),
    isView && /* @__PURE__ */ jsxs42(Fragment23, { children: [
      /* @__PURE__ */ jsx57(
        SelectInput,
        {
          label: "Axis",
          value: entry.axis,
          options: [...AXIS_OPTIONS],
          onChange: (v) => onUpdate({ axis: v })
        }
      ),
      /* @__PURE__ */ jsx57(
        RangeRow,
        {
          label: "Start",
          value: entry.rangeStart,
          onChange: (v) => onUpdate({ rangeStart: v })
        }
      ),
      /* @__PURE__ */ jsx57(
        RangeRow,
        {
          label: "End",
          value: entry.rangeEnd,
          onChange: (v) => onUpdate({ rangeEnd: v })
        }
      ),
      /* @__PURE__ */ jsx57(
        TextInput,
        {
          label: "Inset start",
          value: entry.viewInsetStart,
          onChange: (v) => onUpdate({ viewInsetStart: v })
        }
      ),
      /* @__PURE__ */ jsx57(
        TextInput,
        {
          label: "Inset end",
          value: entry.viewInsetEnd,
          onChange: (v) => onUpdate({ viewInsetEnd: v })
        }
      )
    ] })
  ] });
}
function parseRangeName(value) {
  const name = value.split(/\s+/)[0];
  return RANGE_NAME_OPTIONS.includes(name) ? name : "normal";
}
function parseRangeOffset(value) {
  const parts = value.split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}
function RangeRow({ label, value, onChange }) {
  const name = parseRangeName(value);
  const offset = parseRangeOffset(value) || "0%";
  const [draft, setDraft] = useState23(offset);
  useEffect30(() => {
    setDraft(offset);
  }, [offset]);
  const commitOffset = () => {
    const trimmed = draft.trim() || "0%";
    const normalized = /%$/.test(trimmed) ? trimmed : `${trimmed}%`;
    setDraft(normalized);
    onChange(`${name} ${normalized}`);
  };
  return /* @__PURE__ */ jsxs42("div", { className: inputs_default.row, style: { gridTemplateColumns: "76px 1fr 56px" }, children: [
    /* @__PURE__ */ jsx57("label", { className: inputs_default.label, children: label }),
    /* @__PURE__ */ jsx57(
      "select",
      {
        className: inputs_default.select,
        value: name,
        onChange: (e) => {
          const v = e.target.value;
          onChange(v === "normal" ? "normal" : `${v} ${offset}`);
        },
        children: RANGE_NAME_OPTIONS.map((opt) => /* @__PURE__ */ jsx57("option", { value: opt, children: opt }, opt))
      }
    ),
    name !== "normal" && /* @__PURE__ */ jsx57(
      "input",
      {
        className: inputs_default.textInput,
        value: draft,
        onChange: (e) => setDraft(e.target.value),
        onBlur: commitOffset,
        onKeyDown: (e) => {
          if (e.key === "Enter") commitOffset();
        },
        placeholder: "0%"
      }
    )
  ] });
}

