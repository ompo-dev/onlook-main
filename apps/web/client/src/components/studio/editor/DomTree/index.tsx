import { forwardRef } from 'react';
import { useStore } from '../state/use-store';
import { TreeNode } from './TreeNode';
import type { DomNode } from '../utils/convert-tree';
import styles from './DomTree.module.css';

interface DropTarget {
    indicatorTop: number;
    indicatorLeft: number;
    indicatorWidth: number;
}

interface DomTreeProps {
    onSelectNode: (id: number) => void;
    onToggleSelectNode?: (id: number) => void;
    onHover: (id: number | null) => void;
    onContextMenu?: (id: number, x: number, y: number) => void;
    onTagChange?: (id: number, tag: string) => void;
    onDragStart?: (id: number, e: React.PointerEvent) => void;
    draggedNodeId: number | null;
    dropTarget: DropTarget | null;
}

function findRootNodes(node: DomNode): DomNode[] {
    if (node.localName === 'body') return node.children;
    if (node.localName === 'html') {
        const body = node.children.find((c) => c.localName === 'body');
        return body ? body.children : node.children;
    }
    for (const child of node.children) {
        const found = findRootNodes(child);
        if (found.length > 0) return found;
    }
    return node.children.length > 0 ? node.children : [node];
}

export const DomTree = forwardRef<HTMLDivElement, DomTreeProps>(function DomTree(
    { onSelectNode, onToggleSelectNode, onHover, onContextMenu, onTagChange, onDragStart, draggedNodeId, dropTarget },
    ref,
) {
    const { domTree } = useStore();

    if (!domTree) {
        return <div className={styles.empty}>Loading DOM...</div>;
    }

    const rootNodes = findRootNodes(domTree);
    if (rootNodes.length === 0) {
        return <div className={styles.empty}>No elements found</div>;
    }

    return (
        <div className={styles.tree} ref={ref} style={{ position: 'relative' }}>
            {rootNodes.map((node) => (
                <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    onSelect={onSelectNode}
                    onToggleSelect={onToggleSelectNode}
                    onHover={onHover}
                    onContextMenu={onContextMenu}
                    onTagChange={onTagChange}
                    onDragStart={onDragStart}
                    draggedNodeId={draggedNodeId}
                />
            ))}
            {dropTarget && (
                <div
                    className={styles.insertionBar}
                    style={{ top: dropTarget.indicatorTop, left: dropTarget.indicatorLeft, width: dropTarget.indicatorWidth }}
                />
            )}
        </div>
    );
});
