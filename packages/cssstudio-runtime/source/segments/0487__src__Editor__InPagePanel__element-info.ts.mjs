// src/Editor/InPagePanel/element-info.ts
var PROTECTED_TAGS4 = /* @__PURE__ */ new Set(["html", "body", "head"]);
function buildSelector(node) {
  const tag = node.localName;
  const attrs = node.attributes ?? {};
  if (attrs.id) return `${tag}#${attrs.id}`;
  if (attrs["data-testid"]) return `${tag}[data-testid="${attrs["data-testid"]}"]`;
  if (attrs["data-id"]) return `${tag}[data-id="${attrs["data-id"]}"]`;
  const classes = node.className ? (typeof node.className === "string" ? node.className : "").split(/\s+/).filter(Boolean).map((c) => `.${c}`).join("") : "";
  return `${tag}${classes}`;
}
function findAncestorChain(tree, targetId) {
  if (tree.id === targetId) return [tree];
  for (const child of tree.children) {
    const chain = findAncestorChain(child, targetId);
    if (chain) return [tree, ...chain];
  }
  return null;
}
function nthOfType(parent, node) {
  const sameTag = parent.children.filter((c) => c.localName === node.localName);
  if (sameTag.length <= 1) return "";
  const idx = sameTag.indexOf(node) + 1;
  return `:nth-of-type(${idx})`;
}
function getElementInfoById(nodeId) {
  const state2 = useStore2.getState();
  if (!state2.domTree) return { element: "[unknown]" };
  const chain = findAncestorChain(state2.domTree, nodeId);
  if (!chain || chain.length === 0) return { element: "[unknown]" };
  const target = chain[chain.length - 1];
  const parent = chain.length >= 2 ? chain[chain.length - 2] : null;
  let element = buildSelector(target);
  if (parent) element += nthOfType(parent, target);
  const filtered = chain.slice(0, -1).map((node, i) => ({ node, parent: i > 0 ? chain[i - 1] : null })).filter(({ node }) => node.localName !== "html" && node.localName !== "body").slice(-3);
  const ancestors = filtered.map(({ node, parent: p }) => {
    let sel = buildSelector(node);
    if (p) sel += nthOfType(p, node);
    return sel;
  });
  return {
    element,
    path: ancestors.length > 0 ? ancestors.join(" > ") : void 0,
    component: target.component,
    source: target.source
  };
}
function getElementInfo() {
  const state2 = useStore2.getState();
  if (!state2.selectedNodeId) return { element: "[unknown]" };
  return getElementInfoById(state2.selectedNodeId);
}

