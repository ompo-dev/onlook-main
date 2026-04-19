// src/Editor/PropertiesPanel/inputs/BezierCurveEditor.tsx
import {
  useEffect as useEffect27,
  useLayoutEffect as useLayoutEffect3,
  useRef as useRef26,
  useState as useState19
} from "react";
import { jsx as jsx52, jsxs as jsxs39 } from "react/jsx-runtime";
var progress2 = (from, to, value) => {
  const toFromDifference = to - from;
  return toFromDifference === 0 ? 1 : (value - from) / toFromDifference;
};
function BezierCurveEditor({
  color: color2 = "#fff",
  axisColor = "#fff",
  axisWidth = 2,
  pathWidth = 2,
  controlRadius = 5,
  hitRadius = 25,
  tetherWidth = 1,
  tetherDashArray = "4, 2",
  curve,
  onChange
}) {
  const [size, setSize] = useState19({ width: 0, height: 0 });
  const [focusedPoint, setFocusedPoint] = useState19(null);
  const svg = useRef26(null);
  const point1 = useRef26(null);
  const point2 = useRef26(null);
  useEffect27(() => {
    const preventDefault = (e) => e.preventDefault();
    point1.current?.addEventListener("touchstart", preventDefault);
    point2.current?.addEventListener("touchstart", preventDefault);
    return () => {
      point1.current?.removeEventListener("touchstart", preventDefault);
      point2.current?.removeEventListener("touchstart", preventDefault);
    };
  }, []);
  const [x1, y1, x2, y2] = curve;
  const x1Pos = x1 * size.width;
  const y1Pos = size.height - y1 * size.height;
  const x2Pos = x2 * size.width;
  const y2Pos = size.height - y2 * size.height;
  const dx = x2Pos - x1Pos;
  const dy = y2Pos - y1Pos;
  const distance2 = Math.sqrt(dx * dx + dy * dy);
  let hit1X = x1Pos;
  let hit1Y = y1Pos;
  let hit2X = x2Pos;
  let hit2Y = y2Pos;
  const overlapDistance = hitRadius * 2;
  if (distance2 < overlapDistance && distance2 > 0) {
    const unitX = dx / distance2;
    const unitY = dy / distance2;
    const separationNeeded = (overlapDistance - distance2) / 2;
    const maxSeparation = hitRadius - controlRadius;
    const separation = Math.min(separationNeeded, maxSeparation);
    hit1X = x1Pos - unitX * separation;
    hit1Y = y1Pos - unitY * separation;
    hit2X = x2Pos + unitX * separation;
    hit2Y = y2Pos + unitY * separation;
  }
  useLayoutEffect3(() => {
    if (!svg.current) return;
    const updateSize = () => {
      if (!svg.current) return;
      setSize({
        width: svg.current.clientWidth,
        height: svg.current.clientHeight
      });
    };
    return resize(svg.current, updateSize);
  }, []);
  const drag2 = (point, snapToCursor = false) => (startEvent) => {
    const xi = point * 2;
    const yi = xi + 1;
    const {
      currentTarget,
      pointerId,
      clientX: startX,
      clientY: startY
    } = startEvent;
    let hasMoved = false;
    startEvent.preventDefault();
    startEvent.stopPropagation();
    const element = point === 0 ? point1.current : point2.current;
    if (!element) return;
    element.style.cursor = "grabbing";
    element.setPointerCapture(pointerId);
    const svgElement = svg.current;
    if (!svgElement) return;
    const rect = svgElement.getBoundingClientRect();
    const centerX = point === 0 ? x1Pos : x2Pos;
    const centerY = point === 0 ? y1Pos : y2Pos;
    const centerXScreen = rect.left + centerX / size.width * rect.width;
    const centerYScreen = rect.top + centerY / size.height * rect.height;
    const offsetX = snapToCursor ? 0 : startX - centerXScreen;
    const offsetY = snapToCursor ? 0 : startY - centerYScreen;
    const onMove = (x, y) => {
      const newBezier = [
        ...curve
      ];
      newBezier[xi] = Math.max(0, Math.min(1, x));
      newBezier[yi] = y;
      onChange(newBezier);
    };
    function moveHandler(moveEvent) {
      const { clientX, clientY } = moveEvent;
      moveEvent.stopPropagation();
      moveEvent.preventDefault();
      hasMoved = true;
      const adjustedX = clientX - offsetX;
      const adjustedY = clientY - offsetY;
      const x = progress2(rect.left, rect.right, adjustedX);
      const y = progress2(rect.bottom, rect.top, adjustedY);
      const xFixed = Math.round(x * 1e3) / 1e3;
      const yFixed = Math.round(y * 1e3) / 1e3;
      onMove(xFixed, yFixed);
    }
    function upHandler(upEvent) {
      upEvent.stopPropagation();
      upEvent.preventDefault();
      if (!hasMoved && currentTarget.classList.contains("reset-control-point")) {
        if (point === 0) {
          onMove(0, 0);
        } else {
          onMove(1, 1);
        }
      }
      try {
        element.releasePointerCapture(pointerId);
      } catch (e) {
      }
      element.style.cursor = "grab";
      document.removeEventListener("pointermove", moveHandler);
      document.removeEventListener("pointerup", upHandler);
      document.removeEventListener("pointercancel", upHandler);
    }
    document.addEventListener("pointermove", moveHandler);
    document.addEventListener("pointerup", upHandler);
    document.addEventListener("pointercancel", upHandler);
  };
  const movePoint = (point, deltaX, deltaY) => {
    const xi = point * 2;
    const yi = xi + 1;
    const newBezier = [...curve];
    const newX = Math.max(0, Math.min(1, curve[xi] + deltaX));
    const newY = curve[yi] + deltaY;
    newBezier[xi] = Math.round(newX * 1e3) / 1e3;
    newBezier[yi] = Math.round(newY * 1e3) / 1e3;
    onChange(newBezier);
  };
  const handleKeyDown = (point) => (e) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const increment = e.shiftKey ? 0.01 : 0.1;
    let deltaX = 0;
    let deltaY = 0;
    switch (e.key) {
      case "ArrowUp":
        deltaY = increment;
        break;
      case "ArrowDown":
        deltaY = -increment;
        break;
      case "ArrowLeft":
        deltaX = -increment;
        break;
      case "ArrowRight":
        deltaX = increment;
        break;
    }
    movePoint(point, deltaX, deltaY);
  };
  return /* @__PURE__ */ jsxs39(
    "svg",
    {
      ref: svg,
      style: {
        width: "100%",
        aspectRatio: 1,
        display: "block",
        overflow: "visible",
        position: "relative",
        zIndex: 1
      },
      viewBox: `0 0 ${size.width} ${size.height}`,
      children: [
        /* @__PURE__ */ jsx52(
          EasingCurve,
          {
            curve,
            width: size.width,
            height: size.height,
            color: color2,
            pathWidth,
            axisColor,
            axisWidth
          }
        ),
        /* @__PURE__ */ jsx52(
          "polyline",
          {
            fill: "none",
            stroke: axisColor,
            strokeWidth: tetherWidth,
            strokeDasharray: tetherDashArray,
            points: `0,${size.height} ${x1Pos},${y1Pos}`
          }
        ),
        /* @__PURE__ */ jsx52(
          "polyline",
          {
            fill: "none",
            stroke: axisColor,
            strokeWidth: tetherWidth,
            strokeDasharray: tetherDashArray,
            points: `${size.width},0 ${x2Pos},${y2Pos}`
          }
        ),
        /* @__PURE__ */ jsx52(
          "circle",
          {
            className: "reset-control-point",
            r: controlRadius,
            cx: 0,
            cy: size.height,
            fill: color2,
            onPointerDown: drag2(0, true),
            style: { opacity: 0.3, touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx52(
          "circle",
          {
            className: "reset-control-point",
            cx: size.width,
            cy: 0,
            r: controlRadius,
            fill: color2,
            onPointerDown: drag2(1, true),
            style: { opacity: 0.3, touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx52(
          "circle",
          {
            r: controlRadius,
            fill: color2,
            cx: x1Pos,
            cy: y1Pos,
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx52(
          "circle",
          {
            r: controlRadius,
            fill: color2,
            cx: x2Pos,
            cy: y2Pos,
            style: { touchAction: "none" }
          }
        ),
        focusedPoint === 0 && /* @__PURE__ */ jsx52(
          "circle",
          {
            r: controlRadius + 3,
            cx: x1Pos,
            cy: y1Pos,
            fill: "none",
            stroke: color2,
            strokeWidth: 2,
            style: { pointerEvents: "none" }
          }
        ),
        focusedPoint === 1 && /* @__PURE__ */ jsx52(
          "circle",
          {
            r: controlRadius + 3,
            cx: x2Pos,
            cy: y2Pos,
            fill: "none",
            stroke: color2,
            strokeWidth: 2,
            style: { pointerEvents: "none" }
          }
        ),
        /* @__PURE__ */ jsx52(
          "circle",
          {
            ref: point1,
            r: hitRadius,
            fill: "transparent",
            cx: hit1X,
            cy: hit1Y,
            tabIndex: 0,
            focusable: "true",
            onPointerDown: drag2(0),
            onFocus: () => setFocusedPoint(0),
            onBlur: () => setFocusedPoint(null),
            onKeyDown: handleKeyDown(0),
            style: hitStyle
          }
        ),
        /* @__PURE__ */ jsx52(
          "circle",
          {
            ref: point2,
            r: hitRadius,
            fill: "transparent",
            cx: hit2X,
            cy: hit2Y,
            tabIndex: 0,
            focusable: "true",
            onPointerDown: drag2(1),
            onFocus: () => setFocusedPoint(1),
            onBlur: () => setFocusedPoint(null),
            onKeyDown: handleKeyDown(1),
            style: hitStyle
          }
        )
      ]
    }
  );
}
var hitStyle = { touchAction: "none", cursor: "grab", outline: "none" };

