// src/Editor/PropertiesPanel/inputs/CornerShapeInput.tsx
import { useCallback as useCallback26 } from "react";
import { jsx as jsx43, jsxs as jsxs30 } from "react/jsx-runtime";
var SHAPE_OPTIONS = ["round", "scoop", "bevel", "notch", "square", "squircle", "superellipse"];
function parseShape(value) {
  const match = value.match(/^superellipse\(\s*(-?[\d.]+|infinity|-infinity)\s*\)$/);
  if (match) return { shape: "superellipse", param: match[1] === "infinity" ? Infinity : match[1] === "-infinity" ? -Infinity : parseFloat(match[1]) };
  return { shape: value || "round" };
}
function formatShape(shape, param) {
  if (shape === "superellipse") {
    return `superellipse(${param ?? 2})`;
  }
  return shape;
}
function CornerShapeInput({ label, displayName, value, endContent, onChange, onFocus }) {
  const { shape, param } = parseShape(value);
  const handleShapeChange = useCallback26(
    (e) => {
      onChange(formatShape(e.target.value, param));
    },
    [onChange, param]
  );
  const handleParamChange = useCallback26(
    (v) => {
      const num = parseFloat(v);
      if (!isNaN(num)) {
        onChange(formatShape("superellipse", num));
      }
    },
    [onChange]
  );
  const labelText = displayName || label;
  return /* @__PURE__ */ jsxs30("div", { className: inputs_default.row, children: [
    /* @__PURE__ */ jsx43("label", { className: inputs_default.label, title: labelText, children: labelText }),
    /* @__PURE__ */ jsxs30(
      "select",
      {
        className: inputs_default.select,
        value: shape,
        onChange: handleShapeChange,
        onFocus,
        style: shape === "superellipse" ? { flex: "1 1 0", minWidth: 0 } : void 0,
        children: [
          !SHAPE_OPTIONS.includes(shape) && /* @__PURE__ */ jsx43("option", { value: shape, children: shape }),
          SHAPE_OPTIONS.map((opt) => /* @__PURE__ */ jsx43("option", { value: opt, children: opt }, opt))
        ]
      }
    ),
    shape === "superellipse" && /* @__PURE__ */ jsx43(
      NumberInput,
      {
        value: String(param ?? 2),
        min: -10,
        max: 10,
        step: 0.1,
        unit: "",
        showSlider: false,
        compact: true,
        onChange: handleParamChange,
        onFocus
      }
    ),
    endContent
  ] });
}

