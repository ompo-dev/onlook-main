// src/Editor/PropertiesPanel/inputs/ColorInput.tsx
import { jsx as jsx41, jsxs as jsxs28 } from "react/jsx-runtime";
var DEFAULT_HSVA = { h: 0, s: 0, v: 0, a: 1 };
function ColorInput({
  label,
  displayName,
  value,
  mono,
  onChange,
  onFocus,
  supportsGradient,
  onPropertyChange,
  onLabelDoubleClick,
  labelOverride
}) {
  const [pickerOpen, setPickerOpen] = useState15(false);
  const [hsva, setHsva] = useState15(
    () => parseCssColor(value) ?? DEFAULT_HSVA
  );
  const [mode, setMode] = useState15(() => detectColorMode(value));
  const [localText, setLocalText] = useState15(value);
  const hueRef = useRef25(hsva.h);
  const isEditingRef = useRef25(false);
  const swatchRef = useRef25(null);
  const anchorRectRef = useRef25(null);
  const [activeTab, setActiveTab] = useState15(
    () => isGradientValue(value) ? "gradient" : "color"
  );
  const [gradientConfig, setGradientConfig] = useState15(
    () => parseGradient(value) ?? createDefaultGradient()
  );
  function updateHsva(parsed) {
    if (parsed.s > 0 && parsed.v > 0) hueRef.current = parsed.h;
    setHsva({
      ...parsed,
      h: parsed.s === 0 || parsed.v === 0 ? hueRef.current : parsed.h
    });
  }
  useEffect26(() => {
    if (isEditingRef.current) return;
    if (isGradientValue(value)) {
      const parsed = parseGradient(value);
      if (parsed) setGradientConfig(parsed);
      setActiveTab("gradient");
    } else {
      const parsed = parseCssColor(value);
      if (parsed) updateHsva(parsed);
      setActiveTab("color");
    }
    setLocalText(value);
  }, [value]);
  const handleTabChange = useCallback25(
    (tab) => {
      setActiveTab(tab);
      isEditingRef.current = true;
      if (tab === "gradient") {
        const currentColor = formatColor(hsva, mode);
        const config = createDefaultGradient(currentColor);
        setGradientConfig(config);
        const css2 = serializeGradient(config);
        setLocalText(css2);
        onPropertyChange?.("background", css2);
      } else {
        const css2 = formatColor(hsva, mode);
        setLocalText(css2);
        onPropertyChange?.("background-color", css2);
      }
    },
    [hsva, mode, onPropertyChange]
  );
  const handleGradientChange = useCallback25(
    (config) => {
      setGradientConfig(config);
      isEditingRef.current = true;
      const css2 = serializeGradient(config);
      setLocalText(css2);
      onPropertyChange?.("background", css2);
    },
    [onPropertyChange]
  );
  const handlePickerChange = useCallback25(
    (newHsva) => {
      if (newHsva.s > 0 && newHsva.v > 0) hueRef.current = newHsva.h;
      setHsva(newHsva);
      isEditingRef.current = true;
      const css2 = formatColor(newHsva, mode);
      setLocalText(css2);
      onChange(css2);
    },
    [mode, onChange]
  );
  const handleModeChange = useCallback25(
    (newMode) => {
      setMode(newMode);
      if (newMode !== "custom") {
        const css2 = formatColor(hsva, newMode);
        setLocalText(css2);
        onChange(css2);
      }
    },
    [hsva, onChange]
  );
  const handleCustomChange = useCallback25(
    (raw) => {
      setLocalText(raw);
      onChange(raw);
    },
    [onChange]
  );
  const commitText = useCallback25(
    (text) => {
      const val = text.toLowerCase() === "none" ? "transparent" : text;
      onChange(val);
      const parsed = parseCssColor(val);
      if (parsed) updateHsva(parsed);
    },
    [onChange]
  );
  const handleTextChange = useCallback25(
    (e) => {
      setLocalText(e.target.value);
    },
    []
  );
  const handleTextFocus = useCallback25(() => {
    isEditingRef.current = true;
    onFocus?.();
  }, [onFocus]);
  const handleTextBlur = useCallback25(() => {
    isEditingRef.current = false;
    if (localText !== value) commitText(localText);
  }, [localText, value, commitText]);
  const handleTextKeyDown = useCallback25(
    (e) => {
      if (e.key === "Enter") commitText(localText);
    },
    [localText, commitText]
  );
  const handleSwatchClick = useCallback25(() => {
    if (swatchRef.current) {
      anchorRectRef.current = swatchRef.current.getBoundingClientRect();
    }
    setPickerOpen((prev) => !prev);
    onFocus?.();
  }, [onFocus]);
  const handleClose = useCallback25(() => {
    setPickerOpen(false);
    isEditingRef.current = false;
  }, []);
  const isGradient = activeTab === "gradient";
  const isValid = isGradient ? isGradientValue(value) : parseCssColor(value) !== null;
  const displayLabel = displayName || label;
  const swatchRgba = hsvaToRgba(hsva);
  const swatchStyle = isGradient ? { backgroundImage: serializeGradient(gradientConfig) } : { backgroundColor: `rgba(${swatchRgba.r},${swatchRgba.g},${swatchRgba.b},${swatchRgba.a})` };
  return /* @__PURE__ */ jsxs28("div", { className: inputs_default.row, children: [
    labelOverride ?? /* @__PURE__ */ jsx41(
      "label",
      {
        className: `${inputs_default.label} ${mono ? inputs_default.mono : ""}`,
        onDoubleClick: onLabelDoubleClick,
        children: displayLabel
      }
    ),
    /* @__PURE__ */ jsxs28("div", { className: inputs_default.colorGroup, children: [
      /* @__PURE__ */ jsxs28("div", { className: inputs_default.swatchWrapper, children: [
        !isValid && !isGradient && /* @__PURE__ */ jsx41("div", { className: inputs_default.emptyColorSwatch }),
        /* @__PURE__ */ jsx41(
          "button",
          {
            ref: swatchRef,
            className: inputs_default.swatchButton,
            onClick: handleSwatchClick,
            children: /* @__PURE__ */ jsx41(
              "span",
              {
                className: inputs_default.swatchColor,
                style: isValid || isGradient ? swatchStyle : void 0
              }
            )
          }
        )
      ] }),
      /* @__PURE__ */ jsx41(
        "input",
        {
          type: "text",
          className: inputs_default.colorText,
          value: localText,
          onChange: handleTextChange,
          onBlur: handleTextBlur,
          onKeyDown: handleTextKeyDown,
          onFocus: handleTextFocus
        }
      )
    ] }),
    pickerOpen && anchorRectRef.current && /* @__PURE__ */ jsx41(
      ColorPicker,
      {
        hsva,
        mode,
        anchorRect: anchorRectRef.current,
        onChange: handlePickerChange,
        onModeChange: handleModeChange,
        onCustomChange: handleCustomChange,
        onClose: handleClose,
        supportsGradient,
        activeTab,
        onTabChange: handleTabChange,
        gradientConfig,
        onGradientChange: handleGradientChange
      }
    )
  ] });
}

