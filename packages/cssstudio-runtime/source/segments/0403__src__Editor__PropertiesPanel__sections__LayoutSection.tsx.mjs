// src/Editor/PropertiesPanel/sections/LayoutSection.tsx
import { Fragment as Fragment10, jsx as jsx37, jsxs as jsxs24 } from "react/jsx-runtime";
var DISPLAY_OPTIONS = [
  "block",
  "flex",
  "grid",
  "inline",
  "inline-block",
  "inline-flex",
  "inline-grid",
  "none"
];
var POSITION_OPTIONS = ["static", "relative", "absolute", "fixed", "sticky"];
var BOX_SIZING_OPTIONS = ["content-box", "border-box"];
var GRID_AUTO_FLOW_OPTIONS = ["row", "column", "dense", "row dense", "column dense"];
var JUSTIFY_OPTIONS = ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"];
var isGridDisplay = (v) => v === "grid" || v === "inline-grid";
var DIRECTION_TABS = [
  { value: "column", icon: /* @__PURE__ */ jsx37(ArrowDownIcon, {}), title: "Column" },
  { value: "column-reverse", icon: /* @__PURE__ */ jsx37(ArrowUpIcon, {}), title: "Column reverse" },
  { value: "row", icon: /* @__PURE__ */ jsx37(ArrowRightIcon, {}), title: "Row" },
  { value: "row-reverse", icon: /* @__PURE__ */ jsx37(ArrowLeftIcon, {}), title: "Row reverse" }
];
var ALIGN_TABS_ROW = [
  { value: "stretch", icon: /* @__PURE__ */ jsx37(AlignStretchVIcon, {}), title: "Stretch" },
  { value: "flex-start", icon: /* @__PURE__ */ jsx37(AlignStartHIcon, {}), title: "Flex start" },
  { value: "center", icon: /* @__PURE__ */ jsx37(AlignCenterHIcon, {}), title: "Center" },
  { value: "flex-end", icon: /* @__PURE__ */ jsx37(AlignEndHIcon, {}), title: "Flex end" }
];
var ALIGN_TABS_COL = [
  { value: "stretch", icon: /* @__PURE__ */ jsx37(AlignStretchHIcon, {}), title: "Stretch" },
  { value: "flex-start", icon: /* @__PURE__ */ jsx37(AlignStartVIcon, {}), title: "Flex start" },
  { value: "center", icon: /* @__PURE__ */ jsx37(AlignCenterVIcon, {}), title: "Center" },
  { value: "flex-end", icon: /* @__PURE__ */ jsx37(AlignEndVIcon, {}), title: "Flex end" }
];
var GRID_JUSTIFY_TABS = [
  { value: "stretch", icon: /* @__PURE__ */ jsx37(GridStretchIcon, {}), title: "Stretch" },
  { value: "start", icon: /* @__PURE__ */ jsx37(GridStartIcon, {}), title: "Start" },
  { value: "center", icon: /* @__PURE__ */ jsx37(GridCenterIcon, {}), title: "Center" },
  { value: "end", icon: /* @__PURE__ */ jsx37(GridEndIcon, {}), title: "End" }
];
var GRID_ALIGN_TABS = [
  { value: "stretch", icon: /* @__PURE__ */ jsx37(AlignStretchVIcon, {}), title: "Stretch" },
  { value: "start", icon: /* @__PURE__ */ jsx37(AlignStartVIcon, {}), title: "Start" },
  { value: "center", icon: /* @__PURE__ */ jsx37(AlignCenterVIcon, {}), title: "Center" },
  { value: "end", icon: /* @__PURE__ */ jsx37(AlignEndVIcon, {}), title: "End" }
];
var WRAP_TABS = [
  { value: "nowrap", icon: /* @__PURE__ */ jsx37(NoWrapIcon, {}), title: "No wrap" },
  { value: "wrap", icon: /* @__PURE__ */ jsx37(WrapIcon, {}), title: "Wrap" },
  { value: "wrap-reverse", icon: /* @__PURE__ */ jsx37(WrapReverseIcon, {}), title: "Wrap reverse" }
];
var RESET_VALUES = {
  "min-width": "0px",
  "min-height": "0px",
  "max-width": "none",
  "max-height": "none"
};
var MIN_MAX_PROPS = ["min-width", "max-width", "min-height", "max-height"];
function isMinMaxSet(value, prop) {
  if (!value) return false;
  const defaults = prop.startsWith("min-") ? ["0px", "0", "auto", ""] : ["none", "auto", ""];
  return !defaults.includes(value);
}
function SizeDimension({ dim, label, getValue, onChange, onFocus, visibleMinMax, onRowContextMenu, onRemoveProp }) {
  return /* @__PURE__ */ jsxs24(Fragment10, { children: [
    /* @__PURE__ */ jsx37(TokenPicker, { value: getValue(dim), label, tokenType: "number", onSelect: (v) => onChange(dim, v), children: /* @__PURE__ */ jsx37(NumberInput, { label: dim, displayName: label, value: getValue(dim), onChange: (v) => onChange(dim, v), onFocus }) }),
    ["min", "max"].map((bound) => {
      const prop = `${bound}-${dim}`;
      if (!visibleMinMax.has(prop)) return null;
      const boundLabel = bound[0].toUpperCase() + bound.slice(1);
      return /* @__PURE__ */ jsx37("div", { onContextMenu: (e) => onRowContextMenu(e, () => onRemoveProp(prop)), children: /* @__PURE__ */ jsx37(TokenPicker, { value: getValue(prop), label: boundLabel, indent: true, tokenType: "number", onSelect: (v) => onChange(prop, v), children: /* @__PURE__ */ jsx37(NumberInput, { label: prop, displayName: boundLabel, value: getValue(prop), showSlider: false, onChange: (v) => onChange(prop, v), onFocus, indent: true }) }) }, prop);
    })
  ] });
}
function LayoutSection({ getValue, onChange, onFocus, parentDisplay }) {
  const filter2 = useFilter();
  const f = (name) => matchesFilter(name, filter2);
  const [addMenu, setAddMenu] = useState11(null);
  const [addedProps, setAddedProps] = useState11(/* @__PURE__ */ new Set());
  const { onRowContextMenu, RowContextMenu } = useRowContextMenu();
  const display = getValue("display");
  const flexDir = getValue("flex-direction") || "row";
  const position = getValue("position");
  const showPositionBox = position !== "static" && position !== "";
  const isFlex = ["flex", "inline-flex"].includes(display);
  const isGrid = isGridDisplay(display);
  const showGap = isFlex || isGrid;
  const isColumnDir = flexDir === "column" || flexDir === "column-reverse";
  const isGridChild = isGridDisplay(parentDisplay ?? "");
  const visibleMinMax = useMemo10(() => {
    const set2 = /* @__PURE__ */ new Set();
    for (const prop of MIN_MAX_PROPS) {
      if (addedProps.has(prop) || isMinMaxSet(getValue(prop), prop)) {
        set2.add(prop);
      }
    }
    return set2;
  }, [getValue, addedProps]);
  const handleAddClick = useCallback21((e) => {
    e.preventDefault();
    e.stopPropagation();
    setAddMenu({ x: e.clientX, y: e.clientY });
  }, []);
  const handleRemoveProp = useCallback21((prop) => {
    onChange(prop, RESET_VALUES[prop] ?? "");
    setAddedProps((prev) => {
      const next2 = new Set(prev);
      next2.delete(prop);
      return next2;
    });
  }, [onChange]);
  const sizeMenuItems = useMemo10(() => {
    const items = [];
    for (const prop of MIN_MAX_PROPS) {
      if (!visibleMinMax.has(prop)) {
        const label = prop.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
        items.push({
          label,
          onClick: () => {
            setAddedProps((prev) => new Set(prev).add(prop));
          }
        });
      }
    }
    return items;
  }, [visibleMinMax]);
  const sizeVisible = f("Width") || f("Height") || f("Padding") || f("Margin") || f("Box Sizing");
  const layoutVisible = f("Display") || f("Gap") || f("Direction") || f("Justify") || f("Align") || f("Wrap") || f("Columns") || f("Rows") || f("Auto Flow") || f("Justify Items") || f("Align Items") || f("Grid Column") || f("Grid Row") || f("Position");
  if (!sizeVisible && !layoutVisible) return null;
  return /* @__PURE__ */ jsxs24(Fragment10, { children: [
    sizeVisible && /* @__PURE__ */ jsxs24(Section, { title: "Size", onAdd: sizeMenuItems.length > 0 ? handleAddClick : void 0, addTitle: "Add size constraint", children: [
      ["width", "height"].map((dim) => {
        const label = dim[0].toUpperCase() + dim.slice(1);
        if (!f(label)) return null;
        return /* @__PURE__ */ jsx37(SizeDimension, { dim, label, getValue, onChange, onFocus, visibleMinMax, onRowContextMenu, onRemoveProp: handleRemoveProp }, dim);
      }),
      f("Padding") && /* @__PURE__ */ jsx37(
        SplitAxisToggle,
        {
          prop: "padding",
          displayName: "Padding",
          value: getValue("padding"),
          getValue,
          onChange,
          onFocus
        }
      ),
      f("Margin") && /* @__PURE__ */ jsx37(
        SplitAxisToggle,
        {
          prop: "margin",
          displayName: "Margin",
          value: getValue("margin"),
          getValue,
          onChange,
          onFocus
        }
      ),
      f("Box Sizing") && /* @__PURE__ */ jsx37(
        SelectInput,
        {
          label: "box-sizing",
          displayName: "Box Sizing",
          value: getValue("box-sizing"),
          options: BOX_SIZING_OPTIONS,
          onChange: (v) => onChange("box-sizing", v),
          onFocus
        }
      )
    ] }),
    layoutVisible && /* @__PURE__ */ jsxs24(Section, { title: "Layout", children: [
      f("Display") && /* @__PURE__ */ jsx37(
        SelectInput,
        {
          label: "display",
          displayName: "Display",
          value: display,
          options: DISPLAY_OPTIONS,
          onChange: (v) => onChange("display", v),
          onFocus
        }
      ),
      showGap && f("Gap") && /* @__PURE__ */ jsx37(TokenPicker, { value: getValue("gap"), label: "Gap", tokenType: "number", onSelect: (v) => onChange("gap", v), children: /* @__PURE__ */ jsx37(
        NumberInput,
        {
          label: "gap",
          displayName: "Gap",
          value: getValue("gap"),
          onChange: (v) => onChange("gap", v),
          onFocus
        }
      ) }),
      isFlex && f("Direction") && /* @__PURE__ */ jsx37(
        IconTabBar,
        {
          label: "flex-direction",
          displayName: "Direction",
          value: flexDir,
          options: DIRECTION_TABS,
          onChange: (v) => onChange("flex-direction", v),
          onFocus
        }
      ),
      isFlex && f("Justify") && /* @__PURE__ */ jsx37(
        SelectInput,
        {
          label: "justify-content",
          displayName: "Justify",
          value: getValue("justify-content"),
          options: JUSTIFY_OPTIONS,
          onChange: (v) => onChange("justify-content", v),
          onFocus
        }
      ),
      isFlex && f("Align") && /* @__PURE__ */ jsx37(
        IconTabBar,
        {
          label: "align-items",
          displayName: "Align",
          value: getValue("align-items") || "stretch",
          options: isColumnDir ? ALIGN_TABS_COL : ALIGN_TABS_ROW,
          onChange: (v) => onChange("align-items", v),
          onFocus
        }
      ),
      isFlex && f("Wrap") && /* @__PURE__ */ jsx37(
        IconTabBar,
        {
          label: "flex-wrap",
          displayName: "Wrap",
          value: getValue("flex-wrap") || "nowrap",
          options: WRAP_TABS,
          onChange: (v) => onChange("flex-wrap", v),
          onFocus
        }
      ),
      isGrid && f("Columns") && /* @__PURE__ */ jsx37(
        TextInput,
        {
          label: "grid-template-columns",
          displayName: "Columns",
          value: getValue("grid-template-columns"),
          onChange: (v) => onChange("grid-template-columns", v),
          onFocus
        }
      ),
      isGrid && f("Rows") && /* @__PURE__ */ jsx37(
        TextInput,
        {
          label: "grid-template-rows",
          displayName: "Rows",
          value: getValue("grid-template-rows"),
          onChange: (v) => onChange("grid-template-rows", v),
          onFocus
        }
      ),
      isGrid && f("Auto Flow") && /* @__PURE__ */ jsx37(
        SelectInput,
        {
          label: "grid-auto-flow",
          displayName: "Auto Flow",
          value: getValue("grid-auto-flow"),
          options: GRID_AUTO_FLOW_OPTIONS,
          onChange: (v) => onChange("grid-auto-flow", v),
          onFocus
        }
      ),
      isGrid && f("Justify Items") && /* @__PURE__ */ jsx37(
        IconTabBar,
        {
          label: "justify-items",
          displayName: "Justify Items",
          value: getValue("justify-items") || "stretch",
          options: GRID_JUSTIFY_TABS,
          onChange: (v) => onChange("justify-items", v),
          onFocus
        }
      ),
      isGrid && f("Align Items") && /* @__PURE__ */ jsx37(
        IconTabBar,
        {
          label: "align-items",
          displayName: "Align Items",
          value: getValue("align-items") || "stretch",
          options: GRID_ALIGN_TABS,
          onChange: (v) => onChange("align-items", v),
          onFocus
        }
      ),
      isGridChild && f("Grid Column") && /* @__PURE__ */ jsx37(
        TextInput,
        {
          label: "grid-column",
          displayName: "Grid Column",
          value: getValue("grid-column"),
          onChange: (v) => onChange("grid-column", v),
          onFocus
        }
      ),
      isGridChild && f("Grid Row") && /* @__PURE__ */ jsx37(
        TextInput,
        {
          label: "grid-row",
          displayName: "Grid Row",
          value: getValue("grid-row"),
          onChange: (v) => onChange("grid-row", v),
          onFocus
        }
      ),
      (isFlex || isGrid || isGridChild) && /* @__PURE__ */ jsx37("div", { className: Section_default.divider }),
      f("Position") && /* @__PURE__ */ jsx37(
        SelectInput,
        {
          label: "position",
          displayName: "Position",
          value: position,
          options: POSITION_OPTIONS,
          onChange: (v) => onChange("position", v),
          onFocus
        }
      ),
      f("Position") && showPositionBox && /* @__PURE__ */ jsx37(
        PositionBox,
        {
          position,
          getValue,
          onChange,
          onFocus
        }
      )
    ] }),
    addMenu && /* @__PURE__ */ jsx37(
      ContextMenu,
      {
        x: addMenu.x,
        y: addMenu.y,
        items: sizeMenuItems,
        onClose: () => setAddMenu(null),
        animate: true
      }
    ),
    RowContextMenu
  ] });
}

