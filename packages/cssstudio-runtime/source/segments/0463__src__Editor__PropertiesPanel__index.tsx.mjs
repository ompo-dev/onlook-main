// src/Editor/PropertiesPanel/index.tsx
import { Fragment as Fragment26, jsx as jsx63, jsxs as jsxs48 } from "react/jsx-runtime";
var PROTECTED_TAGS2 = /* @__PURE__ */ new Set(["html", "body", "head"]);
var VOID_ELEMENTS = /* @__PURE__ */ new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var SVG_ELEMENTS = /* @__PURE__ */ new Set([
  "svg",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "path",
  "text",
  "tspan",
  "g",
  "use",
  "image",
  "symbol",
  "defs",
  "clipPath",
  "mask",
  "pattern",
  "marker",
  "foreignObject"
]);
var CONTAINER_ONLY = /* @__PURE__ */ new Set([
  "html",
  "head",
  "body",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "ul",
  "ol",
  "dl",
  "select",
  "optgroup",
  "picture",
  "colgroup",
  "map",
  "video",
  "audio",
  "iframe",
  "object",
  "script",
  "style",
  "noscript",
  "template",
  "svg"
]);
var PropertiesPanel = forwardRef2(function PropertiesPanel2(props, ref) {
  const {
    onPropertyChange,
    onAttributeChange,
    onAttributeDelete,
    onAttributeRename,
    onElementVariableChange,
    onNewElementVariable,
    onTagChange
  } = props;
  const store = useStore2(useShallow((s) => ({
    selectedNodeId: s.selectedNodeId,
    selectedNodeIds: s.selectedNodeIds,
    computedStyles: s.computedStyles,
    parentDisplay: s.parentDisplay,
    selectedAttributes: s.selectedAttributes,
    domTree: s.domTree,
    properties: s.properties,
    elementVariables: s.elementVariables,
    activeEditTab: s.panels.inspector.activeTab
  })));
  const selectedNodeId = props.selectedNodeId !== void 0 ? props.selectedNodeId : store.selectedNodeId;
  const computedStyles = props.computedStyles ?? store.computedStyles;
  const selectedAttributes = props.selectedAttributes ?? store.selectedAttributes;
  const domTree = props.domTree !== void 0 ? props.domTree : store.domTree;
  const getValue = useCallback37((prop) => computedStyles[prop] ?? "", [computedStyles]);
  const handleElementVariableChange = useCallback37((name, value) => {
    const v = store.elementVariables.find((ev) => ev.name === name);
    onElementVariableChange?.(name, value, v?.originNodeId ?? null);
  }, [store.elementVariables, onElementVariableChange]);
  const explicitPropertyNames = useMemo21(
    () => new Set(store.properties.map((p) => p.name)),
    [store.properties]
  );
  const [filter2, setFilter] = useState27("");
  const [filterOpen, setFilterOpen] = useState27(false);
  const filterRef = useRef32(null);
  useImperativeHandle(ref, () => ({
    toggleFilter: () => setFilterOpen((v) => !v)
  }), []);
  const isMultiSelect = store.selectedNodeIds.length > 1;
  const activeTab = store.activeEditTab;
  const effectiveTab = isMultiSelect && activeTab !== "design" ? "design" : activeTab;
  const panelRef = useRef32(null);
  const scrollByTabRef = useRef32({ design: 0, motion: 0, variables: 0, html: 0 });
  const prevTabRef = useRef32(effectiveTab);
  const effectiveTabRef = useRef32(effectiveTab);
  const filterOpenRef = useRef32(filterOpen);
  const filterValueRef = useRef32(filter2);
  effectiveTabRef.current = effectiveTab;
  filterOpenRef.current = filterOpen;
  filterValueRef.current = filter2;
  const getScrollEl = useCallback37(() => {
    const el = panelRef.current;
    if (!el) return null;
    return el.closest("[data-cs-panel]") ?? el;
  }, []);
  useLayoutEffect4(() => {
    const el = getScrollEl();
    if (!el) return;
    if (prevTabRef.current !== effectiveTab) {
      scrollByTabRef.current[prevTabRef.current] = el.scrollTop;
      el.scrollTop = scrollByTabRef.current[effectiveTab] ?? 0;
      prevTabRef.current = effectiveTab;
    }
  }, [effectiveTab, getScrollEl]);
  useEffect33(() => {
    const el = getScrollEl();
    if (!el) return;
    const onScroll = () => {
      scrollByTabRef.current[effectiveTabRef.current] = el.scrollTop;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [getScrollEl]);
  useEffect33(() => {
    setFilter("");
    setFilterOpen(false);
    scrollByTabRef.current = { design: 0, motion: 0, variables: 0, html: 0 };
    const el = getScrollEl();
    if (el) el.scrollTop = 0;
  }, [selectedNodeId, getScrollEl]);
  useEffect33(() => {
    if (filterOpen) filterRef.current?.focus();
  }, [filterOpen]);
  useEffect33(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        const panelEl = getScrollEl();
        if (!panelEl) return;
        const active = document.activeElement;
        if (active && panelEl.contains(active)) {
          e.preventDefault();
          setFilterOpen(true);
        }
      }
      if (e.key === "Escape" && filterOpenRef.current && filterValueRef.current === "") {
        setFilterOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [getScrollEl]);
  if (selectedNodeId === null) {
    return /* @__PURE__ */ jsx63("div", { className: PropertiesPanel_default.empty, children: "Select an element to edit its properties" });
  }
  const selectedTag = findNodeInTree(domTree, selectedNodeId)?.localName ?? "";
  const showSvg = !isMultiSelect && SVG_ELEMENTS.has(selectedTag);
  const showText = !isMultiSelect && selectedTag !== "" && !VOID_ELEMENTS.has(selectedTag) && !CONTAINER_ONLY.has(selectedTag);
  return /* @__PURE__ */ jsx63(FilterContext.Provider, { value: filter2, children: /* @__PURE__ */ jsxs48("div", { ref: panelRef, className: PropertiesPanel_default.panel, children: [
    filterOpen && /* @__PURE__ */ jsxs48("div", { className: PropertiesPanel_default.filterBar, children: [
      /* @__PURE__ */ jsx63(SearchIcon, { size: 12, className: PropertiesPanel_default.filterIcon }),
      /* @__PURE__ */ jsx63(
        "input",
        {
          ref: filterRef,
          type: "text",
          className: PropertiesPanel_default.filterInput,
          placeholder: "Filter properties...",
          value: filter2,
          onChange: (e) => setFilter(e.target.value),
          onBlur: () => {
            if (!filter2) setFilterOpen(false);
          }
        }
      ),
      filter2 && /* @__PURE__ */ jsx63(
        "button",
        {
          className: PropertiesPanel_default.filterClear,
          onClick: () => {
            setFilter("");
            filterRef.current?.focus();
          },
          title: "Clear filter",
          children: /* @__PURE__ */ jsxs48("svg", { width: "10", height: "10", viewBox: "0 0 10 10", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", children: [
            /* @__PURE__ */ jsx63("line", { x1: "2", y1: "2", x2: "8", y2: "8" }),
            /* @__PURE__ */ jsx63("line", { x1: "8", y1: "2", x2: "2", y2: "8" })
          ] })
        }
      )
    ] }),
    isMultiSelect && /* @__PURE__ */ jsxs48("div", { className: PropertiesPanel_default.multiSelectBar, children: [
      store.selectedNodeIds.length,
      " elements selected"
    ] }),
    effectiveTab === "design" && /* @__PURE__ */ jsxs48(Fragment26, { children: [
      /* @__PURE__ */ jsx63(
        LayoutSection,
        {
          getValue,
          onChange: onPropertyChange,
          parentDisplay: store.parentDisplay
        }
      ),
      /* @__PURE__ */ jsx63(
        StylesSection,
        {
          getValue,
          onChange: onPropertyChange
        }
      ),
      /* @__PURE__ */ jsx63(
        TransformSection,
        {
          getValue,
          onChange: onPropertyChange,
          explicitPropertyNames
        }
      ),
      showSvg && /* @__PURE__ */ jsx63(
        SvgSection,
        {
          getValue,
          onChange: onPropertyChange
        }
      ),
      showText && /* @__PURE__ */ jsx63(
        TextSection,
        {
          getValue,
          onChange: onPropertyChange,
          explicitPropertyNames
        }
      )
    ] }),
    effectiveTab === "motion" && !isMultiSelect && /* @__PURE__ */ jsx63(
      MotionSection,
      {
        getValue,
        onChange: onPropertyChange
      }
    ),
    effectiveTab === "variables" && !isMultiSelect && /* @__PURE__ */ jsx63(
      VariablesSection,
      {
        title: "Variables",
        variables: store.elementVariables,
        onChange: handleElementVariableChange,
        onAdd: onNewElementVariable,
        addTitle: "Add variable",
        resetKey: selectedNodeId ?? void 0,
        standalone: true,
        emptyMessage: "No variables on this element"
      }
    ),
    effectiveTab === "html" && !isMultiSelect && /* @__PURE__ */ jsxs48(Fragment26, { children: [
      selectedTag && !PROTECTED_TAGS2.has(selectedTag) && /* @__PURE__ */ jsx63(
        TextInput,
        {
          label: "tag",
          displayName: "Tag",
          value: selectedTag,
          onChange: (v) => {
            const trimmed = v.trim().toLowerCase();
            if (trimmed && trimmed !== selectedTag && selectedNodeId !== null) {
              onTagChange?.(selectedNodeId, trimmed);
            }
          }
        }
      ),
      /* @__PURE__ */ jsx63(
        AttributesSection,
        {
          attributes: selectedAttributes,
          onAttributeChange,
          onAttributeDelete,
          onAttributeRename
        }
      )
    ] })
  ] }) });
});

