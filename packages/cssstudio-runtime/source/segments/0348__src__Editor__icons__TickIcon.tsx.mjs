// src/Editor/icons/TickIcon.tsx
import { jsx as jsx12 } from "react/jsx-runtime";
function TickIcon({
  color: color2 = "currentColor",
  delay: delay2 = 0.1
}) {
  return /* @__PURE__ */ jsx12(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: color2,
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      children: /* @__PURE__ */ jsx12(
        motion.path,
        {
          d: "M4 12l5 5L20 6",
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 25,
            delay: delay2
          }
        }
      )
    }
  );
}

