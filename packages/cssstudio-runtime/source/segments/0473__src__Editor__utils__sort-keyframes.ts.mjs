// src/Editor/utils/sort-keyframes.ts
function sortKeyframesByOffset(keyframes2) {
  return Object.values(keyframes2).sort((a, b) => a.offset - b.offset);
}

