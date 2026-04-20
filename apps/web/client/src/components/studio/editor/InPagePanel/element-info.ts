import { useStore } from '../state/use-store';
import { findNodeInTree } from '../utils/find-node';
import type { DomNode } from '../utils/convert-tree';

export const PROTECTED_TAGS4 = new Set(['html', 'body', 'head']);

function buildSelector(node: DomNode): string {
    const tag = node.localName;
    const attrs = node.attributes ?? {};
    if (attrs.id) return `${tag}#${attrs.id}`;
    if (attrs['data-testid']) return `${tag}[data-testid="${attrs['data-testid']}"]`;
    if (attrs['data-id']) return `${tag}[data-id="${attrs['data-id']}"]`;
    const classes = node.className
        ? (typeof node.className === 'string' ? node.className : '')
            .split(/\s+/)
            .filter(Boolean)
            .map((c) => `.${c}`)
            .join('')
        : '';
    return `${tag}${classes}`;
}

function findAncestorChain(tree: DomNode, targetId: number): DomNode[] | null {
    if (tree.id === targetId) return [tree];
    for (const child of tree.children) {
        const chain = findAncestorChain(child, targetId);
        if (chain) return [tree, ...chain];
    }
    return null;
}

function nthOfType(parent: DomNode, node: DomNode): string {
    const sameTag = parent.children.filter((c) => c.localName === node.localName);
    if (sameTag.length <= 1) return '';
    const idx = sameTag.indexOf(node) + 1;
    return `:nth-of-type(${idx})`;
}

export interface ElementInfo {
    element: string;
    path?: string;
    component?: string;
    source?: string;
}

export function getElementInfoById(nodeId: number): ElementInfo {
    const state = useStore.getState();
    if (!state.domTree) return { element: '[unknown]' };
    const chain = findAncestorChain(state.domTree, nodeId);
    if (!chain || chain.length === 0) return { element: '[unknown]' };
    const target = chain[chain.length - 1];
    const parent = chain.length >= 2 ? chain[chain.length - 2] : null;
    let element = buildSelector(target);
    if (parent) element += nthOfType(parent, target);
    const filtered = chain
        .slice(0, -1)
        .map((node, i) => ({ node, parent: i > 0 ? chain[i - 1] : null }))
        .filter(({ node }) => node.localName !== 'html' && node.localName !== 'body')
        .slice(-3);
    const ancestors = filtered.map(({ node, parent: p }) => {
        let sel = buildSelector(node);
        if (p) sel += nthOfType(p, node);
        return sel;
    });
    return {
        element,
        path: ancestors.length > 0 ? ancestors.join(' > ') : undefined,
        component: target.component,
        source: target.source,
    };
}

export function getElementInfo(): ElementInfo {
    const state = useStore.getState();
    if (!state.selectedNodeId) return { element: '[unknown]' };
    return getElementInfoById(state.selectedNodeId);
}
