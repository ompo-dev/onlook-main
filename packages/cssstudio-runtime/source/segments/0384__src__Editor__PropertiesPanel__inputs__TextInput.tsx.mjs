// src/Editor/PropertiesPanel/inputs/TextInput.tsx
import { useState as useState8, useCallback as useCallback16, useEffect as useEffect20 } from "react";
import { jsx as jsx27, jsxs as jsxs17 } from "react/jsx-runtime";
function TextInput({ label, displayName, value, mono, indent = false, onChange, onFocus, onLabelDoubleClick, labelOverride }) {
  const [localValue, setLocalValue] = useState8(value);
  useEffect20(() => {
    setLocalValue(value);
  }, [value]);
  const handleChange = useCallback16(
    (e) => {
      setLocalValue(e.target.value);
    },
    []
  );
  const handleBlur = useCallback16(() => {
    if (localValue !== value) {
      onChange(localValue);
    }
  }, [localValue, value, onChange]);
  const handleKeyDown = useCallback16(
    (e) => {
      if (e.key === "Enter") onChange(localValue);
    },
    [localValue, onChange]
  );
  const labelText = displayName || label;
  return /* @__PURE__ */ jsxs17("div", { className: `${inputs_default.row} ${indent ? inputs_default.indent : ""}`, children: [
    labelOverride ?? /* @__PURE__ */ jsx27("label", { className: `${inputs_default.label} ${mono ? inputs_default.mono : ""}`, title: labelText, onDoubleClick: onLabelDoubleClick, children: labelText }),
    /* @__PURE__ */ jsx27(
      "input",
      {
        type: "text",
        className: inputs_default.textInput,
        value: localValue,
        onChange: handleChange,
        onBlur: handleBlur,
        onKeyDown: handleKeyDown,
        onFocus
      }
    )
  ] });
}

