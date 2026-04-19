// src/Editor/icons/ApplyIcons.tsx
import { jsx as jsx13, jsxs as jsxs5 } from "react/jsx-runtime";
var SIZE = 16;
var STROKE_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
function ApplyIcon() {
  return /* @__PURE__ */ jsxs5("svg", { width: SIZE, height: SIZE, viewBox: "0 0 24 24", ...STROKE_PROPS, children: [
    /* @__PURE__ */ jsx13("circle", { cx: "12", cy: "12", r: "10" }),
    /* @__PURE__ */ jsx13("path", { d: "m16 12-4-4-4 4" }),
    /* @__PURE__ */ jsx13("path", { d: "M12 16V8" })
  ] });
}
function ApplySpinnerIcon() {
  return /* @__PURE__ */ jsxs5("svg", { width: SIZE, height: SIZE, viewBox: "0 0 24 24", ...STROKE_PROPS, children: [
    /* @__PURE__ */ jsxs5(
      motion.g,
      {
        style: { transformOrigin: "12px 12px" },
        animate: { rotate: 360 },
        transition: { duration: 1, repeat: Infinity, ease: "linear" },
        children: [
          /* @__PURE__ */ jsx13("path", { d: "M12 2a10 10 0 0 1 7.38 16.75" }),
          /* @__PURE__ */ jsx13("path", { d: "M2.5 8.875a10 10 0 0 0-.5 3" }),
          /* @__PURE__ */ jsx13("path", { d: "M2.83 16a10 10 0 0 0 2.43 3.4" }),
          /* @__PURE__ */ jsx13("path", { d: "M4.636 5.235a10 10 0 0 1 .891-.857" }),
          /* @__PURE__ */ jsx13("path", { d: "M8.644 21.42a10 10 0 0 0 7.631-.38" })
        ]
      }
    ),
    /* @__PURE__ */ jsx13("path", { d: "m16 12-4-4-4 4" }),
    /* @__PURE__ */ jsx13("path", { d: "M12 16V8" })
  ] });
}

