// src/Editor/utils/parse-transition.ts
var NAMED_EASINGS = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1]
};
function splitByComma(value) {
  const parts = [];
  let current3 = "";
  let depth = 0;
  for (const ch of value) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current3.trim());
      current3 = "";
    } else {
      current3 += ch;
    }
  }
  if (current3.trim()) parts.push(current3.trim());
  return parts;
}
function extractBezier(timingFunction) {
  const named = NAMED_EASINGS[timingFunction];
  if (named) return named;
  const match = timingFunction.match(
    /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/
  );
  if (match) {
    return [
      parseFloat(match[1]),
      parseFloat(match[2]),
      parseFloat(match[3]),
      parseFloat(match[4])
    ];
  }
  return null;
}
function parseTransitions(getValue) {
  const properties = splitByComma(getValue("transition-property") || "all");
  const durations = splitByComma(getValue("transition-duration") || "0s");
  const timings = splitByComma(getValue("transition-timing-function") || "ease");
  const delays = splitByComma(getValue("transition-delay") || "0s");
  const count = properties.length;
  return properties.map((prop, i) => {
    const timingFunction = timings[i % timings.length] || "ease";
    return {
      property: prop,
      duration: durations[i % durations.length] || "0s",
      timingFunction,
      delay: delays[i % delays.length] || "0s",
      bezier: extractBezier(timingFunction)
    };
  });
}
function serializeTimingFunction(bezier) {
  for (const [name, values] of Object.entries(NAMED_EASINGS)) {
    if (bezier[0] === values[0] && bezier[1] === values[1] && bezier[2] === values[2] && bezier[3] === values[3]) {
      return name;
    }
  }
  return `cubic-bezier(${bezier[0]}, ${bezier[1]}, ${bezier[2]}, ${bezier[3]})`;
}
function serializeLonghand(values) {
  return values.join(", ");
}

