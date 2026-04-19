// src/Editor/InPagePanel/tree-nav-utils.ts
var TREE_HIDDEN_TAGS = /* @__PURE__ */ new Set(["script", "style", "link", "meta", "title", "head", "noscript", "template", "base"]);
function findTreeStart(node) {
  if (node.localName === "html") return node;
  if (node.localName === "body") return node;
  for (const child of node.children) {
    const found = findTreeStart(child);
    if (found) return found;
  }
  return node.children[0] ?? null;
}
function getVisibleNodeIds(tree, expandedNodes) {
  const ids = [];
  function walk(node) {
    if (TREE_HIDDEN_TAGS.has(node.localName)) return;
    ids.push(node.id);
    if (expandedNodes[node.id]) {
      for (const child of node.children) walk(child);
    }
  }
  const start2 = findTreeStart(tree);
  if (start2) walk(start2);
  return ids;
}

