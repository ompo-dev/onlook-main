// src/Editor/utils/parse-filter.ts
var FILTER_CONFIGS = [
  { name: "blur", displayName: "Blur", min: 0, max: 20, step: 0.1, unit: "px", defaultValue: 0 },
  { name: "brightness", displayName: "Brightness", min: 0, max: 3, step: 0.01, unit: "", defaultValue: 1 },
  { name: "contrast", displayName: "Contrast", min: 0, max: 3, step: 0.01, unit: "", defaultValue: 1 },
  { name: "grayscale", displayName: "Grayscale", min: 0, max: 1, step: 0.01, unit: "", defaultValue: 0 },
  { name: "hue-rotate", displayName: "Hue Rotate", min: 0, max: 360, step: 1, unit: "deg", defaultValue: 0 },
  { name: "invert", displayName: "Invert", min: 0, max: 1, step: 0.01, unit: "", defaultValue: 0 },
  { name: "saturate", displayName: "Saturate", min: 0, max: 3, step: 0.01, unit: "", defaultValue: 1 },
  { name: "sepia", displayName: "Sepia", min: 0, max: 1, step: 0.01, unit: "", defaultValue: 0 }
];
var FILTER_CONFIG_MAP = new Map(FILTER_CONFIGS.map((c) => [c.name, c]));
function parseFilter(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "none") return [];
  const filters = [];
  let i = 0;
  while (i < trimmed.length) {
    while (i < trimmed.length && trimmed[i] === " ") i++;
    if (i >= trimmed.length) break;
    const nameStart = i;
    while (i < trimmed.length && trimmed[i] !== "(" && trimmed[i] !== " ") i++;
    if (i >= trimmed.length || trimmed[i] !== "(") continue;
    const name = trimmed.slice(nameStart, i).trim();
    i++;
    let depth = 1;
    const argsStart = i;
    while (i < trimmed.length && depth > 0) {
      if (trimmed[i] === "(") depth++;
      else if (trimmed[i] === ")") depth--;
      if (depth > 0) i++;
    }
    const args = trimmed.slice(argsStart, i).trim();
    i++;
    const config = FILTER_CONFIG_MAP.get(name);
    if (config) {
      const match = args.match(/^(-?[\d.]+)\s*(.*)$/);
      filters.push({
        name,
        args,
        numericValue: match ? parseFloat(match[1]) : null,
        unit: match ? match[2] || config.unit : config.unit
      });
    } else {
      filters.push({ name, args, numericValue: null, unit: "" });
    }
  }
  return filters;
}
function serializeFilter(filters) {
  if (filters.length === 0) return "";
  return filters.map((f) => `${f.name}(${f.args})`).join(" ");
}
function getFilterConfig(name) {
  return FILTER_CONFIG_MAP.get(name);
}

