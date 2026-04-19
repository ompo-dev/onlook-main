// src/Editor/PropertiesPanel/inputs/SelectInput.tsx
import { jsx as jsx25, jsxs as jsxs15 } from "react/jsx-runtime";
function SelectInput({ label, displayName, value, options, indent = false, endContent, onChange, onFocus }) {
  const handleChange = useCallback14(
    (e) => {
      onChange(e.target.value);
    },
    [onChange]
  );
  const labelText = displayName || label;
  return /* @__PURE__ */ jsxs15("div", { className: `${inputs_default.row} ${indent ? inputs_default.indent : ""}`, children: [
    /* @__PURE__ */ jsx25("label", { className: inputs_default.label, title: labelText, children: labelText }),
    /* @__PURE__ */ jsxs15(
      "select",
      {
        className: inputs_default.select,
        value,
        onChange: handleChange,
        onFocus,
        children: [
          !options.includes(value) && /* @__PURE__ */ jsx25("option", { value, children: value }),
          options.map((opt) => /* @__PURE__ */ jsx25("option", { value: opt, children: opt }, opt))
        ]
      }
    ),
    endContent
  ] });
}

