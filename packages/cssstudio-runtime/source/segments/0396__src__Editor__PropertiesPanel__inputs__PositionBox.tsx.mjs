// src/Editor/PropertiesPanel/inputs/PositionBox.tsx
import { useCallback as useCallback19 } from "react";
import { Fragment as Fragment8, jsx as jsx33 } from "react/jsx-runtime";
var INSET_PROPS = [
  { prop: "top", displayName: "Top" },
  { prop: "left", displayName: "Left" },
  { prop: "right", displayName: "Right" },
  { prop: "bottom", displayName: "Bottom" }
];
function PositionBox({ position, getValue, onChange, onFocus }) {
  const isRelative = position === "relative";
  const handleChange = useCallback19(
    (prop, value) => {
      if (isRelative) {
        if (prop === "top") onChange("bottom", "auto");
        if (prop === "bottom") onChange("top", "auto");
        if (prop === "left") onChange("right", "auto");
        if (prop === "right") onChange("left", "auto");
      }
      onChange(prop, value);
    },
    [isRelative, onChange]
  );
  return /* @__PURE__ */ jsx33(Fragment8, { children: INSET_PROPS.map(({ prop, displayName }) => /* @__PURE__ */ jsx33(
    NumberInput,
    {
      label: prop,
      displayName,
      value: getValue(prop),
      onChange: (v) => handleChange(prop, v),
      onFocus
    },
    prop
  )) });
}

