// src/Editor/state/types.ts
var AXIS_OPTIONS = ["block", "inline", "x", "y"];
var SCROLLER_OPTIONS = ["nearest", "root", "self"];
var RANGE_NAME_OPTIONS = ["normal", "cover", "contain", "entry", "exit", "entry-crossing", "exit-crossing"];
function buildTimelineValue(config) {
  if (config.type === "scroll") {
    const parts = [];
    if (config.scroller !== "nearest") parts.push(config.scroller);
    if (config.scrollAxis !== "block") parts.push(config.scrollAxis);
    return parts.length ? `scroll(${parts.join(" ")})` : "scroll()";
  }
  if (config.type === "view") {
    if (config.viewAxis !== "block") return `view(${config.viewAxis})`;
    return "view()";
  }
  return "auto";
}
var TRIGGER_LABELS = {
  "duration": "Animation",
  "scroll": "Scroll",
  "scroll-enter": "Scroll Enter",
  "scroll-exit": "Scroll Exit"
};
var SCROLLER_VALUES = new Set(SCROLLER_OPTIONS);
var AXIS_VALUES = new Set(AXIS_OPTIONS);
function parseTimelineValue(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("scroll(")) {
    const inner = trimmed.slice(7, -1).trim();
    const tokens = inner.split(/\s+/).filter(Boolean);
    let scroller = "nearest";
    let axis = "block";
    for (const t of tokens) {
      if (SCROLLER_VALUES.has(t)) scroller = t;
      else if (AXIS_VALUES.has(t)) axis = t;
    }
    return { type: "scroll", scroller, axis };
  }
  if (trimmed.startsWith("view(")) {
    const inner = trimmed.slice(5, -1).trim();
    const tokens = inner.split(/\s+/).filter(Boolean);
    let axis = "block";
    const insets = [];
    for (const t of tokens) {
      if (AXIS_VALUES.has(t)) axis = t;
      else insets.push(t);
    }
    return {
      type: "view",
      axis,
      insetStart: insets[0] ?? "auto",
      insetEnd: insets[1] ?? insets[0] ?? "auto"
    };
  }
  return { type: "auto" };
}
function classifyTrigger(timeline, rangeStart, rangeEnd) {
  const parsed = parseTimelineValue(timeline);
  if (parsed.type === "scroll") return "scroll";
  if (parsed.type === "view") {
    const rsName = rangeStart.split(/\s+/)[0];
    const reName = rangeEnd.split(/\s+/)[0];
    if (rsName === "entry" && (reName === "entry" || reName === "normal")) return "scroll-enter";
    if (rsName === "exit" && (reName === "exit" || reName === "normal")) return "scroll-exit";
    if (rsName === "normal" && reName === "normal") return "scroll";
    return "scroll";
  }
  return "duration";
}
function triggerDefaults(trigger) {
  const base = {
    name: "none",
    trigger,
    timeline: "auto",
    rangeStart: "normal",
    rangeEnd: "normal",
    duration: "1s",
    easing: "ease",
    fillMode: "both",
    direction: "normal",
    iterationCount: "1",
    delay: "0s",
    viewInsetStart: "auto",
    viewInsetEnd: "auto",
    scroller: "nearest",
    axis: "block"
  };
  switch (trigger) {
    case "scroll":
      return { ...base, timeline: "scroll()", duration: "auto" };
    case "scroll-enter":
      return { ...base, timeline: "view()", rangeStart: "entry 0%", rangeEnd: "entry 100%", duration: "auto", easing: "linear" };
    case "scroll-exit":
      return { ...base, timeline: "view()", rangeStart: "exit 0%", rangeEnd: "exit 100%", duration: "auto", easing: "linear" };
    default:
      return base;
  }
}
function buildAnimationProperties(entries) {
  if (entries.length === 0) return {};
  const names = [];
  const durations = [];
  const timingFns = [];
  const delays = [];
  const fills = [];
  const directions = [];
  const iterations = [];
  const timelines = [];
  const rangeStarts = [];
  const rangeEnds = [];
  const insets = [];
  let hasRange = false;
  let hasInset = false;
  for (const e of entries) {
    names.push(e.name);
    durations.push(e.duration);
    timingFns.push(e.easing || "ease");
    delays.push(e.delay);
    fills.push(e.fillMode);
    directions.push(e.direction);
    iterations.push(e.iterationCount);
    timelines.push(e.timeline);
    if (e.rangeStart !== "normal" || e.rangeEnd !== "normal") {
      hasRange = true;
    }
    rangeStarts.push(e.rangeStart);
    rangeEnds.push(e.rangeEnd);
    if (e.viewInsetStart !== "auto" || e.viewInsetEnd !== "auto") {
      hasInset = true;
      insets.push(`${e.viewInsetStart} ${e.viewInsetEnd}`);
    } else {
      insets.push("auto");
    }
  }
  const result = {
    "animation-name": names.join(", "),
    "animation-duration": durations.join(", "),
    "animation-timing-function": timingFns.join(", "),
    "animation-delay": delays.join(", "),
    "animation-fill-mode": fills.join(", "),
    "animation-direction": directions.join(", "),
    "animation-iteration-count": iterations.join(", "),
    "animation-timeline": timelines.join(", ")
  };
  if (hasRange) {
    result["animation-range-start"] = rangeStarts.join(", ");
    result["animation-range-end"] = rangeEnds.join(", ");
  }
  if (hasInset) {
    result["view-timeline-inset"] = insets.join(", ");
  }
  return result;
}

