// src/Editor/PropertiesPanel/inputs/IconTabBar.tsx
import { jsx as jsx28, jsxs as jsxs18 } from "react/jsx-runtime";
function IconTabBar({ label, displayName, value, options, onChange, onFocus }) {
  const handleClick = useCallback17(
    (optValue) => {
      onChange(optValue);
    },
    [onChange]
  );
  const labelText = displayName || label;
  return /* @__PURE__ */ jsxs18("div", { className: inputs_default.row, children: [
    /* @__PURE__ */ jsx28("label", { className: inputs_default.label, title: labelText, children: labelText }),
    /* @__PURE__ */ jsx28("div", { className: IconTabBar_default.bar, onFocus, children: options.map((opt) => /* @__PURE__ */ jsx28(
      "button",
      {
        className: `${IconTabBar_default.tab} ${value === opt.value ? IconTabBar_default.active : ""}`,
        onClick: () => handleClick(opt.value),
        title: opt.title,
        type: "button",
        children: opt.icon
      },
      opt.value
    )) })
  ] });
}

