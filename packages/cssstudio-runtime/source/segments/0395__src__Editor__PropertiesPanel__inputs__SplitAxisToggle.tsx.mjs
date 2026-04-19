// src/Editor/PropertiesPanel/inputs/SplitAxisToggle.tsx
import { Fragment as Fragment7, jsx as jsx32, jsxs as jsxs21 } from "react/jsx-runtime";
var AXIS_SIDES = {
  padding: [
    { label: "padding-top", displayName: "Top" },
    { label: "padding-right", displayName: "Right" },
    { label: "padding-bottom", displayName: "Bottom" },
    { label: "padding-left", displayName: "Left" }
  ],
  margin: [
    { label: "margin-top", displayName: "Top" },
    { label: "margin-right", displayName: "Right" },
    { label: "margin-bottom", displayName: "Bottom" },
    { label: "margin-left", displayName: "Left" }
  ]
};
function SplitAxisToggle({
  prop,
  displayName,
  value,
  getValue,
  onChange,
  onFocus
}) {
  const { splitAxis, toggleSplitAxis } = useStore2();
  const isSplit = splitAxis[prop] ?? false;
  const sides = AXIS_SIDES[prop] ?? [];
  const sideValues = sides.map((s) => getValue(s.label));
  const allSame = sideValues.every((v) => v === sideValues[0]);
  const showSplit = isSplit || !allSame && sideValues.some((v) => v !== "");
  const handleCollapse = () => {
    if (showSplit) {
      const topValue = getValue(sides[0].label);
      onChange(prop, topValue);
    }
    toggleSplitAxis(prop);
  };
  const toggleButton = /* @__PURE__ */ jsx32(
    "button",
    {
      className: inputs_default.toggleButton,
      onClick: handleCollapse,
      title: showSplit ? "Collapse to shorthand" : "Split into sides",
      style: { color: showSplit ? "var(--cs-accent)" : void 0 },
      children: /* @__PURE__ */ jsx32(SplitAxisIcon, {})
    }
  );
  if (!showSplit) {
    return /* @__PURE__ */ jsx32(TokenPicker, { value, label: displayName, tokenType: "number", onSelect: (v) => onChange(prop, v), children: /* @__PURE__ */ jsx32(
      NumberInput,
      {
        label: prop,
        displayName,
        value,
        onChange: (v) => onChange(prop, v),
        onFocus,
        endContent: toggleButton
      }
    ) });
  }
  return /* @__PURE__ */ jsxs21(Fragment7, { children: [
    /* @__PURE__ */ jsxs21("div", { className: inputs_default.row, children: [
      /* @__PURE__ */ jsx32("label", { className: inputs_default.label, title: displayName, children: displayName }),
      /* @__PURE__ */ jsx32("span", {}),
      toggleButton
    ] }),
    sides.map((side) => /* @__PURE__ */ jsx32(TokenPicker, { value: getValue(side.label), label: side.displayName, tokenType: "number", onSelect: (v) => onChange(side.label, v), children: /* @__PURE__ */ jsx32(
      NumberInput,
      {
        label: side.label,
        displayName: side.displayName,
        value: getValue(side.label),
        onChange: (v) => onChange(side.label, v),
        onFocus,
        indent: true
      }
    ) }, side.label))
  ] });
}

