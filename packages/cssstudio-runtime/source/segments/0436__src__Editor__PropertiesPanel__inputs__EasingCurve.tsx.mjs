// src/Editor/PropertiesPanel/inputs/EasingCurve.tsx
import { useMemo as useMemo16 } from "react";
import { Fragment as Fragment19, jsx as jsx50, jsxs as jsxs37 } from "react/jsx-runtime";
function EasingCurve({
  curve,
  color: color2 = "#fff",
  width,
  height,
  left = 0,
  top = 0,
  right = width,
  bottom = height,
  axisWidth = 1,
  axisColor,
  pathWidth = 3
}) {
  const drawableWidth = right - left;
  const drawableHeight = bottom - top;
  const d = useMemo16(() => {
    const easingFunction = cubicBezier(...curve);
    let output = `M ${left},${bottom} `;
    for (let i = 0; i <= drawableWidth; i++) {
      const x = left + i;
      const y = top + mix(drawableHeight, 0, easingFunction(i / drawableWidth));
      output += `L ${x},${y.toFixed(3)} `;
    }
    return output;
  }, [curve, drawableWidth, drawableHeight, left, top]);
  const borderPoints = `${left},${top} ${left},${bottom} ${right},${bottom}`;
  return /* @__PURE__ */ jsxs37(Fragment19, { children: [
    axisColor && /* @__PURE__ */ jsx50(
      "polyline",
      {
        fill: "none",
        stroke: axisColor,
        strokeWidth: axisWidth,
        points: borderPoints
      }
    ),
    /* @__PURE__ */ jsx50(
      "path",
      {
        d,
        fill: "none",
        stroke: color2,
        strokeWidth: pathWidth,
        strokeLinecap: "round"
      }
    )
  ] });
}

