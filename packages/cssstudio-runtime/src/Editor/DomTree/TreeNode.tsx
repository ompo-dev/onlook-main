import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/use-store';
import { useShallow } from 'zustand/react/shallow';
import type { DomNode } from '../utils/convert-tree';
import { TREE_HIDDEN_TAGS } from '../InPagePanel/tree-nav-utils';
import styles from './DomTree.module.css';

const PROTECTED_TAGS = new Set(['html', 'body', 'head']);

interface FilterContextType {
    filter: string;
}

let filterContextValue = '';
export function setFilter(v: string) { filterContextValue = v; }
export function useFilter() { return filterContextValue; }

function nodeMatchesFilter(node: DomNode, filter: string): boolean {
    if (!filter) return true;
    const lc = filter.toLowerCase();
    const searchable = (node.localName + ' ' + (node.className ?? '')).toLowerCase();
    if (searchable.includes(lc)) return true;
    return node.children.some((c) => nodeMatchesFilter(c, filter));
}

function ChevronIcon() {
    return (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            <path d="M2 1l4 3-4 3z" />
        </svg>
    );
}

interface DropTarget {
    parentId: number;
    beforeId: number | null;
    indicatorTop: number;
    indicatorLeft: number;
    indicatorWidth: number;
}

interface TreeNodeProps {
    node: DomNode;
    depth: number;
    onSelect: (id: number) => void;
    onToggleSelect?: (id: number) => void;
    onHover: (id: number | null) => void;
    onContextMenu?: (id: number, x: number, y: number) => void;
    onTagChange?: (id: number, tag: string) => void;
    onDragStart?: (id: number, e: React.PointerEvent) => void;
    draggedNodeId: number | null;
}

export function TreeNode({ node, depth, onSelect, onToggleSelect, onHover, onContextMenu, onTagChange, onDragStart, draggedNodeId }: TreeNodeProps) {
    const { selectedNodeId, selectedNodeIds, expandedNodes, toggleNode } = useStore(useShallow((s) => ({
        selectedNodeId: s.selectedNodeId,
        selectedNodeIds: s.selectedNodeIds,
        expandedNodes: s.expandedNodes,
        toggleNode: s.toggleNode,
    })));
    const filter = useFilter();

    if (TREE_HIDDEN_TAGS.has(node.localName)) return null;

    const isSelected = selectedNodeIds.includes(node.id);
    const isPrimary = selectedNodeId === node.id;
    const matches = nodeMatchesFilter(node, filter);
    const isDimmed = !!filter && !matches;
    const isExpanded = (!!filter && matches) || !!expandedNodes[node.id];
    const visibleChildren = useMemo(
        () => node.children.filter((c) => !TREE_HIDDEN_TAGS.has(c.localName)),
        [node.children],
    );
    const hasChildren = visibleChildren.length > 0;
    const formattedClassName = useMemo(
        () => (typeof node.className === 'string' ? node.className.split(/\s+/).filter(Boolean).join('.') : ''),
        [node.className],
    );

    const [editingTag, setEditingTag] = useState(false);
    const [tagDraft, setTagDraft] = useState('');
    const tagInputRef = useRef<HTMLInputElement>(null);
    const nodeRef = useRef<HTMLDivElement>(null);

    const handleTagDoubleClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (PROTECTED_TAGS.has(node.localName)) return;
            setTagDraft(node.localName);
            setEditingTag(true);
        },
        [node.localName],
    );

    const commitTag = useCallback(() => {
        setEditingTag(false);
        const trimmed = tagDraft.trim().toLowerCase();
        if (trimmed && trimmed !== node.localName) onTagChange?.(node.id, trimmed);
    }, [tagDraft, node.localName, node.id, onTagChange]);

    const handleTagKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') { e.preventDefault(); commitTag(); }
            else if (e.key === 'Escape') setEditingTag(false);
        },
        [commitTag],
    );

    useEffect(() => {
        if (editingTag && tagInputRef.current) { tagInputRef.current.focus(); tagInputRef.current.select(); }
    }, [editingTag]);

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            if ((e.shiftKey || e.metaKey || e.ctrlKey) && onToggleSelect) onToggleSelect(node.id);
            else onSelect(node.id);
        },
        [node.id, onSelect, onToggleSelect],
    );

    const handleChevronClick = useCallback(
        (e: React.MouseEvent) => { e.stopPropagation(); toggleNode(node.id); },
        [node.id, toggleNode],
    );

    const handleMouseEnter = useCallback(() => onHover(node.id), [node.id, onHover]);
    const handleMouseLeave = useCallback(() => onHover(null), [onHover]);

    const handleContextMenu = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu?.(node.id, e.clientX, e.clientY);
        },
        [node.id, onContextMenu],
    );

    useEffect(() => {
        if (isPrimary && nodeRef.current) nodeRef.current.scrollIntoView({ block: 'nearest' });
    }, [isPrimary]);

    const isDragged = draggedNodeId === node.id;
    const canDrag = !PROTECTED_TAGS.has(node.localName) && !!onDragStart;
    const indent = depth * 16 + 6;

    const handleGripPointerDown = useCallback(
        (e: React.PointerEvent) => { if (canDrag) onDragStart?.(node.id, e); },
        [canDrag, node.id, onDragStart],
    );

    return (
        <>
            <div
                ref={nodeRef}
                className={`${styles.node} ${isSelected ? (isPrimary ? styles.selected : styles.selectedSecondary) : ''} ${isDragged ? styles.dragging : ''} ${isDimmed ? styles.dimmed : ''}`}
                style={{ paddingLeft: indent }}
                data-node-id={node.id}
                data-depth={depth}
                data-tag={node.localName}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {canDrag && (
                    <span className={styles.dragHandle} onPointerDown={handleGripPointerDown}>
                        <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor">
                            <circle cx="1" cy="1" r="1" />
                            <circle cx="5" cy="1" r="1" />
                            <circle cx="1" cy="5" r="1" />
                            <circle cx="5" cy="5" r="1" />
                            <circle cx="1" cy="9" r="1" />
                            <circle cx="5" cy="9" r="1" />
                        </svg>
                    </span>
                )}
                <span
                    className={`${styles.chevron} ${hasChildren ? (isExpanded ? styles.expanded : '') : styles.hidden}`}
                    onClick={hasChildren ? handleChevronClick : undefined}
                >
                    <ChevronIcon />
                </span>
                {editingTag ? (
                    <input
                        ref={tagInputRef}
                        className={styles.tagInput}
                        value={tagDraft}
                        onChange={(e) => setTagDraft(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        onBlur={commitTag}
                    />
                ) : (
                    <span className={styles.tag} onDoubleClick={handleTagDoubleClick}>{node.localName}</span>
                )}
                {formattedClassName && <span className={styles.className}>.{formattedClassName}</span>}
            </div>
            {isExpanded && node.children.map((child) => (
                <TreeNode
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    onSelect={onSelect}
                    onToggleSelect={onToggleSelect}
                    onHover={onHover}
                    onContextMenu={onContextMenu}
                    onTagChange={onTagChange}
                    onDragStart={onDragStart}
                    draggedNodeId={draggedNodeId}
                />
            ))}
        </>
    );
}
