// src/Editor/PropertiesPanel/inputs/PerCornerToggle.tsx
import { Fragment as Fragment13, jsx as jsx44, jsxs as jsxs31 } from "react/jsx-runtime";
var CORNER_MAP = {
  "border-radius": [
    { label: "border-top-left-radius", suffix: "TL" },
    { label: "border-top-right-radius", suffix: "TR" },
    { label: "border-bottom-right-radius", suffix: "BR" },
    { label: "border-bottom-left-radius", suffix: "BL" }
  ],
  "corner-shape": [
    { label: "corner-shape-top-left", suffix: "TL" },
    { label: "corner-shape-top-right", suffix: "TR" },
    { label: "corner-shape-bottom-right", suffix: "BR" },
    { label: "corner-shape-bottom-left", suffix: "BL" }
  ]
};
function PerCornerToggle({
  prop,
  displayName,
  value,
  getValue,
  onChange,
  onFocus,
  type = "number",
  options
}) {
  const { splitCorners, toggleSplitCorners } = useStore2();
  const isSplit = splitCorners[prop] ?? false;
  const corners = CORNER_MAP[prop] ?? [];
  const cornerValues = corners.map((c) => getValue(c.label));
  const allSame = cornerValues.every((v) => v === cornerValues[0]);
  const showSplit = isSplit || !allSame && cornerValues.some((v) => v !== "");
  const handleToggle = () => {
    if (showSplit) {
      const tlValue = getValue(corners[0].label);
      onChange(prop, tlValue);
    }
    toggleSplitCorners(prop);
  };
  const toggleButton = /* @__PURE__ */ jsx44(
    "button",
    {
      className: inputs_default.toggleButton,
      onClick: handleToggle,
      title: showSplit ? "Collapse to shorthand" : "Split into corners",
      style: { color: showSplit ? "var(--cs-accent)" : void 0 },
      children: /* @__PURE__ */ jsx44(PerCornerIcon, {})
    }
  );
  if (!showSplit) {
    if (type === "number") {
      return /* @__PURE__ */ jsx44(
        NumberInput,
        {
          label: prop,
          displayName,
          value,
          onChange: (v) => onChange(prop, v),
          onFocus,
          endContent: toggleButton
        }
      );
    }
    if (type === "corner-shape") {
      return /* @__PURE__ */ jsx44(
        CornerShapeInput,
        {
          label: prop,
          displayName,
          value,
          onChange: (v) => onChange(prop, v),
          onFocus,
          endContent: toggleButton
        }
      );
    }
    return /* @__PURE__ */ jsx44(
      SelectInput,
      {
        label: prop,
        displayName,
        value,
        options: options ?? [],
        onChange: (v) => onChange(prop, v),
        onFocus,
        endContent: toggleButton
      }
    );
  }
  return /* @__PURE__ */ jsxs31(Fragment13, { children: [
    /* @__PURE__ */ jsxs31("div", { className: inputs_default.row, children: [
      /* @__PURE__ */ jsx44("label", { className: inputs_default.label, title: displayName, children: displayName }),
      /* @__PURE__ */ jsx44("span", {}),
      toggleButton
    ] }),
    corners.map((corner) => type === "number" ? /* @__PURE__ */ jsx44(
      NumberInput,
      {
        label: corner.label,
        displayName: corner.suffix,
        value: getValue(corner.label),
        showSlider: false,
        compact: true,
        indent: true,
        onChange: (v) => onChange(corner.label, v),
        onFocus
      },
      corner.label
    ) : type === "corner-shape" ? /* @__PURE__ */ jsx44(
      CornerShapeInput,
      {
        label: corner.label,
        displayName: corner.suffix,
        value: getValue(corner.label),
        onChange: (v) => onChange(corner.label, v),
        onFocus
      },
      corner.label
    ) : /* @__PURE__ */ jsx44(
      SelectInput,
      {
        label: corner.label,
        displayName: corner.suffix,
        value: getValue(corner.label),
        options: options ?? [],
        onChange: (v) => onChange(corner.label, v),
        onFocus
      },
      corner.label
    ))
  ] });
}

