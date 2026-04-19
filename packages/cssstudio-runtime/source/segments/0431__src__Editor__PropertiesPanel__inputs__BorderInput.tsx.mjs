// src/Editor/PropertiesPanel/inputs/BorderInput.tsx
import { Fragment as Fragment16, jsx as jsx47, jsxs as jsxs34 } from "react/jsx-runtime";
var BORDER_WIDTH_UNITS = [
  { unit: "px", min: 0, max: 20, step: 1 },
  { unit: "em", min: 0, max: 5, step: 0.25 },
  { unit: "rem", min: 0, max: 5, step: 0.25 }
];
var SIDES = ["top", "right", "bottom", "left"];
function BorderInput({ value, getValue, onChange, onFocus }) {
  const { splitAxis, toggleSplitAxis } = useStore2();
  const isSplit = splitAxis["border"] ?? false;
  const sideValues = SIDES.map((s) => getValue(`border-${s}`));
  const allSame = sideValues.every((v) => v === sideValues[0]);
  const showSplit = isSplit || !allSame && sideValues.some((v) => v !== "");
  const isTokenRef = value.trim().startsWith("var(");
  const handleCollapse = useCallback28(() => {
    if (showSplit) {
      const topValue = getValue("border-top");
      if (topValue) onChange("border", topValue);
    }
    toggleSplitAxis("border");
  }, [showSplit, getValue, onChange, toggleSplitAxis]);
  if (isTokenRef) {
    return /* @__PURE__ */ jsx47(
      TextInput,
      {
        label: "border",
        displayName: "Border",
        value,
        onChange: (v) => onChange("border", v),
        onFocus
      }
    );
  }
  const toggleButton = /* @__PURE__ */ jsx47(
    "button",
    {
      className: inputs_default.toggleButton,
      onClick: handleCollapse,
      title: showSplit ? "Collapse to shorthand" : "Split into sides",
      style: { color: showSplit ? "var(--cs-accent)" : void 0 },
      children: /* @__PURE__ */ jsx47(SplitAxisIcon, {})
    }
  );
  if (showSplit) {
    return /* @__PURE__ */ jsxs34(Fragment16, { children: [
      /* @__PURE__ */ jsxs34("div", { className: inputs_default.row, children: [
        /* @__PURE__ */ jsx47("label", { className: inputs_default.label, children: "Border" }),
        /* @__PURE__ */ jsx47("span", {}),
        toggleButton
      ] }),
      SIDES.map((side, i) => /* @__PURE__ */ jsx47(
        BorderSide,
        {
          side,
          getValue,
          onChange,
          onFocus,
          showSeparator: i > 0
        },
        side
      ))
    ] });
  }
  return /* @__PURE__ */ jsx47(
    BorderFields,
    {
      value,
      onChange: (v) => onChange("border", v),
      onFocus,
      toggleButton,
      label: "Border"
    }
  );
}
function BorderFields({ value, onChange, onFocus, toggleButton, label }) {
  const parsed = useMemo13(() => parseBorder(value), [value]);
  const handleColorChange = useCallback28(
    (color2) => onChange(serializeBorder({ ...parsed, color: color2 })),
    [parsed, onChange]
  );
  const handleWidthChange = useCallback28(
    (width) => {
      const numericWidth = parseFloat(width);
      const style2 = numericWidth > 0 && parsed.style === "none" ? "solid" : parsed.style;
      onChange(serializeBorder({ ...parsed, width, style: style2 }));
    },
    [parsed, onChange]
  );
  const handleStyleChange = useCallback28(
    (style2) => onChange(serializeBorder({ ...parsed, style: style2 })),
    [parsed, onChange]
  );
  return /* @__PURE__ */ jsxs34(Fragment16, { children: [
    /* @__PURE__ */ jsx47(
      ColorInput,
      {
        label: "border-color",
        displayName: label,
        value: parsed.color,
        onChange: handleColorChange,
        onFocus
      }
    ),
    /* @__PURE__ */ jsx47(
      NumberInput,
      {
        displayName: "Width",
        value: parsed.width,
        units: BORDER_WIDTH_UNITS,
        indent: true,
        onChange: handleWidthChange,
        onFocus,
        endContent: toggleButton
      }
    ),
    /* @__PURE__ */ jsx47(
      SelectInput,
      {
        label: "border-style",
        displayName: "Style",
        value: parsed.style,
        options: BORDER_STYLES,
        indent: true,
        onChange: handleStyleChange,
        onFocus
      }
    )
  ] });
}
function BorderSide({ side, getValue, onChange, onFocus, showSeparator }) {
  const sideLabel = side.charAt(0).toUpperCase() + side.slice(1);
  const prefix = `border-${side}`;
  const handleColorChange = useCallback28(
    (color2) => onChange(`${prefix}-color`, color2),
    [prefix, onChange]
  );
  const handleWidthChange = useCallback28(
    (width) => {
      onChange(`${prefix}-width`, width);
      const numericWidth = parseFloat(width);
      const currentStyle = getValue(`${prefix}-style`);
      if (numericWidth > 0 && (!currentStyle || currentStyle === "none")) {
        onChange(`${prefix}-style`, "solid");
      }
    },
    [prefix, onChange, getValue]
  );
  const handleStyleChange = useCallback28(
    (style2) => onChange(`${prefix}-style`, style2),
    [prefix, onChange]
  );
  return /* @__PURE__ */ jsxs34(Fragment16, { children: [
    showSeparator && /* @__PURE__ */ jsx47("div", { className: BorderInput_default.separator }),
    /* @__PURE__ */ jsx47(
      ColorInput,
      {
        label: `${prefix}-color`,
        displayName: sideLabel,
        value: getValue(`${prefix}-color`),
        onChange: handleColorChange,
        onFocus
      }
    ),
    /* @__PURE__ */ jsx47(
      NumberInput,
      {
        displayName: "Width",
        value: getValue(`${prefix}-width`),
        units: BORDER_WIDTH_UNITS,
        indent: true,
        onChange: handleWidthChange,
        onFocus
      }
    ),
    /* @__PURE__ */ jsx47(
      SelectInput,
      {
        label: `${prefix}-style`,
        displayName: "Style",
        value: getValue(`${prefix}-style`),
        options: BORDER_STYLES,
        indent: true,
        onChange: handleStyleChange,
        onFocus
      }
    )
  ] });
}

