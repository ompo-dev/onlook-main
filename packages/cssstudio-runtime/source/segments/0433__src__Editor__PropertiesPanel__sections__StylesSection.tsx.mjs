// src/Editor/PropertiesPanel/sections/StylesSection.tsx
import { Fragment as Fragment17, jsx as jsx48, jsxs as jsxs35 } from "react/jsx-runtime";
var CURSOR_OPTIONS = [
  "auto",
  "default",
  "none",
  "pointer",
  "text",
  "move",
  "wait",
  "progress",
  "help",
  "not-allowed",
  "no-drop",
  "grab",
  "grabbing",
  "crosshair",
  "cell",
  "alias",
  "copy",
  "context-menu",
  "vertical-text",
  "all-scroll",
  "col-resize",
  "row-resize",
  "n-resize",
  "e-resize",
  "s-resize",
  "w-resize",
  "ne-resize",
  "nw-resize",
  "se-resize",
  "sw-resize",
  "ew-resize",
  "ns-resize",
  "nesw-resize",
  "nwse-resize",
  "zoom-in",
  "zoom-out"
];
function StylesSection({ getValue, onChange, onFocus }) {
  const [addMenu, setAddMenu] = useState17(null);
  const [addedProps, setAddedProps] = useState17(/* @__PURE__ */ new Set());
  const { onRowContextMenu, RowContextMenu } = useRowContextMenu();
  const filter2 = useFilter();
  const f = (name) => matchesFilter(name, filter2);
  const cursorValue = getValue("cursor");
  const showCursor = !!cursorValue && cursorValue !== "auto" || addedProps.has("cursor");
  const zIndexValue = getValue("z-index");
  const showZIndex = !!zIndexValue && zIndexValue !== "auto" || addedProps.has("z-index");
  const cornerShapeValue = getValue("corner-shape");
  const showCornerShape = !!cornerShapeValue || addedProps.has("corner-shape");
  const maskValue = getValue("mask-image");
  const showMask = !!maskValue && maskValue !== "none" || addedProps.has("mask-image");
  const shadowValue = getValue("box-shadow");
  const showShadow = !!shadowValue && shadowValue !== "none" || addedProps.has("box-shadow");
  const filterValue = getValue("filter");
  const parsedFilters = useMemo14(() => parseFilter(filterValue), [filterValue]);
  const handleAddClick = useCallback29((e) => {
    e.preventDefault();
    e.stopPropagation();
    setAddMenu({ x: e.clientX, y: e.clientY });
  }, []);
  const handleAddFilter = useCallback29(
    (name, defaultValue, unit) => {
      const newArgs = unit ? `${defaultValue}${unit}` : String(defaultValue);
      const newFilter = { name, args: newArgs, numericValue: defaultValue, unit };
      const updated = [...parsedFilters, newFilter];
      onChange("filter", serializeFilter(updated));
    },
    [parsedFilters, onChange]
  );
  const handleFilterChange = useCallback29(
    (index, newArgs) => {
      const updated = parsedFilters.map(
        (pf, i) => i === index ? { ...pf, args: newArgs } : pf
      );
      onChange("filter", serializeFilter(updated));
    },
    [parsedFilters, onChange]
  );
  const handleFilterDelete = useCallback29(
    (index) => {
      const updated = parsedFilters.filter((_, i) => i !== index);
      onChange("filter", serializeFilter(updated));
    },
    [parsedFilters, onChange]
  );
  const handleRemoveProp = useCallback29((prop) => {
    onChange(prop, "");
    if (prop === "corner-shape") {
      onChange("corner-shape-top-left", "");
      onChange("corner-shape-top-right", "");
      onChange("corner-shape-bottom-right", "");
      onChange("corner-shape-bottom-left", "");
    }
    setAddedProps((prev) => {
      const next2 = new Set(prev);
      next2.delete(prop);
      return next2;
    });
  }, [onChange]);
  const menuItems = useMemo14(() => {
    const items = [];
    if (!showCornerShape) {
      items.push({
        label: "Corner Shape",
        onClick: () => {
          setAddedProps((prev) => new Set(prev).add("corner-shape"));
          onChange("corner-shape", "round");
        }
      });
    }
    if (!showZIndex) {
      items.push({
        label: "Z-Index",
        onClick: () => {
          setAddedProps((prev) => new Set(prev).add("z-index"));
          onChange("z-index", "1");
        }
      });
    }
    if (!showCursor) {
      items.push({
        label: "Cursor",
        onClick: () => {
          setAddedProps((prev) => new Set(prev).add("cursor"));
          onChange("cursor", "pointer");
        }
      });
    }
    if (!showShadow) {
      items.push({
        label: "Shadow",
        onClick: () => {
          setAddedProps((prev) => new Set(prev).add("box-shadow"));
          onChange("box-shadow", "0px 4px 6px rgba(0, 0, 0, 0.1)");
        }
      });
    }
    if (!showMask) {
      items.push({
        label: "Mask",
        onClick: () => {
          setAddedProps((prev) => new Set(prev).add("mask-image"));
        }
      });
    }
    const existing = new Set(parsedFilters.map((pf) => pf.name));
    for (const config of FILTER_CONFIGS) {
      if (!existing.has(config.name)) {
        items.push({
          label: config.displayName,
          onClick: () => handleAddFilter(config.name, config.defaultValue, config.unit)
        });
      }
    }
    return items;
  }, [parsedFilters, handleAddFilter, showCornerShape, showCursor, showZIndex, showShadow, showMask, onChange]);
  const hasVisibleFilters = parsedFilters.some((pf) => {
    const config = getFilterConfig(pf.name);
    return f(config ? config.displayName : pf.name);
  });
  const hasVisible = f("Opacity") || f("Background") || f("Overflow") || f("Border Radius") || f("Corner Shape") || f("Border") || f("Shadow") || f("Mask") || f("Z-Index") || f("Cursor") || hasVisibleFilters;
  if (!hasVisible) return null;
  const borderMatch = f("Border");
  return /* @__PURE__ */ jsxs35(Fragment17, { children: [
    /* @__PURE__ */ jsxs35(Section, { title: "Styles", onAdd: handleAddClick, addTitle: "Add style", children: [
      f("Opacity") && /* @__PURE__ */ jsx48(TokenPicker, { value: getValue("opacity"), label: "Opacity", tokenType: "number", onSelect: (v) => onChange("opacity", v), children: /* @__PURE__ */ jsx48(
        NumberInput,
        {
          label: "opacity",
          displayName: "Opacity",
          value: getValue("opacity"),
          onChange: (v) => onChange("opacity", v),
          onFocus
        }
      ) }),
      f("Background") && /* @__PURE__ */ jsx48(TokenPicker, { value: getValue("background-color") || getValue("background"), label: "Background", tokenType: "color", onSelect: (v) => onChange("background-color", v), children: /* @__PURE__ */ jsx48(
        ColorInput,
        {
          label: "background",
          displayName: "Background",
          value: getValue("background-color") || getValue("background"),
          onChange: (v) => onChange("background-color", v),
          onFocus,
          supportsGradient: true,
          onPropertyChange: (prop, val) => {
            onChange(prop, val);
            if (prop === "background") onChange("background-color", "");
            if (prop === "background-color") onChange("background", "");
          }
        }
      ) }),
      f("Overflow") && /* @__PURE__ */ jsx48(
        OverflowInput,
        {
          value: getValue("overflow"),
          getValue,
          onChange,
          onFocus
        }
      ),
      f("Border Radius") && /* @__PURE__ */ jsx48(
        PerCornerToggle,
        {
          prop: "border-radius",
          displayName: "Border Radius",
          value: getValue("border-radius"),
          getValue,
          onChange,
          onFocus
        }
      ),
      showCornerShape && f("Corner Shape") && /* @__PURE__ */ jsx48("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProp("corner-shape")), children: /* @__PURE__ */ jsx48(
        PerCornerToggle,
        {
          prop: "corner-shape",
          displayName: "Corner Shape",
          value: cornerShapeValue || "round",
          getValue,
          onChange,
          onFocus,
          type: "corner-shape"
        }
      ) }),
      borderMatch && /* @__PURE__ */ jsx48(TokenPicker, { value: getValue("border"), label: "Border", onSelect: (v) => onChange("border", v), children: /* @__PURE__ */ jsx48(
        BorderInput,
        {
          value: getValue("border"),
          getValue,
          onChange,
          onFocus
        }
      ) }),
      showShadow && f("Shadow") && /* @__PURE__ */ jsx48("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProp("box-shadow")), children: /* @__PURE__ */ jsx48(TokenPicker, { value: getValue("box-shadow"), label: "Shadow", onSelect: (v) => onChange("box-shadow", v), children: /* @__PURE__ */ jsx48(
        BoxShadowInput,
        {
          value: getValue("box-shadow"),
          onChange: (v) => onChange("box-shadow", v),
          onFocus
        }
      ) }) }),
      showMask && f("Mask") && /* @__PURE__ */ jsx48("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProp("mask-image")), children: /* @__PURE__ */ jsx48(TokenPicker, { value: getValue("mask-image"), label: "Mask", onSelect: (v) => onChange("mask-image", v), children: /* @__PURE__ */ jsx48(
        TextInput,
        {
          label: "mask-image",
          displayName: "Mask",
          value: getValue("mask-image"),
          onChange: (v) => onChange("mask-image", v),
          onFocus
        }
      ) }) }),
      showZIndex && f("Z-Index") && /* @__PURE__ */ jsx48("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProp("z-index")), children: /* @__PURE__ */ jsx48(
        NumberInput,
        {
          label: "z-index",
          displayName: "Z-Index",
          value: zIndexValue || "1",
          step: 1,
          onChange: (v) => onChange("z-index", v),
          onFocus
        }
      ) }),
      showCursor && f("Cursor") && /* @__PURE__ */ jsx48("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProp("cursor")), children: /* @__PURE__ */ jsx48(
        SelectInput,
        {
          label: "cursor",
          displayName: "Cursor",
          value: cursorValue || "auto",
          options: CURSOR_OPTIONS,
          onChange: (v) => onChange("cursor", v),
          onFocus
        }
      ) }),
      parsedFilters.map((pf, index) => {
        const config = getFilterConfig(pf.name);
        const displayName = config ? config.displayName : pf.name;
        if (!f(displayName)) return null;
        if (config) {
          return /* @__PURE__ */ jsx48("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleFilterDelete(index)), children: /* @__PURE__ */ jsx48(
            NumberInput,
            {
              displayName: config.displayName,
              value: pf.args,
              min: config.min,
              max: config.max,
              step: config.step,
              unit: config.unit,
              onChange: (v) => handleFilterChange(index, v),
              onFocus
            }
          ) }, pf.name);
        }
        return /* @__PURE__ */ jsx48("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleFilterDelete(index)), children: /* @__PURE__ */ jsx48(
          TextInput,
          {
            label: pf.name,
            displayName: pf.name,
            value: pf.args,
            onChange: (v) => handleFilterChange(index, v),
            onFocus
          }
        ) }, `${pf.name}-${index}`);
      })
    ] }),
    addMenu && /* @__PURE__ */ jsx48(
      ContextMenu,
      {
        x: addMenu.x,
        y: addMenu.y,
        items: menuItems,
        onClose: () => setAddMenu(null),
        animate: true
      }
    ),
    RowContextMenu
  ] });
}

