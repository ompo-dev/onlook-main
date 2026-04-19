// src/Editor/AnimationsPanel/CompactPlaybackControls.tsx
import { jsx as jsx71, jsxs as jsxs55 } from "react/jsx-runtime";
function PlayIcon() {
  return /* @__PURE__ */ jsx71("svg", { viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx71("path", { d: "M8 5v14l11-7z" }) });
}
function PauseIcon() {
  return /* @__PURE__ */ jsx71("svg", { viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx71("path", { d: "M6 4h4v16H6zM14 4h4v16h-4z" }) });
}
function SkipBackIcon() {
  return /* @__PURE__ */ jsx71("svg", { viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx71("path", { d: "M19 20L9 12l10-8v16zM5 4h2v16H5z" }) });
}
function CompactPlaybackControls() {
  const isPlaying = useStore2((s) => s.animPlaybackOrigin !== null);
  const currentTime = useStore2((s) => s.animCurrentTime);
  const startPlaying = useStore2((s) => s.animStartPlaying);
  const stopPlaying = useStore2((s) => s.animStopPlaying);
  const scrubTo = useStore2((s) => s.animScrubTo);
  const duration = useStore2((s) => s.animDuration);
  const hasRule = useStore2((s) => s.selectedKeyframesName !== null);
  const disabled = !hasRule;
  return /* @__PURE__ */ jsxs55("div", { className: `${AnimationsPanel_default.playback} ${disabled ? AnimationsPanel_default.playbackDisabled : ""}`, children: [
    /* @__PURE__ */ jsx71(
      "button",
      {
        className: AnimationsPanel_default.playbackBtn,
        disabled,
        onClick: () => {
          scrubTo(0);
          if (isPlaying) startPlaying();
        },
        title: "Skip to start",
        children: /* @__PURE__ */ jsx71(SkipBackIcon, {})
      }
    ),
    /* @__PURE__ */ jsx71(
      "button",
      {
        className: AnimationsPanel_default.playbackBtn,
        disabled,
        onClick: () => {
          if (isPlaying) {
            stopPlaying();
          } else {
            if (currentTime >= 1) scrubTo(0);
            startPlaying();
          }
        },
        title: isPlaying ? "Pause" : "Play",
        children: isPlaying ? /* @__PURE__ */ jsx71(PauseIcon, {}) : /* @__PURE__ */ jsx71(PlayIcon, {})
      }
    ),
    /* @__PURE__ */ jsxs55("span", { className: AnimationsPanel_default.currentTime, children: [
      Math.round(currentTime * 100),
      "%"
    ] })
  ] });
}

