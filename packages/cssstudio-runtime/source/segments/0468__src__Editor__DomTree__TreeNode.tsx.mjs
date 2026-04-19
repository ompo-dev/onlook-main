// src/Editor/DomTree/TreeNode.tsx
import { Fragment as Fragment27, jsx as jsx64, jsxs as jsxs49 } from "react/jsx-runtime";
function nodeMatchesFilter(node, filter2) {
  if (!filter2) return true;
  const lc = filter2.toLowerCase();
  const searchable = (node.localName + " " + node.className).toLowerCase();
  if (searchable.includes(lc)) return true;
  return node.children.some((c) => nodeMatchesFilter(c, filter2));
}
var PROTECTED_TAGS3 = /* @__PURE__ */ new Set(["html", "body", "head"]);
function TreeNode({ node, depth, onSelect, onToggleSelect, onHover, onContextMenu, onTagChange, onDragStart, draggedNodeId }) {
  const { selectedNodeId, selectedNodeIds, expandedNodes, toggleNode } = useStore2(
    useShallow((s) => ({
      selectedNodeId: s.selectedNodeId,
      selectedNodeIds: s.selectedNodeIds,
      expandedNodes: s.expandedNodes,
      toggleNode: s.toggleNode
    }))
  );
  const filter2 = useFilter();
  if (TREE_HIDDEN_TAGS.has(node.localName)) return null;
  const isSelected = selectedNodeIds.includes(node.id);
  const isPrimary = selectedNodeId === node.id;
  const matches = nodeMatchesFilter(node, filter2);
  const isDimmed = !!filter2 && !matches;
  const isExpanded = !!filter2 && matches || !!expandedNodes[node.id];
  const visibleChildren = useMemo22(
    () => node.children.filter((c) => !TREE_HIDDEN_TAGS.has(c.localName)),
    [node.children]
  );
  const hasChildren = visibleChildren.length > 0;
  const formattedClassName = useMemo22(
    () => typeof node.className === "string" ? node.className.split(/\s+/).filter(Boolean).join(".") : "",
    [node.className]
  );
  const [editingTag, setEditingTag] = useState28(false);
  const [tagDraft, setTagDraft] = useState28("");
  const tagInputRef = useRef33(null);
  const handleTagDoubleClick = useCallback38(
    (e) => {
      e.stopPropagation();
      if (PROTECTED_TAGS3.has(node.localName)) return;
      setTagDraft(node.localName);
      setEditingTag(true);
    },
    [node.localName]
  );
  const commitTag = useCallback38(() => {
    setEditingTag(false);
    const trimmed = tagDraft.trim().toLowerCase();
    if (trimmed && trimmed !== node.localName) {
      onTagChange?.(node.id, trimmed);
    }
  }, [tagDraft, node.localName, node.id, onTagChange]);
  const handleTagKeyDown = useCallback38(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitTag();
      } else if (e.key === "Escape") {
        setEditingTag(false);
      }
    },
    [commitTag]
  );
  useEffect34(() => {
    if (editingTag && tagInputRef.current) {
      tagInputRef.current.focus();
      tagInputRef.current.select();
    }
  }, [editingTag]);
  const handleClick = useCallback38((e) => {
    if ((e.shiftKey || e.metaKey || e.ctrlKey) && onToggleSelect) {
      onToggleSelect(node.id);
    } else {
      onSelect(node.id);
    }
  }, [node.id, onSelect, onToggleSelect]);
  const handleChevronClick = useCallback38(
    (e) => {
      e.stopPropagation();
      toggleNode(node.id);
    },
    [node.id, toggleNode]
  );
  const handleMouseEnter = useCallback38(() => {
    onHover(node.id);
  }, [node.id, onHover]);
  const handleMouseLeave = useCallback38(() => {
    onHover(null);
  }, [onHover]);
  const handleContextMenu = useCallback38(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(node.id, e.clientX, e.clientY);
    },
    [node.id, onContextMenu]
  );
  const nodeRef = useRef33(null);
  useEffect34(() => {
    if (isPrimary && nodeRef.current) {
      nodeRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isPrimary]);
  const isDragged = draggedNodeId === node.id;
  const canDrag = !PROTECTED_TAGS3.has(node.localName) && !!onDragStart;
  const indent = depth * 16 + 6;
  const handleGripPointerDown = useCallback38(
    (e) => {
      if (canDrag) onDragStart?.(node.id, e);
    },
    [canDrag, node.id, onDragStart]
  );
  return /* @__PURE__ */ jsxs49(Fragment27, { children: [
    /* @__PURE__ */ jsxs49(
      "div",
      {
        ref: nodeRef,
        className: `${DomTree_default.node} ${isSelected ? isPrimary ? DomTree_default.selected : DomTree_default.selectedSecondary : ""} ${isDragged ? DomTree_default.dragging : ""} ${isDimmed ? DomTree_default.dimmed : ""}`,
        style: { paddingLeft: indent },
        "data-node-id": node.id,
        "data-depth": depth,
        "data-tag": node.localName,
        onClick: handleClick,
        onContextMenu: handleContextMenu,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        children: [
          canDrag && /* @__PURE__ */ jsx64("span", { className: DomTree_default.dragHandle, onPointerDown: handleGripPointerDown, children: /* @__PURE__ */ jsxs49("svg", { width: "6", height: "10", viewBox: "0 0 6 10", fill: "currentColor", children: [
            /* @__PURE__ */ jsx64("circle", { cx: "1", cy: "1", r: "1" }),
            /* @__PURE__ */ jsx64("circle", { cx: "5", cy: "1", r: "1" }),
            /* @__PURE__ */ jsx64("circle", { cx: "1", cy: "5", r: "1" }),
            /* @__PURE__ */ jsx64("circle", { cx: "5", cy: "5", r: "1" }),
            /* @__PURE__ */ jsx64("circle", { cx: "1", cy: "9", r: "1" }),
            /* @__PURE__ */ jsx64("circle", { cx: "5", cy: "9", r: "1" })
          ] }) }),
          /* @__PURE__ */ jsx64(
            "span",
            {
              className: `${DomTree_default.chevron} ${hasChildren ? isExpanded ? DomTree_default.expanded : "" : DomTree_default.hidden}`,
              onClick: hasChildren ? handleChevronClick : void 0,
              children: /* @__PURE__ */ jsx64(ChevronIcon, {})
            }
          ),
          editingTag ? /* @__PURE__ */ jsx64(
            "input",
            {
              ref: tagInputRef,
              className: DomTree_default.tagInput,
              value: tagDraft,
              onChange: (e) => setTagDraft(e.target.value),
              onKeyDown: handleTagKeyDown,
              onBlur: commitTag
            }
          ) : /* @__PURE__ */ jsx64("span", { className: DomTree_default.tag, onDoubleClick: handleTagDoubleClick, children: node.localName }),
          formattedClassName && /* @__PURE__ */ jsxs49("span", { className: DomTree_default.className, children: [
            ".",
            formattedClassName
          ] })
        ]
      }
    ),
    isExpanded && node.children.map((child) => /* @__PURE__ */ jsx64(
      TreeNode,
      {
        node: child,
        depth: depth + 1,
        onSelect,
        onToggleSelect,
        onHover,
        onContextMenu,
        onTagChange,
        onDragStart,
        draggedNodeId
      },
      child.id
    ))
  ] });
}

