// src/Editor/utils/is-color-value.ts
function isColorValue(v) {
  return classifyTokenValue(v) === "color";
}

