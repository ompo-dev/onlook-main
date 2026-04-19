// src/Editor/AnimationsPanel/DurationInput.tsx
import { useState as useState32, useEffect as useEffect39 } from "react";
import { jsx as jsx72, jsxs as jsxs56 } from "react/jsx-runtime";
function DurationInput() {
  const duration = useStore2((s) => s.animDuration);
  const setDuration = useStore2((s) => s.setAnimDuration);
  const [localValue, setLocalValue] = useState32(String(duration));
  useEffect39(() => {
    setLocalValue(String(duration));
  }, [duration]);
  function commit() {
    const v = parseFloat(localValue);
    if (!isNaN(v) && v > 0) {
      setDuration(v);
    } else {
      setLocalValue(String(duration));
    }
  }
  return /* @__PURE__ */ jsxs56("div", { className: AnimationsPanel_default.durationWrap, children: [
    /* @__PURE__ */ jsx72(
      "input",
      {
        className: AnimationsPanel_default.durationInput,
        type: "text",
        value: localValue,
        onChange: (e) => setLocalValue(e.target.value),
        onBlur: commit,
        onKeyDown: (e) => {
          if (e.key === "Enter") commit();
        }
      }
    ),
    /* @__PURE__ */ jsx72("span", { className: AnimationsPanel_default.durationLabel, children: "s" })
  ] });
}

