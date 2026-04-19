// src/Editor/PropertiesPanel/inputs/Toggle.tsx
import { jsx as jsx18 } from "react/jsx-runtime";
function Toggle({ value, onChange }) {
  return /* @__PURE__ */ jsx18(
    "button",
    {
      className: `${Toggle_default.toggle} ${value ? Toggle_default.toggleOn : ""}`,
      onClick: () => onChange(!value),
      children: /* @__PURE__ */ jsx18("span", { className: Toggle_default.thumb })
    }
  );
}

