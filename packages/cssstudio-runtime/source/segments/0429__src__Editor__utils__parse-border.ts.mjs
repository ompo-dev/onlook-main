// src/Editor/utils/parse-border.ts
var BORDER_STYLES = [
  "none",
  "solid",
  "dashed",
  "dotted",
  "double",
  "groove",
  "ridge",
  "inset",
  "outset",
  "hidden"
];
var BORDER_STYLE_SET = new Set(BORDER_STYLES);
var DEFAULT_BORDER = {
  width: "1px",
  style: "solid",
  color: "#000000"
};
var WIDTH_KEYWORDS = /* @__PURE__ */ new Set(["thin", "medium", "thick"]);
var LENGTH_PATTERN = /^(-?[\d.]+)(px|em|rem|%|vw|vh|vmin|vmax|cm|mm|in|pt|pc|ch|ex)?$/;
function tokenize(str) {
  const tokens = [];
  let current3 = "";
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "(") {
      depth++;
      current3 += ch;
    } else if (ch === ")") {
      depth = Math.max(0, depth - 1);
      current3 += ch;
    } else if (ch === " " && depth === 0) {
      if (current3) tokens.push(current3);
      current3 = "";
    } else {
      current3 += ch;
    }
  }
  if (current3) tokens.push(current3);
  return tokens;
}
function parseBorder(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "none") {
    return { width: "0px", style: "none", color: DEFAULT_BORDER.color };
  }
  let width = "";
  let style2 = "";
  const colorParts = [];
  const tokens = tokenize(trimmed);
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (!style2 && BORDER_STYLE_SET.has(lower)) {
      style2 = lower;
    } else if (!width && (WIDTH_KEYWORDS.has(lower) || LENGTH_PATTERN.test(token))) {
      width = token;
    } else {
      colorParts.push(token);
    }
  }
  return {
    width: width || DEFAULT_BORDER.width,
    style: style2 || DEFAULT_BORDER.style,
    color: colorParts.join(" ") || DEFAULT_BORDER.color
  };
}
function serializeBorder(parsed) {
  return `${parsed.width} ${parsed.style} ${parsed.color}`;
}

