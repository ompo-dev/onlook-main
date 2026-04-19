// src/Editor/PropertiesPanel/inputs/ColorPicker/gradient-utils.ts
var nextId2 = 1;
function uid() {
  return `stop-${nextId2++}-${Date.now().toString(36)}`;
}
function createDefaultGradient(firstColor) {
  return {
    type: "linear",
    repeating: false,
    angle: 90,
    shape: "circle",
    posX: "50%",
    posY: "50%",
    stopUnit: "%",
    stops: [
      { id: uid(), color: firstColor ?? "#000000", position: 0 },
      { id: uid(), color: "#ffffff", position: 100 }
    ],
    selectedStopId: null
  };
}
var GRADIENT_RE = /^(repeating-)?(linear|radial|conic)-gradient\(\s*([\s\S]*)\s*\)$/i;
function parseGradient(css2) {
  const trimmed = css2.trim();
  const m2 = trimmed.match(GRADIENT_RE);
  if (!m2) return null;
  const repeating = !!m2[1];
  const type = m2[2].toLowerCase();
  const body = m2[3];
  const parts = splitGradientArgs(body);
  let angle = type === "linear" ? 180 : 0;
  let shape = "circle";
  let posX = "50%";
  let posY = "50%";
  const stopUnit = detectStopUnit(body);
  let stopStartIndex = 0;
  if (parts.length > 0) {
    const first = parts[0].trim();
    if (type === "linear") {
      const angleMatch = first.match(/^([\d.]+)deg$/);
      const dirMatch = first.match(/^to\s+(.+)$/);
      if (angleMatch) {
        angle = parseFloat(angleMatch[1]);
        stopStartIndex = 1;
      } else if (dirMatch) {
        angle = directionToAngle(dirMatch[1].trim());
        stopStartIndex = 1;
      }
    } else if (type === "radial") {
      if (/^(circle|ellipse|closest|farthest)/i.test(first) || /\bat\b/i.test(first)) {
        const atMatch = first.match(/\bat\s+(.+)$/i);
        if (atMatch) {
          shape = first.slice(0, atMatch.index).trim() || "circle";
          const pos = parsePosition(atMatch[1].trim());
          posX = pos.x;
          posY = pos.y;
        } else {
          shape = first;
        }
        stopStartIndex = 1;
      }
    } else if (type === "conic") {
      const conicMatch = first.match(/^from\s+([\d.]+)deg/);
      if (conicMatch) {
        angle = parseFloat(conicMatch[1]);
        stopStartIndex = 1;
      }
      const atMatch = first.match(/\bat\s+(.+)$/i);
      if (atMatch) {
        const pos = parsePosition(atMatch[1].trim());
        posX = pos.x;
        posY = pos.y;
        stopStartIndex = 1;
      }
    }
  }
  const stops = [];
  const stopParts = parts.slice(stopStartIndex);
  for (let i = 0; i < stopParts.length; i++) {
    const parsed = parseStopPart(stopParts[i].trim(), i, stopParts.length);
    if (parsed) stops.push(parsed);
  }
  if (stops.length < 2) return null;
  return {
    type,
    repeating,
    angle,
    shape,
    posX,
    posY,
    stopUnit,
    stops,
    selectedStopId: null
  };
}
function parseStopPart(part, index, total) {
  const posMatch = part.match(/^(.+?)\s+([\d.]+)(%|px)?\s*$/);
  if (posMatch) {
    return {
      id: uid(),
      color: posMatch[1].trim(),
      position: parseFloat(posMatch[2])
    };
  }
  return {
    id: uid(),
    color: part.trim(),
    position: total > 1 ? index / (total - 1) * 100 : 0
  };
}
function detectStopUnit(body) {
  return /\d+px/i.test(body) ? "px" : "%";
}
function splitGradientArgs(body) {
  const parts = [];
  let depth = 0;
  let current3 = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current3);
      current3 = "";
    } else {
      current3 += ch;
    }
  }
  if (current3.trim()) parts.push(current3);
  return parts;
}
function parsePosition(str) {
  const nums = str.match(/([\d.]+)(px|%|)\s+([\d.]+)(px|%|)/);
  if (nums) {
    return {
      x: `${parseFloat(nums[1])}${nums[2] || "%"}`,
      y: `${parseFloat(nums[3])}${nums[4] || "%"}`
    };
  }
  const named = {
    center: { x: "50%", y: "50%" },
    top: { x: "50%", y: "0%" },
    bottom: { x: "50%", y: "100%" },
    left: { x: "0%", y: "50%" },
    right: { x: "100%", y: "50%" },
    "top left": { x: "0%", y: "0%" },
    "top right": { x: "100%", y: "0%" },
    "bottom left": { x: "0%", y: "100%" },
    "bottom right": { x: "100%", y: "100%" }
  };
  return named[str.toLowerCase()] ?? { x: "50%", y: "50%" };
}
function directionToAngle(dir) {
  const map = {
    top: 0,
    right: 90,
    bottom: 180,
    left: 270,
    "top right": 45,
    "right top": 45,
    "bottom right": 135,
    "right bottom": 135,
    "bottom left": 225,
    "left bottom": 225,
    "top left": 315,
    "left top": 315
  };
  return map[dir] ?? 180;
}
function serializeGradient(config) {
  const prefix = config.repeating ? "repeating-" : "";
  const funcName = `${prefix}${config.type}-gradient`;
  const unit = config.stopUnit ?? "%";
  const sortedStops = [...config.stops].sort((a, b) => a.position - b.position);
  const stopStrs = sortedStops.map(
    (s) => `${s.color} ${Math.round(s.position)}${unit}`
  );
  const posX = config.posX ?? "50%";
  const posY = config.posY ?? "50%";
  const atPos = posX !== "50%" || posY !== "50%" ? ` at ${posX} ${posY}` : "";
  let args;
  if (config.type === "linear") {
    args = `${Math.round(config.angle)}deg, ${stopStrs.join(", ")}`;
  } else if (config.type === "radial") {
    args = `${config.shape}${atPos}, ${stopStrs.join(", ")}`;
  } else {
    args = `from ${Math.round(config.angle)}deg${atPos}, ${stopStrs.join(", ")}`;
  }
  return `${funcName}(${args})`;
}
function isGradientValue(css2) {
  return GRADIENT_RE.test(css2.trim());
}

