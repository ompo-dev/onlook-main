// src/Editor/PropertiesPanel/inputs/EasingPopover/EasingPopover.tsx
import { Fragment as Fragment21, jsx as jsx54, jsxs as jsxs40 } from "react/jsx-runtime";
var EASING_OPTIONS = [
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "linear",
  "custom"
];
function matchesNamedEasing(bezier) {
  for (const [name, values] of Object.entries(NAMED_EASINGS)) {
    if (bezier[0] === values[0] && bezier[1] === values[1] && bezier[2] === values[2] && bezier[3] === values[3]) {
      return name;
    }
  }
  return "custom";
}
function EasingPopover({
  anchorRect,
  bezier,
  timingFunction,
  springConfig,
  onTimingChange,
  onDurationChange,
  onSpringConfigChange,
  onClearSpring,
  onClose
}) {
  const [type, setType] = useState21(
    springConfig ? "spring" : "easing"
  );
  const [localBezier, setLocalBezier] = useState21(
    bezier ?? NAMED_EASINGS["ease"]
  );
  const [localSpring, setLocalSpring] = useState21(
    springConfig ?? { ...defaultSpring }
  );
  const handlePresetChange = useCallback32(
    (e) => {
      const value = e.target.value;
      const preset = NAMED_EASINGS[value];
      if (preset) {
        setLocalBezier(preset);
        onTimingChange(serializeTimingFunction(preset));
      }
    },
    [onTimingChange]
  );
  const handleCurveChange = useCallback32(
    (newCurve) => {
      setLocalBezier(newCurve);
      onTimingChange(serializeTimingFunction(newCurve));
    },
    [onTimingChange]
  );
  const updateSpring = useCallback32(
    (updates) => {
      const newConfig = { ...localSpring, ...updates };
      setLocalSpring(newConfig);
      onSpringConfigChange(newConfig);
      const css2 = springToCss(newConfig);
      onTimingChange(css2.timingFunction);
      onDurationChange(css2.duration);
    },
    [localSpring, onTimingChange, onDurationChange, onSpringConfigChange]
  );
  const handleTypeChange = useCallback32(
    (newType) => {
      setType(newType);
      if (newType === "easing") {
        onTimingChange(serializeTimingFunction(localBezier));
        onClearSpring?.();
      } else {
        const css2 = springToCss(localSpring);
        onTimingChange(css2.timingFunction);
        onDurationChange(css2.duration);
        onSpringConfigChange(localSpring);
      }
    },
    [
      localBezier,
      localSpring,
      onTimingChange,
      onDurationChange,
      onSpringConfigChange,
      onClearSpring
    ]
  );
  const springMode = localSpring.type || "time";
  const selectedPreset = matchesNamedEasing(localBezier);
  return /* @__PURE__ */ jsxs40(PopoverPanel, { title: "Easing", anchorRect, popoverHeight: 380, onClose, children: [
    /* @__PURE__ */ jsxs40("div", { className: EasingPopover_default.tabBar, children: [
      /* @__PURE__ */ jsx54(
        "button",
        {
          className: `${EasingPopover_default.tab} ${type === "easing" ? EasingPopover_default.active : ""}`,
          onClick: () => handleTypeChange("easing"),
          children: "Ease"
        }
      ),
      /* @__PURE__ */ jsx54(
        "button",
        {
          className: `${EasingPopover_default.tab} ${type === "spring" ? EasingPopover_default.active : ""}`,
          onClick: () => handleTypeChange("spring"),
          children: "Spring"
        }
      )
    ] }),
    /* @__PURE__ */ jsx54("div", { className: EasingPopover_default.curveContainer, children: type === "spring" ? /* @__PURE__ */ jsx54(
      "svg",
      {
        width: "100%",
        viewBox: "0 0 220 220",
        style: { display: "block" },
        children: /* @__PURE__ */ jsx54(
          SpringCurve,
          {
            spring: localSpring,
            width: 220,
            height: 220,
            color: "var(--cs-accent)",
            axisColor: "rgba(255, 255, 255, 0.15)",
            pathWidth: 2
          }
        )
      }
    ) : /* @__PURE__ */ jsx54(
      BezierCurveEditor,
      {
        curve: localBezier,
        onChange: handleCurveChange,
        color: "var(--cs-accent)",
        axisColor: "rgba(255, 255, 255, 0.15)"
      }
    ) }),
    /* @__PURE__ */ jsx54(
      EasingPreview,
      {
        type,
        bezier: localBezier,
        spring: localSpring
      }
    ),
    /* @__PURE__ */ jsx54("div", { className: EasingPopover_default.controls, children: type === "easing" ? /* @__PURE__ */ jsxs40(Fragment21, { children: [
      /* @__PURE__ */ jsx54(
        "select",
        {
          className: EasingPopover_default.presetSelect,
          value: selectedPreset,
          onChange: handlePresetChange,
          children: EASING_OPTIONS.map((opt) => /* @__PURE__ */ jsx54("option", { value: opt, children: opt }, opt))
        }
      ),
      /* @__PURE__ */ jsx54(
        EasingInput,
        {
          value: localBezier,
          onChange: handleCurveChange
        }
      )
    ] }) : /* @__PURE__ */ jsxs40(Fragment21, { children: [
      /* @__PURE__ */ jsxs40("div", { className: EasingPopover_default.tabBar, children: [
        /* @__PURE__ */ jsx54(
          "button",
          {
            className: `${EasingPopover_default.tab} ${springMode === "time" ? EasingPopover_default.active : ""}`,
            onClick: () => updateSpring({ type: "time" }),
            children: "Time"
          }
        ),
        /* @__PURE__ */ jsx54(
          "button",
          {
            className: `${EasingPopover_default.tab} ${springMode === "physics" ? EasingPopover_default.active : ""}`,
            onClick: () => updateSpring({ type: "physics" }),
            children: "Physics"
          }
        )
      ] }),
      springMode === "time" ? /* @__PURE__ */ jsxs40(Fragment21, { children: [
        /* @__PURE__ */ jsx54(
          SpringSlider,
          {
            label: "Duration",
            value: localSpring.duration ?? defaultSpring.duration,
            min: 0.1,
            max: 2,
            step: 0.05,
            suffix: "s",
            onChange: (v) => updateSpring({ duration: v })
          }
        ),
        /* @__PURE__ */ jsx54(
          SpringSlider,
          {
            label: "Bounce",
            value: localSpring.bounce ?? defaultSpring.bounce,
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (v) => updateSpring({ bounce: v })
          }
        )
      ] }) : /* @__PURE__ */ jsxs40(Fragment21, { children: [
        /* @__PURE__ */ jsx54(
          SpringSlider,
          {
            label: "Stiffness",
            value: localSpring.stiffness ?? defaultSpring.stiffness,
            min: 1,
            max: 2e3,
            step: 10,
            onChange: (v) => updateSpring({ stiffness: v })
          }
        ),
        /* @__PURE__ */ jsx54(
          SpringSlider,
          {
            label: "Damping",
            value: localSpring.damping ?? defaultSpring.damping,
            min: 1,
            max: 500,
            step: 5,
            onChange: (v) => updateSpring({ damping: v })
          }
        ),
        /* @__PURE__ */ jsx54(
          SpringSlider,
          {
            label: "Mass",
            value: localSpring.mass ?? defaultSpring.mass,
            min: 0.1,
            max: 10,
            step: 0.1,
            onChange: (v) => updateSpring({ mass: v })
          }
        )
      ] })
    ] }) })
  ] });
}
function EasingPreview({
  type,
  bezier,
  spring: spring2
}) {
  const trackRef = useRef28(null);
  const dotRef = useRef28(null);
  const animRef = useRef28(null);
  const debounceRef = useRef28(null);
  const play = useCallback32(() => {
    if (!trackRef.current || !dotRef.current) return;
    if (animRef.current) {
      if ("stop" in animRef.current) animRef.current.stop();
      else if ("cancel" in animRef.current) animRef.current.cancel();
      animRef.current = null;
    }
    const travel = trackRef.current.clientWidth - dotRef.current.clientWidth;
    if (type === "spring") {
      const cfg = { ...defaultSpring, ...spring2 };
      const springMode = cfg.type || "time";
      const opts = springMode === "physics" ? {
        type: "spring",
        stiffness: cfg.stiffness,
        damping: cfg.damping,
        mass: cfg.mass
      } : {
        type: "spring",
        bounce: cfg.bounce,
        duration: cfg.duration
      };
      animRef.current = animate(
        dotRef.current,
        { x: [0, travel] },
        opts
      );
    } else {
      const easing = `cubic-bezier(${bezier.join(", ")})`;
      animRef.current = dotRef.current.animate(
        { transform: ["translateX(0)", `translateX(${travel}px)`] },
        { duration: 800, easing, fill: "forwards" }
      );
    }
  }, [type, bezier, spring2]);
  useEffect29(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(play, 100);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [play]);
  return /* @__PURE__ */ jsx54(
    "div",
    {
      ref: trackRef,
      className: EasingPopover_default.previewTrack,
      onClick: play,
      title: "Click to replay",
      children: /* @__PURE__ */ jsx54("div", { ref: dotRef, className: EasingPopover_default.previewDot })
    }
  );
}
function SpringSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange
}) {
  const displayValue = suffix ? `${Math.round(value * 100) / 100}${suffix}` : `${Math.round(value * 100) / 100}`;
  return /* @__PURE__ */ jsxs40("div", { className: EasingPopover_default.controlRow, children: [
    /* @__PURE__ */ jsx54("span", { className: EasingPopover_default.controlLabel, children: label }),
    /* @__PURE__ */ jsx54(
      "input",
      {
        type: "range",
        className: EasingPopover_default.controlSlider,
        min,
        max,
        step,
        value,
        onChange: (e) => onChange(parseFloat(e.target.value))
      }
    ),
    /* @__PURE__ */ jsx54("span", { className: EasingPopover_default.controlValue, children: displayValue })
  ] });
}

