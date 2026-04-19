// src/Editor/utils/convert-tree.ts
function convertTree(node) {
  return {
    id: node.id,
    localName: node.localName,
    className: typeof node.className === "string" ? node.className : "",
    attributes: node.attributes ?? {},
    children: (node.children ?? []).map(convertTree),
    textContent: node.textContent ?? "",
    component: node.component,
    source: node.source
  };
}

