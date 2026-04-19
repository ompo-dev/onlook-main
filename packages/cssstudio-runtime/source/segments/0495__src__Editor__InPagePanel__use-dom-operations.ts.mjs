// src/Editor/InPagePanel/use-dom-operations.ts
import { useCallback as useCallback47, useEffect as useEffect44, useRef as useRef42 } from "react";
function useDomOperations({ bridge, contextMenu, setContextMenu }) {
  const {
    selectedNodeId,
    selectedNodeIds,
    selectNode,
    selectNodes,
    toggleNodeSelection,
    removeFromSelection,
    clearSelection,
    expandToNode,
    addPendingAttachment,
    openChat,
    setSelectedAttributes,
    setSelectedTextContent,
    setComputedStyles,
    setElementVariables,
    queueEdit
  } = useStore2();
  const undoPush = useUndoStore((s) => s.push);
  const undoPushDom = useUndoStore((s) => s.pushDom);
  const undoPushBatch = useUndoStore((s) => s.pushBatch);
  const refetchTimerRef = useRef42(null);
  const handlePropertyChangeRef = useRef42(() => {
  });
  const hoverTimerRef = useRef42(null);
  const lastHoveredIdRef = useRef42(null);
  useEffect44(() => {
    if (selectedNodeId === null || selectedNodeIds.length > 1) {
      deactivateControls();
      return;
    }
    const el = getElement(selectedNodeId);
    if (!el) return;
    const cs = useStore2.getState().computedStyles;
    activateControls(el, cs, getTheme(), (prop, val) => {
      handlePropertyChangeRef.current(prop, val);
    });
  }, [selectedNodeId, selectedNodeIds.length]);
  const animTimeline = useStore2((s) => s.animTimeline);
  const timelineOpen = useStore2((s) => s.panels.timeline.open);
  const selectedKeyframesName = useStore2((s) => s.selectedKeyframesName);
  useEffect44(() => {
    if (selectedNodeId === null) return;
    const cs = useStore2.getState().computedStyles;
    refreshControls(cs, getTheme());
  }, [animTimeline, timelineOpen, selectedKeyframesName, selectedNodeId]);
  const handleSelectNode = useCallback47(
    (nodeId) => {
      selectNode(nodeId);
      expandToNode(nodeId);
      selectElements([nodeId], nodeId);
      bridge.fetchStyles(nodeId);
      const state2 = useStore2.getState();
      const node = findNodeInTree(state2.domTree, nodeId);
      if (node) {
        setSelectedAttributes(node.attributes ?? {});
        setSelectedTextContent(node.textContent ?? "");
      }
    },
    [selectNode, expandToNode, bridge, setSelectedAttributes, setSelectedTextContent]
  );
  const handleToggleSelectNode = useCallback47(
    (nodeId) => {
      toggleNodeSelection(nodeId);
      expandToNode(nodeId);
      const state2 = useStore2.getState();
      const ids = state2.selectedNodeIds;
      const primaryId = state2.selectedNodeId;
      selectElements(ids, primaryId);
      if (primaryId !== null) {
        bridge.fetchStyles(primaryId);
        const node = findNodeInTree(state2.domTree, primaryId);
        if (node) {
          setSelectedAttributes(node.attributes ?? {});
          setSelectedTextContent(node.textContent ?? "");
        }
      }
    },
    [toggleNodeSelection, expandToNode, bridge, setSelectedAttributes, setSelectedTextContent]
  );
  const handleSelectNodes = useCallback47(
    (nodeIds) => {
      selectNodes(nodeIds);
      for (const id3 of nodeIds) expandToNode(id3);
      const state2 = useStore2.getState();
      const ids = state2.selectedNodeIds;
      const primaryId = state2.selectedNodeId;
      selectElements(ids, primaryId);
      if (primaryId !== null) {
        bridge.fetchStyles(primaryId);
        const node = findNodeInTree(state2.domTree, primaryId);
        if (node) {
          setSelectedAttributes(node.attributes ?? {});
          setSelectedTextContent(node.textContent ?? "");
        }
      }
    },
    [selectNodes, expandToNode, bridge, setSelectedAttributes, setSelectedTextContent]
  );
  const handleInlineTextEdit = useCallback47(
    (id3, oldText, newText) => {
      undoPush({ type: "text", nodeId: id3, property: "textContent", oldValue: oldText, newValue: newText });
      setSelectedTextContent(newText);
      queueEdit({ type: "text", ...getElementInfoById(id3), value: `${oldText} \u2192 ${newText}` });
    },
    [undoPush, setSelectedTextContent, queueEdit]
  );
  const handlePromptIconClick = useCallback47(
    (nodeId) => {
      const info = getElementInfoById(nodeId);
      const label = info.element;
      addPendingAttachment({ nodeId, label });
      openChat();
    },
    [addPendingAttachment, openChat]
  );
  const handlePropertyChange = useCallback47(
    (property, value) => {
      if (selectedNodeId === null) return;
      const state2 = useStore2.getState();
      const ids = state2.selectedNodeIds;
      const oldValue = state2.computedStyles[property] ?? "";
      if (value === oldValue && ids.length <= 1) return;
      if (ids.length > 1) {
        const ops = [];
        for (const id3 of ids) {
          bridge.setStyleProperty(id3, property, value);
          const info = getElementInfoById(id3);
          ops.push({ type: "style", nodeId: id3, property, oldValue, newValue: value });
          queueEdit({ type: "style", ...info, name: property, value: `${oldValue} \u2192 ${value}` });
        }
        undoPushBatch(ops);
      } else {
        undoPush({ type: "style", nodeId: selectedNodeId, property, oldValue, newValue: value });
        bridge.setStyleProperty(selectedNodeId, property, value);
        queueEdit({ type: "style", ...getElementInfo(), name: property, value: `${oldValue} \u2192 ${value}` });
      }
      const updated = { ...state2.computedStyles };
      updated[property] = value;
      setComputedStyles(updated);
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      refetchTimerRef.current = setTimeout(() => {
        const nodeId = useStore2.getState().selectedNodeId;
        if (nodeId !== null) bridge.fetchStyles(nodeId);
      }, 800);
    },
    [selectedNodeId, bridge, setComputedStyles, queueEdit, undoPush, undoPushBatch]
  );
  handlePropertyChangeRef.current = handlePropertyChange;
  const handleAttributeChange = useCallback47(
    (name, value) => {
      if (selectedNodeId === null) return;
      const oldValue = useStore2.getState().selectedAttributes[name] ?? "";
      if (value === oldValue) return;
      undoPush({ type: "attribute", nodeId: selectedNodeId, property: name, oldValue, newValue: value });
      bridge.setAttribute(selectedNodeId, name, value);
      const attrs = { ...useStore2.getState().selectedAttributes };
      attrs[name] = value;
      setSelectedAttributes(attrs);
      queueEdit({ type: "attr", ...getElementInfo(), name, value: `${oldValue} \u2192 ${value}` });
    },
    [selectedNodeId, bridge, setSelectedAttributes, queueEdit, undoPush]
  );
  const handleAttributeDelete = useCallback47(
    (name) => {
      if (selectedNodeId === null) return;
      const oldValue = useStore2.getState().selectedAttributes[name] ?? "";
      undoPush({ type: "attribute-delete", nodeId: selectedNodeId, property: name, oldValue, newValue: "" });
      bridge.removeAttribute(selectedNodeId, name);
      const attrs = { ...useStore2.getState().selectedAttributes };
      delete attrs[name];
      setSelectedAttributes(attrs);
      queueEdit({ type: "attr-delete", ...getElementInfo(), name });
    },
    [selectedNodeId, bridge, setSelectedAttributes, queueEdit, undoPush]
  );
  const handleAttributeRename = useCallback47(
    (oldName, newName) => {
      if (selectedNodeId === null) return;
      const value = useStore2.getState().selectedAttributes[oldName] ?? "";
      bridge.setAttribute(selectedNodeId, newName, value);
      bridge.removeAttribute(selectedNodeId, oldName);
      const attrs = { ...useStore2.getState().selectedAttributes };
      delete attrs[oldName];
      attrs[newName] = value;
      setSelectedAttributes(attrs);
      queueEdit({ type: "attr-rename", ...getElementInfo(), name: oldName, value: newName });
    },
    [selectedNodeId, bridge, setSelectedAttributes, queueEdit]
  );
  const handleTextChange = useCallback47(
    (text) => {
      if (selectedNodeId === null) return;
      const oldText = useStore2.getState().selectedTextContent;
      if (text === oldText) return;
      undoPush({ type: "text", nodeId: selectedNodeId, property: "textContent", oldValue: oldText, newValue: text });
      bridge.setTextContent(selectedNodeId, text);
      setSelectedTextContent(text);
      queueEdit({ type: "text", ...getElementInfo(), value: `${oldText} \u2192 ${text}` });
    },
    [selectedNodeId, bridge, setSelectedTextContent, queueEdit, undoPush]
  );
  const handleTokenChange = useCallback47(
    (name, value) => {
      const oldValue = useStore2.getState().designTokens.find((t) => t.name === name)?.value ?? "";
      if (value === oldValue) return;
      undoPush({ type: "token", nodeId: null, property: name, oldValue, newValue: value });
      bridge.setDocumentProperty(`--${name}`, value);
      bridge.fetchDesignTokens();
      queueEdit({ type: "token", name, value: `${oldValue} \u2192 ${value}` });
    },
    [bridge, queueEdit, undoPush]
  );
  const handleTokenRename = useCallback47(
    (oldName, newName) => {
      const token = useStore2.getState().designTokens.find((t) => t.name === oldName);
      if (!token) return;
      bridge.setDocumentProperty(`--${newName}`, token.value);
      bridge.removeDocumentProperty(`--${oldName}`);
      bridge.fetchDesignTokens();
      queueEdit({ type: "token-rename", name: oldName, value: newName });
    },
    [bridge, queueEdit]
  );
  const handleElementVariableChange = useCallback47(
    (name, value, originNodeId) => {
      const oldValue = useStore2.getState().elementVariables.find((v) => v.name === name)?.value ?? "";
      if (value === oldValue) return;
      if (originNodeId !== null) {
        undoPush({ type: "style", nodeId: originNodeId, property: `--${name}`, oldValue, newValue: value });
        bridge.setStyleProperty(originNodeId, `--${name}`, value);
      } else {
        undoPush({ type: "token", nodeId: null, property: name, oldValue, newValue: value });
        bridge.setDocumentProperty(`--${name}`, value);
      }
      queueEdit({ type: "token", name, value: `${oldValue} \u2192 ${value}` });
      if (selectedNodeId !== null) {
        setElementVariables(bridge.fetchElementVariables(selectedNodeId));
      }
      bridge.fetchDesignTokens();
    },
    [selectedNodeId, bridge, queueEdit, undoPush, setElementVariables]
  );
  const handleNewElementVariable = useCallback47(
    (name, value) => {
      if (selectedNodeId === null) return;
      undoPush({ type: "style", nodeId: selectedNodeId, property: `--${name}`, oldValue: "", newValue: value });
      bridge.setStyleProperty(selectedNodeId, `--${name}`, value);
      queueEdit({ type: "style", ...getElementInfo(), name: `--${name}`, value: `\u2192 ${value}` });
      setElementVariables(bridge.fetchElementVariables(selectedNodeId));
    },
    [selectedNodeId, bridge, queueEdit, undoPush, setElementVariables]
  );
  const handleHoverNode = useCallback47(
    (id3) => {
      if (id3 === lastHoveredIdRef.current) return;
      lastHoveredIdRef.current = id3;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        bridge.highlightElement(id3);
      }, 50);
    },
    [bridge]
  );
  const handleTreeContextMenu = useCallback47(
    (nodeId, x, y) => {
      const state2 = useStore2.getState();
      const node = findNodeInTree(state2.domTree, nodeId);
      if (!node || PROTECTED_TAGS4.has(node.localName)) return;
      setContextMenu({ nodeId, x, y });
    },
    [setContextMenu]
  );
  const handleTagChange = useCallback47(
    (nodeId, newTag) => {
      const node = findNodeInTree(useStore2.getState().domTree, nodeId);
      if (!node) return;
      const oldTag = node.localName;
      const info = getElementInfoById(nodeId);
      const newId = bridge.replaceTag(nodeId, newTag);
      if (newId === null) return;
      bridge.fetchDomTree();
      selectNode(newId);
      expandToNode(newId);
      bridge.selectElement(newId);
      bridge.fetchStyles(newId);
      queueEdit({ type: "tag", ...info, value: `${oldTag} \u2192 ${newTag}` });
    },
    [bridge, selectNode, expandToNode, queueEdit]
  );
  const deleteElement = useCallback47((nodeId) => {
    const node = findNodeInTree(useStore2.getState().domTree, nodeId);
    if (!node || PROTECTED_TAGS4.has(node.localName)) return;
    const info = getElementInfoById(nodeId);
    const parentId = bridge.getParentId(nodeId);
    const beforeSiblingId = bridge.getNextSiblingId(nodeId);
    const el = getElement(nodeId);
    const removed = bridge.removeElement(nodeId);
    if (!removed) return;
    if (el && parentId !== null) {
      undoPushDom({
        type: "dom",
        action: "delete",
        element: el,
        parentId,
        beforeSiblingId,
        nodeId
      });
    }
    const state2 = useStore2.getState();
    if (state2.selectedNodeIds.length > 1) {
      removeFromSelection(nodeId);
      selectElements(useStore2.getState().selectedNodeIds, useStore2.getState().selectedNodeId);
    } else if (state2.selectedNodeId === nodeId) {
      clearSelection();
      selectElements([], null);
    }
    bridge.fetchDomTree();
    queueEdit({ type: "delete", ...info });
  }, [bridge, removeFromSelection, clearSelection, undoPushDom, queueEdit]);
  const handleDeleteElement = useCallback47(() => {
    if (!contextMenu) return;
    const ids = useStore2.getState().selectedNodeIds;
    if (ids.length > 1) {
      const toDelete = [...ids].reverse();
      for (const id3 of toDelete) deleteElement(id3);
    } else {
      deleteElement(contextMenu.nodeId);
    }
  }, [contextMenu, deleteElement]);
  const handleAddChild = useCallback47(() => {
    if (!contextMenu) return;
    const { nodeId } = contextMenu;
    const info = getElementInfoById(nodeId);
    const newId = bridge.addChildElement(nodeId, "div");
    if (newId === null) return;
    const el = getElement(newId);
    if (el) {
      undoPushDom({
        type: "dom",
        action: "add",
        element: el,
        parentId: nodeId,
        beforeSiblingId: bridge.getNextSiblingId(newId),
        nodeId: newId
      });
    }
    bridge.fetchDomTree();
    expandToNode(nodeId);
    selectNode(newId);
    expandToNode(newId);
    bridge.selectElement(newId);
    bridge.fetchStyles(newId);
    scrollElementIntoView(newId);
    queueEdit({ type: "add-child", ...info, value: "div" });
  }, [contextMenu, bridge, expandToNode, selectNode, undoPushDom, queueEdit]);
  const handleAddSibling = useCallback47(() => {
    if (!contextMenu) return;
    const { nodeId } = contextMenu;
    const info = getElementInfoById(nodeId);
    const newId = bridge.addSiblingElement(nodeId, "div");
    if (newId === null) return;
    const parentId = bridge.getParentId(newId);
    const el = getElement(newId);
    if (el && parentId !== null) {
      undoPushDom({
        type: "dom",
        action: "add",
        element: el,
        parentId,
        beforeSiblingId: bridge.getNextSiblingId(newId),
        nodeId: newId
      });
    }
    bridge.fetchDomTree();
    selectNode(newId);
    expandToNode(newId);
    bridge.selectElement(newId);
    bridge.fetchStyles(newId);
    scrollElementIntoView(newId);
    queueEdit({ type: "add-sibling", ...info, value: "div" });
  }, [contextMenu, bridge, selectNode, expandToNode, undoPushDom, queueEdit]);
  const duplicateElement2 = useCallback47((nodeId) => {
    const node = findNodeInTree(useStore2.getState().domTree, nodeId);
    if (!node || PROTECTED_TAGS4.has(node.localName)) return;
    const info = getElementInfoById(nodeId);
    const newId = bridge.duplicateElement(nodeId);
    if (newId === null) return;
    const parentId = bridge.getParentId(newId);
    const el = getElement(newId);
    if (el && parentId !== null) {
      undoPushDom({
        type: "dom",
        action: "add",
        element: el,
        parentId,
        beforeSiblingId: bridge.getNextSiblingId(newId),
        nodeId: newId
      });
    }
    bridge.fetchDomTree();
    selectNode(newId);
    expandToNode(newId);
    bridge.selectElement(newId);
    bridge.fetchStyles(newId);
    scrollElementIntoView(newId);
    queueEdit({ type: "duplicate", ...info });
  }, [bridge, selectNode, expandToNode, undoPushDom, queueEdit]);
  const handleDuplicateElement = useCallback47(() => {
    if (!contextMenu) return;
    const ids = useStore2.getState().selectedNodeIds;
    if (ids.length > 1) {
      for (const id3 of ids) duplicateElement2(id3);
    } else {
      duplicateElement2(contextMenu.nodeId);
    }
  }, [contextMenu, duplicateElement2]);
  const handleReorder = useCallback47(
    (movedId, newParentId, beforeSiblingId) => {
      bridge.moveElement(movedId, newParentId, beforeSiblingId);
      bridge.fetchDomTree();
      selectNode(movedId);
      expandToNode(movedId);
      bridge.selectElement(movedId);
      bridge.fetchStyles(movedId);
      const movedInfo = getElementInfoById(movedId);
      const tree = useStore2.getState().domTree;
      const beforeNode = beforeSiblingId && tree ? findNodeInTree(tree, beforeSiblingId) : null;
      const description = beforeNode ? `moved before ${buildSelector(beforeNode)}` : "moved to end of parent";
      queueEdit({ type: "reorder", ...movedInfo, value: description });
    },
    [bridge, selectNode, expandToNode, queueEdit]
  );
  const handleDrawElement = useCallback47(
    (parentId, rect) => {
      const info = getElementInfoById(parentId);
      const beforeId = bridge.findInsertionSibling(parentId, rect);
      const newId = bridge.addChildElement(parentId, "div", beforeId);
      if (newId === null) return;
      bridge.setStyleProperty(newId, "width", rect.w + "px");
      bridge.setStyleProperty(newId, "height", rect.h + "px");
      const el = getElement(newId);
      if (el) {
        undoPushDom({
          type: "dom",
          action: "add",
          element: el,
          parentId,
          beforeSiblingId: bridge.getNextSiblingId(newId),
          nodeId: newId
        });
      }
      bridge.fetchDomTree();
      expandToNode(parentId);
      selectNode(newId);
      expandToNode(newId);
      bridge.selectElement(newId);
      bridge.fetchStyles(newId);
      scrollElementIntoView(newId);
      queueEdit({ type: "add-child", ...info, value: `div (${rect.w}\xD7${rect.h})` });
    },
    [bridge, expandToNode, selectNode, undoPushDom, queueEdit]
  );
  const handleAbsPositionChange = useCallback47(
    (nodeId, changes) => {
      for (const { property, oldValue, newValue } of changes) {
        undoPush({ type: "style", nodeId, property, oldValue, newValue });
      }
      const updated = { ...useStore2.getState().computedStyles };
      for (const { property, newValue } of changes) {
        updated[property] = newValue;
      }
      setComputedStyles(updated);
      bridge.fetchStyles(nodeId);
      for (const { property, oldValue, newValue } of changes) {
        queueEdit({ type: "style", ...getElementInfo(), name: property, value: `${oldValue} \u2192 ${newValue}` });
      }
    },
    [undoPush, setComputedStyles, bridge, queueEdit]
  );
  const handleMetadataChange = useCallback47(
    (field, value) => {
      bridge.setPageMetadataField(field, value);
      queueEdit({ type: "metadata", name: field, value });
    },
    [bridge, queueEdit]
  );
  return {
    handleSelectNode,
    handleSelectNodes,
    handleToggleSelectNode,
    handleInlineTextEdit,
    handlePromptIconClick,
    handlePropertyChange,
    handleAttributeChange,
    handleAttributeDelete,
    handleAttributeRename,
    handleTextChange,
    handleTokenChange,
    handleTokenRename,
    handleElementVariableChange,
    handleNewElementVariable,
    handleHoverNode,
    handleTreeContextMenu,
    handleTagChange,
    deleteElement,
    handleDeleteElement,
    handleAddChild,
    handleAddSibling,
    duplicateElement: duplicateElement2,
    handleDuplicateElement,
    handleDrawElement,
    handleReorder,
    handleAbsPositionChange,
    handleMetadataChange
  };
}

