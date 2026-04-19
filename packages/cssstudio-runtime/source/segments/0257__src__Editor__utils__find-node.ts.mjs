// src/Editor/utils/find-node.ts
function findNodeInTree(tree, id3) {
  if (!tree) return null;
  if (tree.id === id3) return tree;
  for (const child of tree.children) {
    const found = findNodeInTree(child, id3);
    if (found) return found;
  }
  return null;
}

