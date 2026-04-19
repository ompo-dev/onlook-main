// src/Editor/PropertiesPanel/inputs/NumberInput.tsx
import { jsx as jsx26, jsxs as jsxs16 } from "react/jsx-runtime";
var LARGE_SPATIAL_UNITS = [
  { unit: "px", min: 0, max: 2e3, step: 1 },
  { unit: "%", min: 0, max: 100, step: 1 },
  { unit: "rem", min: 0, max: 100, step: 0.25 },
  { unit: "em", min: 0, max: 100, step: 0.25 },
  { unit: "vw", min: 0, max: 100, step: 1 },
  { unit: "vh", min: 0, max: 100, step: 1 }
];
var LARGE_SPATIAL_SIGNED_UNITS = [
  { unit: "px", min: -2e3, max: 2e3, step: 1, sliderMin: -200, sliderMax: 200 },
  { unit: "%", min: -100, max: 100, step: 1 },
  { unit: "rem", min: -100, max: 100, step: 0.25 },
  { unit: "em", min: -100, max: 100, step: 0.25 },
  { unit: "vw", min: -100, max: 100, step: 1 },
  { unit: "vh", min: -100, max: 100, step: 1 }
];
var SMALL_SPATIAL_UNITS = [
  { unit: "px", min: 0, max: 200, step: 1 },
  { unit: "%", min: 0, max: 100, step: 1 },
  { unit: "rem", min: 0, max: 20, step: 0.25 },
  { unit: "em", min: 0, max: 20, step: 0.25 }
];
var SMALL_SPATIAL_SIGNED_UNITS = [
  { unit: "px", min: -200, max: 200, step: 1, sliderMin: 0 },
  { unit: "%", min: -100, max: 100, step: 1 },
  { unit: "rem", min: -20, max: 20, step: 0.25 },
  { unit: "em", min: -20, max: 20, step: 0.25 }
];
var LETTER_SPACING_UNITS = [
  { unit: "px", min: -5, max: 20, step: 0.1 },
  { unit: "rem", min: -1, max: 2, step: 0.01 },
  { unit: "em", min: -0.5, max: 1, step: 0.01 }
];
var TRANSLATE_UNITS = [
  { unit: "px", min: -2e3, max: 2e3, step: 1, sliderMin: -200, sliderMax: 200 },
  { unit: "%", min: -100, max: 100, step: 1 },
  { unit: "rem", min: -100, max: 100, step: 0.25 },
  { unit: "vw", min: -100, max: 100, step: 1 },
  { unit: "vh", min: -100, max: 100, step: 1 }
];
var SHADOW_UNITS = [
  { unit: "px", min: -100, max: 100, step: 1 },
  { unit: "rem", min: -10, max: 10, step: 0.25 },
  { unit: "em", min: -10, max: 10, step: 0.25 }
];
var SHADOW_BLUR_UNITS = [
  { unit: "px", min: 0, max: 100, step: 1 },
  { unit: "rem", min: 0, max: 10, step: 0.25 },
  { unit: "em", min: 0, max: 10, step: 0.25 }
];
var STEP_CONFIGS = {
  opacity: { step: 0.01, min: 0, max: 1, unit: "" },
  "font-weight": { step: 100, min: 100, max: 900, unit: "" },
  "font-size": { step: 1, min: 0, max: 200, unit: "px", units: SMALL_SPATIAL_UNITS },
  "padding-top": { step: 1, min: 0, max: 200, unit: "px", units: SMALL_SPATIAL_UNITS },
  "padding-right": { step: 1, min: 0, max: 200, unit: "px", units: SMALL_SPATIAL_UNITS },
  "padding-bottom": { step: 1, min: 0, max: 200, unit: "px", units: SMALL_SPATIAL_UNITS },
  "padding-left": { step: 1, min: 0, max: 200, unit: "px", units: SMALL_SPATIAL_UNITS },
  padding: { step: 1, min: 0, max: 200, unit: "px", units: SMALL_SPATIAL_UNITS },
  "margin-top": { step: 1, min: -200, max: 200, unit: "px", sliderMin: 0, units: SMALL_SPATIAL_SIGNED_UNITS },
  "margin-right": { step: 1, min: -200, max: 200, unit: "px", sliderMin: 0, units: SMALL_SPATIAL_SIGNED_UNITS },
  "margin-bottom": { step: 1, min: -200, max: 200, unit: "px", sliderMin: 0, units: SMALL_SPATIAL_SIGNED_UNITS },
  "margin-left": { step: 1, min: -200, max: 200, unit: "px", sliderMin: 0, units: SMALL_SPATIAL_SIGNED_UNITS },
  margin: { step: 1, min: -200, max: 200, unit: "px", sliderMin: 0, units: SMALL_SPATIAL_SIGNED_UNITS },
  width: { step: 1, min: 0, max: 2e3, unit: "px", units: LARGE_SPATIAL_UNITS },
  height: { step: 1, min: 0, max: 2e3, unit: "px", units: LARGE_SPATIAL_UNITS },
  "max-width": { step: 1, min: 0, max: 2e3, unit: "px", units: LARGE_SPATIAL_UNITS },
  "max-height": { step: 1, min: 0, max: 2e3, unit: "px", units: LARGE_SPATIAL_UNITS },
  "min-width": { step: 1, min: 0, max: 2e3, unit: "px", units: LARGE_SPATIAL_UNITS },
  "min-height": { step: 1, min: 0, max: 2e3, unit: "px", units: LARGE_SPATIAL_UNITS },
  "border-radius": { step: 1, min: 0, max: 200, unit: "px", units: SMALL_SPATIAL_UNITS },
  "border-top-left-radius": { step: 1, min: 0, max: 200, unit: "px", units: SMALL_SPATIAL_UNITS },
  "border-top-right-radius": { step: 1, min: 0, max: 200, unit: "px", units: SMALL_SPATIAL_UNITS },
  "border-bottom-right-radius": { step: 1, min: 0, max: 200, unit: "px", units: SMALL_SPATIAL_UNITS },
  "border-bottom-left-radius": { step: 1, min: 0, max: 200, unit: "px", units: SMALL_SPATIAL_UNITS },
  gap: { step: 1, min: 0, max: 200, unit: "px", units: SMALL_SPATIAL_UNITS },
  "letter-spacing": { step: 0.1, min: -5, max: 20, unit: "px", units: LETTER_SPACING_UNITS },
  "line-height": { step: 0.1, min: 0, max: 5, unit: "" },
  top: { step: 1, min: -1e3, max: 1e3, unit: "px", units: LARGE_SPATIAL_SIGNED_UNITS },
  right: { step: 1, min: -1e3, max: 1e3, unit: "px", units: LARGE_SPATIAL_SIGNED_UNITS },
  bottom: { step: 1, min: -1e3, max: 1e3, unit: "px", units: LARGE_SPATIAL_SIGNED_UNITS },
  left: { step: 1, min: -1e3, max: 1e3, unit: "px", units: LARGE_SPATIAL_SIGNED_UNITS }
};
function parseNumericValue(value) {
  const match = value.match(/^(-?[\d.]+)\s*(.*)$/);
  if (match) {
    return { num: parseFloat(match[1]), unit: match[2] || "" };
  }
  return { num: 0, unit: "" };
}
function resolveUnitConfig(value, opts) {
  const config = opts.label ? STEP_CONFIGS[opts.label] : void 0;
  const parsed = parseNumericValue(value);
  const allUnits = opts.units ?? config?.units;
  const activeUnit = allUnits?.find((u) => u.unit === parsed.unit) ?? allUnits?.[0];
  const step = activeUnit?.step ?? opts.step ?? config?.step ?? 1;
  const min = activeUnit?.min ?? opts.min ?? config?.min ?? 0;
  const max = activeUnit?.max ?? opts.max ?? config?.max ?? 200;
  const sMin = activeUnit?.sliderMin ?? activeUnit?.min ?? opts.sliderMin ?? config?.sliderMin ?? min;
  const sMax = activeUnit?.sliderMax ?? activeUnit?.max ?? opts.sliderMax ?? max;
  const unit = activeUnit?.unit ?? (opts.unit !== void 0 ? opts.unit : config?.unit !== void 0 ? config.unit : parsed.unit);
  return { step, min, max, sliderMin: sMin, sliderMax: sMax, unit };
}
function NumberInput({
  label,
  displayName,
  value,
  min: minProp,
  max: maxProp,
  sliderMin: sliderMinProp,
  sliderMax: sliderMaxProp,
  step: stepProp,
  unit: unitProp,
  showSlider = true,
  compact = false,
  indent = false,
  endContent,
  units,
  onChange,
  onFocus
}) {
  const resolved = resolveUnitConfig(value, {
    label,
    units,
    step: stepProp,
    min: minProp,
    max: maxProp,
    sliderMin: sliderMinProp,
    sliderMax: sliderMaxProp,
    unit: unitProp
  });
  const resolvedStep = resolved.step;
  const resolvedMin = resolved.min;
  const resolvedMax = resolved.max;
  const sliderMin = resolved.sliderMin;
  const sliderMax = resolved.sliderMax;
  const resolvedUnit = resolved.unit;
  const [localValue, setLocalValue] = useState7(value);
  const dragStartY = useRef19(0);
  const dragStartValue = useRef19(0);
  const isEditingRef = useRef19(false);
  useEffect19(() => {
    if (!isEditingRef.current) {
      setLocalValue(value);
    }
  }, [value]);
  const formatValue = useCallback15(
    (num) => {
      const clamped = Math.min(resolvedMax, Math.max(resolvedMin, num));
      const rounded = Math.round(clamped / resolvedStep) * resolvedStep;
      const decimals = resolvedStep < 1 ? String(resolvedStep).split(".")[1]?.length ?? 2 : 0;
      const fixed = parseFloat(rounded.toFixed(decimals));
      return resolvedUnit ? `${fixed}${resolvedUnit}` : String(fixed);
    },
    [resolvedUnit, resolvedStep, resolvedMin, resolvedMax]
  );
  const handleSliderInput = useCallback15(
    (e) => {
      const num = parseFloat(e.target.value);
      const newValue = formatValue(num);
      setLocalValue(newValue);
      onChange(newValue);
    },
    [formatValue, onChange]
  );
  const handleInputChange = useCallback15(
    (e) => {
      isEditingRef.current = true;
      setLocalValue(e.target.value);
    },
    []
  );
  const handleInputBlur = useCallback15(() => {
    isEditingRef.current = false;
    if (localValue !== value) {
      onChange(localValue);
    }
  }, [localValue, value, onChange]);
  const handleKeyDown = useCallback15(
    (e) => {
      if (e.key === "Enter") {
        isEditingRef.current = false;
        onChange(localValue);
      }
    },
    [localValue, onChange]
  );
  const handleFocus = useCallback15(() => {
    isEditingRef.current = true;
    onFocus?.();
  }, [onFocus]);
  const hasDragged = useRef19(false);
  const handleStepperPointerDown = useCallback15(
    (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragStartY.current = e.clientY;
      dragStartValue.current = parseNumericValue(localValue).num;
      hasDragged.current = false;
    },
    [localValue]
  );
  const handleStepperPointerMove = useCallback15(
    (e) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const delta = dragStartY.current - e.clientY;
      if (!hasDragged.current && Math.abs(delta) < 2) return;
      hasDragged.current = true;
      const steps = Math.round(delta / 4);
      const num = dragStartValue.current + steps * resolvedStep;
      const newValue = formatValue(num);
      setLocalValue(newValue);
      onChange(newValue);
    },
    [resolvedStep, formatValue, onChange]
  );
  const handleStepUp = useCallback15(() => {
    const num = parseNumericValue(localValue).num + resolvedStep;
    const newValue = formatValue(num);
    setLocalValue(newValue);
    onChange(newValue);
  }, [localValue, resolvedStep, formatValue, onChange]);
  const handleStepDown = useCallback15(() => {
    const num = parseNumericValue(localValue).num - resolvedStep;
    const newValue = formatValue(num);
    setLocalValue(newValue);
    onChange(newValue);
  }, [localValue, resolvedStep, formatValue, onChange]);
  const handleStepperPointerUp = useCallback15(
    (e) => {
      if (hasDragged.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (dragStartY.current < midY) {
        handleStepUp();
      } else {
        handleStepDown();
      }
    },
    [handleStepUp, handleStepDown]
  );
  const localParsed = parseNumericValue(localValue);
  const fillPct = Math.max(0, Math.min(100, (localParsed.num - sliderMin) / (sliderMax - sliderMin) * 100));
  const isBipolar = sliderMin < 0 && sliderMax > 0;
  const zeroPct = isBipolar ? (0 - sliderMin) / (sliderMax - sliderMin) * 100 : 0;
  const track = "color-mix(in srgb, var(--cs-foreground) 12%, transparent)";
  let fillBg;
  if (isBipolar) {
    const lo = Math.min(zeroPct, fillPct);
    const hi = Math.max(zeroPct, fillPct);
    fillBg = `linear-gradient(to right, ${track} ${lo}%, var(--cs-accent) ${lo}%, var(--cs-accent) ${hi}%, ${track} ${hi}%)`;
  } else {
    fillBg = `linear-gradient(to right, var(--cs-accent) ${fillPct}%, ${track} ${fillPct}%)`;
  }
  const labelText = displayName || label || "";
  return /* @__PURE__ */ jsxs16("div", { className: `${inputs_default.row} ${indent ? inputs_default.indent : ""}`, children: [
    labelText && /* @__PURE__ */ jsx26("label", { className: inputs_default.label, title: labelText, children: labelText }),
    /* @__PURE__ */ jsxs16("div", { className: `${NumberInput_default.sliderGroup} ${compact ? NumberInput_default.compact : ""}`, children: [
      showSlider && !compact && /* @__PURE__ */ jsx26(
        "input",
        {
          type: "range",
          className: NumberInput_default.slider,
          min: sliderMin,
          max: sliderMax,
          step: resolvedStep,
          value: localParsed.num,
          onChange: handleSliderInput,
          style: { "--cs-fill-bg": fillBg }
        }
      ),
      /* @__PURE__ */ jsxs16("div", { className: NumberInput_default.numberInputWrapper, children: [
        /* @__PURE__ */ jsx26(
          "input",
          {
            type: "text",
            className: NumberInput_default.input,
            value: localValue,
            onChange: handleInputChange,
            onBlur: handleInputBlur,
            onKeyDown: handleKeyDown,
            onFocus: handleFocus
          }
        ),
        /* @__PURE__ */ jsxs16(
          "div",
          {
            className: NumberInput_default.steppers,
            onPointerDown: handleStepperPointerDown,
            onPointerMove: handleStepperPointerMove,
            onPointerUp: handleStepperPointerUp,
            children: [
              /* @__PURE__ */ jsx26("div", { className: NumberInput_default.stepper, children: /* @__PURE__ */ jsx26("svg", { viewBox: "0 0 8 5", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx26("path", { d: "M1 4L4 1L7 4" }) }) }),
              /* @__PURE__ */ jsx26("div", { className: NumberInput_default.stepper, children: /* @__PURE__ */ jsx26("svg", { viewBox: "0 0 8 5", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx26("path", { d: "M1 1L4 4L7 1" }) }) })
            ]
          }
        )
      ] })
    ] }),
    endContent
  ] });
}

