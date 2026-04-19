// src/Editor/state/use-page-bridge.ts
var AUTO_EXPAND_TAGS = ["html", "body"];
function autoExpandDefaults(tree) {
  const toExpand = [tree.id];
  function walk(node) {
    if (AUTO_EXPAND_TAGS.includes(node.localName)) {
      toExpand.push(node.id);
    }
    for (const child of node.children) {
      walk(child);
    }
  }
  walk(tree);
  if (toExpand.length > 0) {
    useStore2.setState((state2) => {
      const expanded = { ...state2.expandedNodes };
      for (const id3 of toExpand) {
        expanded[id3] = true;
      }
      return { expandedNodes: expanded };
    });
  }
}
function usePageBridge(options) {
  const userEditsRef = useRef({});
  const contextMenuRef = useRef(options?.onContextMenu);
  contextMenuRef.current = options?.onContextMenu;
  const {
    setDomTree,
    setProperties,
    setComputedStyles,
    setParentDisplay,
    setDesignTokens,
    setElementVariables,
    selectNode,
    setSelectedAttributes,
    setSelectedTextContent,
    setPickingElement
  } = useStore2();
  const fetchDomTree2 = useCallback(() => {
    try {
      const raw = fetchDomTree();
      const tree = convertTree(raw);
      setDomTree(tree);
      autoExpandDefaults(tree);
      return tree;
    } catch (e) {
      console.error("[css-studio] Failed to fetch DOM tree:", e);
      return null;
    }
  }, [setDomTree]);
  const fetchStyles2 = useCallback(
    (id3) => {
      try {
        const result = fetchStyles(id3);
        if (!result) return;
        const properties = [];
        const computed = result.computed ?? {};
        const authored = {};
        if (result.matched) {
          for (const rule of result.matched) {
            for (const [name, value] of Object.entries(rule.properties)) {
              authored[name] = value;
              properties.push({
                name,
                value,
                source: "matched",
                selector: rule.selector
              });
            }
          }
        }
        if (result.inline) {
          for (const [name, value] of Object.entries(result.inline)) {
            if (value) {
              authored[name] = value;
              properties.push({ name, value, source: "inline" });
            }
          }
        }
        const display = { ...computed };
        for (const [name, value] of Object.entries(authored)) {
          display[name] = value;
        }
        const AUTO_DEFAULT_PROPS = [
          "width",
          "height",
          "min-width",
          "min-height",
          "top",
          "right",
          "bottom",
          "left"
        ];
        for (const prop of AUTO_DEFAULT_PROPS) {
          if (!authored[prop] && display[prop]) {
            display[prop] = "auto";
          }
        }
        for (const [shorthand, longhands] of SHORTHAND_CONFIGS) {
          synthesizeShorthand(display, shorthand, longhands);
        }
        synthesizeBorderShorthand(display);
        for (const [prop, value] of Object.entries(userEditsRef.current)) {
          if (authored[prop] === value) {
            delete userEditsRef.current[prop];
          } else {
            display[prop] = value;
          }
        }
        setProperties(properties);
        setComputedStyles(display);
        setParentDisplay(result.parentDisplay);
        try {
          setElementVariables(fetchElementVariables(id3));
        } catch {
        }
      } catch (e) {
        console.error("[css-studio] Failed to fetch styles:", e);
      }
    },
    [setProperties, setComputedStyles, setParentDisplay, setElementVariables]
  );
  const fetchTokens = useCallback(() => {
    try {
      const tokens = fetchDesignTokens();
      setDesignTokens(tokens);
    } catch (e) {
      console.error("[css-studio] Failed to fetch design tokens:", e);
    }
  }, [setDesignTokens]);
  const setStyle2 = useCallback(
    (id3, property, value) => {
      userEditsRef.current[property] = value;
      setStyleProperty(id3, property, value);
    },
    []
  );
  const selectedNodeId = useStore2((s) => s.selectedNodeId);
  useEffect(() => {
    if (selectedNodeId === null) {
      deactivateControls();
      return;
    }
    userEditsRef.current = {};
    observeElement(selectedNodeId, () => {
      const nodeId = useStore2.getState().selectedNodeId;
      if (nodeId !== null) {
        fetchStyles2(nodeId);
        fetchDomTree2();
        refreshControls(useStore2.getState().computedStyles, getTheme());
      }
    });
  }, [selectedNodeId, fetchStyles2, fetchDomTree2]);
  useEffect(() => {
    let cancelled = false;
    function handleBodyDirty() {
      const { selectedNodeId: selectedNodeId2 } = useStore2.getState();
      let selectorForReselect = null;
      let staleSelection = false;
      if (selectedNodeId2 !== null && !isElementConnected(selectedNodeId2)) {
        selectorForReselect = buildElementSelector(selectedNodeId2);
        staleSelection = true;
      }
      const tree = fetchDomTree2();
      if (staleSelection) {
        let newId = null;
        if (selectorForReselect) {
          newId = findReplacementElement(selectorForReselect, selectedNodeId2);
        }
        if (newId !== null) {
          const store = useStore2.getState();
          store.selectNode(newId);
          store.expandToNode(newId);
          selectElement(newId);
          observeElement(newId);
          fetchStyles2(newId);
          if (tree) {
            const node = findNodeInTree(tree, newId);
            if (node) {
              store.setSelectedAttributes(node.attributes ?? {});
              store.setSelectedTextContent(node.textContent ?? "");
            }
          }
        } else {
          useStore2.getState().selectNode(null);
          selectElement(null);
        }
      }
      purgeDetachedElements();
    }
    function init() {
      initBridge();
      if (cancelled) return;
      startContextMenuListener((result) => {
        if (contextMenuRef.current) contextMenuRef.current(result);
      });
      fetchDomTree2();
      if (cancelled) return;
      fetchTokens();
      observeBody(handleBodyDirty);
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
    return () => {
      cancelled = true;
      destroyBridge();
    };
  }, [fetchDomTree2, fetchStyles2]);
  return useMemo(() => ({
    fetchDomTree: fetchDomTree2,
    fetchStyles: fetchStyles2,
    fetchDesignTokens: fetchTokens,
    fetchElementVariables,
    setStyleProperty: setStyle2,
    setAttribute,
    removeAttribute,
    setTextContent,
    highlightElement,
    selectElement,
    setDocumentProperty,
    removeDocumentProperty,
    removeElement,
    detachElement,
    getNextSiblingId,
    reinsertElement,
    replaceTag,
    addChildElement,
    findInsertionSibling,
    addSiblingElement,
    duplicateElement,
    moveElement,
    getParentId,
    getSiblingIds,
    getFlexInfo,
    getChildRectsAndIds,
    showReorderLine,
    hideReorderLine,
    showReorderGhost,
    hideReorderGhost,
    startDragTransform,
    updateDragTransform,
    clearDragTransform,
    getAbsolutePositionInfo,
    getElementRect,
    getElementQuad: getElementQuadById,
    startAbsDragTransform,
    clearAbsDragTransform,
    fetchPageMetadata,
    setPageMetadataField
  }), [fetchDomTree2, fetchStyles2, fetchTokens, setStyle2]);
}

