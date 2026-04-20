import type { DomNode } from './convert-tree';

export function findNodeInTree(tree: DomNode | null, id: number): DomNode | null {
    if (!tree) return null;
    if (tree.id === id) return tree;
    for (const child of tree.children) {
        const found = findNodeInTree(child, id);
        if (found) return found;
    }
    return null;
}
