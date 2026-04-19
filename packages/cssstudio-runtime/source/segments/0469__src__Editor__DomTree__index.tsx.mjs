// src/Editor/DomTree/index.tsx
import { jsx as jsx65, jsxs as jsxs50 } from "react/jsx-runtime";
var DomTree = forwardRef3(function DomTree2({ onSelectNode, onToggleSelectNode, onHover, onContextMenu, onTagChange, onDragStart, draggedNodeId, dropTarget }, ref) {
  const { domTree } = useStore2();
  if (!domTree) {
    return /* @__PURE__ */ jsx65("div", { className: DomTree_default.empty, children: "Loading DOM..." });
  }
  const rootNodes = findRootNodes(domTree);
  if (rootNodes.length === 0) {
    return /* @__PURE__ */ jsx65("div", { className: DomTree_default.empty, children: "No elements found" });
  }
  return /* @__PURE__ */ jsxs50("div", { className: DomTree_default.tree, ref, style: { position: "relative" }, children: [
    rootNodes.map((node) => /* @__PURE__ */ jsx65(
      TreeNode,
      {
        node,
        depth: 0,
        onSelect: onSelectNode,
        onToggleSelect: onToggleSelectNode,
        onHover,
        onContextMenu,
        onTagChange,
        onDragStart,
        draggedNodeId
      },
      node.id
    )),
    dropTarget && /* @__PURE__ */ jsx65(
      "div",
      {
        className: DomTree_default.insertionBar,
        style: {
          top: dropTarget.indicatorTop,
          left: dropTarget.indicatorLeft,
          width: dropTarget.indicatorWidth
        }
      }
    )
  ] });
});
function findRootNodes(node) {
  if (node.localName === "body") return node.children;
  if (node.localName === "html") {
    const body = node.children.find((c) => c.localName === "body");
    return body ? body.children : node.children;
  }
  for (const child of node.children) {
    const found = findRootNodes(child);
    if (found.length > 0) return found;
  }
  return node.children.length > 0 ? node.children : [node];
}

