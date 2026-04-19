// src/Editor/AnimationsPanel/CompactTimeMarkers.tsx
import { useRef as useRef37 } from "react";
import { jsx as jsx68, jsxs as jsxs52 } from "react/jsx-runtime";
var MARKERS = [
  { pct: 20, major: false },
  { pct: 40, major: false },
  { pct: 60, major: false },
  { pct: 80, major: false },
  { pct: 100, major: true }
];
function CompactTimeMarkers({ trackWidth, labelWidth }) {
  const scrubTo = useStore2((s) => s.animScrubTo);
  const stopPlaying = useStore2((s) => s.animStopPlaying);
  const dragging = useRef37(false);
  function offsetFromPointer(clientX, rect) {
    if (trackWidth <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left - labelWidth) / trackWidth));
  }
  function handlePointerDown(e) {
    e.stopPropagation();
    stopPlaying();
    const rect = e.currentTarget.getBoundingClientRect();
    scrubTo(offsetFromPointer(e.clientX, rect));
    dragging.current = true;
    const onMove = (ev) => {
      scrubTo(offsetFromPointer(ev.clientX, rect));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }
  return /* @__PURE__ */ jsxs52("div", { className: AnimationsPanel_default.markersRow, onPointerDown: handlePointerDown, children: [
    /* @__PURE__ */ jsx68("div", { style: { width: labelWidth, flexShrink: 0 } }),
    /* @__PURE__ */ jsx68("div", { className: AnimationsPanel_default.markersTrack, children: MARKERS.map(({ pct, major }) => /* @__PURE__ */ jsxs52(
      "span",
      {
        className: major ? AnimationsPanel_default.markerMajor : AnimationsPanel_default.markerMinor,
        style: {
          position: "absolute",
          left: pct / 100 * trackWidth,
          transform: "translateX(-100%)",
          paddingRight: 4
        },
        children: [
          pct,
          "%"
        ]
      },
      pct
    )) })
  ] });
}

