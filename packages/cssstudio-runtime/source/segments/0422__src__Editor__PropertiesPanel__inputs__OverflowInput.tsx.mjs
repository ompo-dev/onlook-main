// src/Editor/PropertiesPanel/inputs/OverflowInput.tsx
import { useState as useState16 } from "react";
import { Fragment as Fragment14, jsx as jsx45, jsxs as jsxs32 } from "react/jsx-runtime";
var OVERFLOW_OPTIONS = ["visible", "hidden", "scroll", "auto", "clip"];
function OverflowInput({
  value,
  getValue,
  onChange,
  onFocus
}) {
  const [isSplit, setIsSplit] = useState16(false);
  const overflowX = getValue("overflow-x");
  const overflowY = getValue("overflow-y");
  const axesDiffer = overflowX !== overflowY && overflowX !== "" && overflowY !== "";
  const showSplit = isSplit || axesDiffer;
  const handleToggle = () => {
    if (showSplit) {
      const collapsed = overflowX || overflowY || value;
      onChange("overflow", collapsed);
      setIsSplit(false);
    } else {
      setIsSplit(true);
    }
  };
  const toggleButton = /* @__PURE__ */ jsx45(
    "button",
    {
      className: inputs_default.toggleButton,
      onClick: handleToggle,
      title: showSplit ? "Collapse overflow" : "Split overflow axes",
      style: { color: showSplit ? "var(--cs-accent)" : void 0 },
      children: /* @__PURE__ */ jsx45(SplitAxisIcon, {})
    }
  );
  return /* @__PURE__ */ jsxs32(Fragment14, { children: [
    /* @__PURE__ */ jsx45(
      SelectInput,
      {
        label: "overflow",
        displayName: "Overflow",
        value,
        options: OVERFLOW_OPTIONS,
        onChange: (v) => onChange("overflow", v),
        onFocus,
        endContent: toggleButton
      }
    ),
    showSplit && /* @__PURE__ */ jsxs32(Fragment14, { children: [
      /* @__PURE__ */ jsx45(
        SelectInput,
        {
          label: "overflow-x",
          displayName: "X",
          value: overflowX,
          options: OVERFLOW_OPTIONS,
          onChange: (v) => onChange("overflow-x", v),
          onFocus,
          indent: true
        }
      ),
      /* @__PURE__ */ jsx45(
        SelectInput,
        {
          label: "overflow-y",
          displayName: "Y",
          value: overflowY,
          options: OVERFLOW_OPTIONS,
          onChange: (v) => onChange("overflow-y", v),
          onFocus,
          indent: true
        }
      )
    ] })
  ] });
}

