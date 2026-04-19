// src/Editor/PropertiesPanel/inputs/TextAreaInput.tsx
import { useState as useState35, useCallback as useCallback44, useEffect as useEffect42 } from "react";
import { jsx as jsx75, jsxs as jsxs59 } from "react/jsx-runtime";
function TextAreaInput({ label, displayName, value, onChange }) {
  const [localValue, setLocalValue] = useState35(value);
  useEffect42(() => {
    setLocalValue(value);
  }, [value]);
  const handleChange = useCallback44(
    (e) => {
      setLocalValue(e.target.value);
    },
    []
  );
  const handleBlur = useCallback44(() => {
    if (localValue !== value) {
      onChange(localValue);
    }
  }, [localValue, value, onChange]);
  const labelText = displayName || label;
  return /* @__PURE__ */ jsxs59("div", { className: inputs_default.textAreaRow, children: [
    /* @__PURE__ */ jsx75("label", { className: inputs_default.label, title: labelText, children: labelText }),
    /* @__PURE__ */ jsx75(
      "textarea",
      {
        className: inputs_default.textArea,
        value: localValue,
        onChange: handleChange,
        onBlur: handleBlur,
        rows: 3
      }
    )
  ] });
}

