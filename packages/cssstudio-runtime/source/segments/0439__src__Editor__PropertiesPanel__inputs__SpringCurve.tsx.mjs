// src/Editor/PropertiesPanel/inputs/SpringCurve.tsx
import { Fragment as Fragment20, jsx as jsx51, jsxs as jsxs38 } from "react/jsx-runtime";
function SpringCurve({
  spring: spring2,
  color: color2 = "#fff",
  width,
  height,
  left = 0,
  top = 0,
  right = width,
  bottom = height,
  axisWidth = 1,
  axisColor,
  pathWidth = 2
}) {
  const drawableWidth = right - left;
  const drawableHeight = bottom - top;
  const springConfig = useMemo17(
    () => ({ ...defaultSpring, ...spring2 }),
    [spring2]
  );
  const d = useMemo17(() => {
    const springGenerator = makeSpring(springConfig);
    const totalDurationMs = springGenerator.calculatedDuration || 1e3;
    let output = `M ${left},${bottom} `;
    let minValue = 0;
    let maxValue = 1;
    const values = [];
    for (let i = 0; i <= drawableWidth; i++) {
      const progress3 = i / drawableWidth;
      const time2 = progress3 * totalDurationMs;
      const state2 = springGenerator.next(time2);
      values.push(state2.value);
      minValue = Math.min(minValue, state2.value);
      maxValue = Math.max(maxValue, state2.value);
    }
    const range = Math.max(maxValue - minValue, 1);
    for (let i = 0; i <= drawableWidth; i++) {
      const x = left + i;
      const normalizedValue = (values[i] - minValue) / range;
      const y = top + mix(drawableHeight, 0, normalizedValue);
      output += `L ${x},${y.toFixed(3)} `;
    }
    return output;
  }, [springConfig, drawableWidth, drawableHeight, left, top, bottom]);
  const borderPoints = `${left},${top} ${left},${bottom} ${right},${bottom}`;
  return /* @__PURE__ */ jsxs38(Fragment20, { children: [
    axisColor && /* @__PURE__ */ jsx51(
      "polyline",
      {
        fill: "none",
        stroke: axisColor,
        strokeWidth: axisWidth,
        points: borderPoints
      }
    ),
    /* @__PURE__ */ jsx51(
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

