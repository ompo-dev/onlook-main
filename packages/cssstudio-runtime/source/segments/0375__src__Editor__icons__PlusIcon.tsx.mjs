// src/Editor/icons/PlusIcon.tsx
import { jsx as jsx23, jsxs as jsxs13 } from "react/jsx-runtime";
function PlusIcon({ size = 12, className }) {
  return /* @__PURE__ */ jsxs13(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      children: [
        /* @__PURE__ */ jsx23("path", { d: "M5 12h14" }),
        /* @__PURE__ */ jsx23("path", { d: "M12 5v14" })
      ]
    }
  );
}

