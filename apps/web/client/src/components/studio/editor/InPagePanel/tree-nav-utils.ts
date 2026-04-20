import type { DomNode } from '../utils/convert-tree';

export const TREE_HIDDEN_TAGS = new Set(['script', 'style', 'link', 'meta', 'title', 'head', 'noscript', 'template', 'base']);

function findTreeStart(node: DomNode): DomNode | null {
    if (node.localName === 'html') return node;
    if (node.localName === 'body') return node;
    for (const child of node.children) {
        const found = findTreeStart(child);
        if (found) return found;
    }
    return node.children[0] ?? null;
}

export function getVisibleNodeIds(tree: DomNode, expandedNodes: Record<number, boolean>): number[] {
    const ids: number[] = [];
    function walk(node: DomNode) {
        if (TREE_HIDDEN_TAGS.has(node.localName)) return;
        ids.push(node.id);
        if (expandedNodes[node.id]) {
            for (const child of node.children) walk(child);
        }
    }
    const start = findTreeStart(tree);
    if (start) walk(start);
    return ids;
}

export function findNodePath(tree: DomNode, targetId: number): DomNode[] | null {
    if (tree.id === targetId) return [tree];
    for (const child of tree.children) {
        const path = findNodePath(child, targetId);
        if (path) return [tree, ...path];
    }
    return null;
}
