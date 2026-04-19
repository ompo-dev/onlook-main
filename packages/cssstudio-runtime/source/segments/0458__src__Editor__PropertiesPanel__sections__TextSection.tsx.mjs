// src/Editor/PropertiesPanel/sections/TextSection.tsx
import { useState as useState25, useMemo as useMemo19, useCallback as useCallback35 } from "react";
import { Fragment as Fragment25, jsx as jsx60, jsxs as jsxs45 } from "react/jsx-runtime";
var TEXT_ALIGN_TABS = [
  { value: "left", icon: /* @__PURE__ */ jsx60(AlignLeftIcon, {}), title: "Left" },
  { value: "center", icon: /* @__PURE__ */ jsx60(AlignCenterIcon, {}), title: "Center" },
  { value: "right", icon: /* @__PURE__ */ jsx60(AlignRightIcon, {}), title: "Right" },
  { value: "justify", icon: /* @__PURE__ */ jsx60(AlignJustifyIcon, {}), title: "Justify" }
];
var TEXT_DECORATION_TABS = [
  { value: "none", icon: /* @__PURE__ */ jsx60(DecorationNoneIcon, {}), title: "None" },
  { value: "underline", icon: /* @__PURE__ */ jsx60(UnderlineIcon, {}), title: "Underline" },
  { value: "overline", icon: /* @__PURE__ */ jsx60(OverlineIcon, {}), title: "Overline" },
  { value: "line-through", icon: /* @__PURE__ */ jsx60(StrikethroughIcon, {}), title: "Line through" }
];
var TEXT_TRANSFORM_TABS = [
  { value: "none", icon: /* @__PURE__ */ jsx60(TransformNoneIcon, {}), title: "None" },
  { value: "uppercase", icon: /* @__PURE__ */ jsx60(UppercaseIcon, {}), title: "Uppercase" },
  { value: "lowercase", icon: /* @__PURE__ */ jsx60(LowercaseIcon, {}), title: "Lowercase" },
  { value: "capitalize", icon: /* @__PURE__ */ jsx60(CapitalizeIcon, {}), title: "Capitalize" }
];
var OPTIONAL_PROPERTIES = [
  { name: "text-decoration", displayName: "Decoration", type: "icon-tab", tabs: TEXT_DECORATION_TABS },
  { name: "text-transform", displayName: "Transform", type: "icon-tab", tabs: TEXT_TRANSFORM_TABS },
  { name: "text-overflow", displayName: "Overflow", type: "select", options: ["clip", "ellipsis"] },
  { name: "white-space", displayName: "White Space", type: "select", options: ["normal", "nowrap", "pre", "pre-wrap", "pre-line"] },
  { name: "word-break", displayName: "Word Break", type: "select", options: ["normal", "break-all", "keep-all"] },
  { name: "text-shadow", displayName: "Shadow", type: "text" }
];
function TextSection({
  getValue,
  onChange,
  onFocus,
  explicitPropertyNames
}) {
  const [userAdded, setUserAdded] = useState25(/* @__PURE__ */ new Set());
  const [menuPos, setMenuPos] = useState25(null);
  const { onRowContextMenu, RowContextMenu } = useRowContextMenu();
  const filter2 = useFilter();
  const f = (name) => matchesFilter(name, filter2);
  const visibleOptional = useMemo19(
    () => OPTIONAL_PROPERTIES.filter(
      (p) => explicitPropertyNames.has(p.name) || userAdded.has(p.name)
    ),
    [explicitPropertyNames, userAdded]
  );
  const addableProperties = useMemo19(
    () => OPTIONAL_PROPERTIES.filter(
      (p) => !explicitPropertyNames.has(p.name) && !userAdded.has(p.name)
    ),
    [explicitPropertyNames, userAdded]
  );
  const handlePlusClick = useCallback35((e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ x: rect.left, y: rect.bottom + 4 });
  }, []);
  const handleAddProperty = useCallback35((name) => {
    setUserAdded((prev) => new Set(prev).add(name));
  }, []);
  const handleRemoveProperty = useCallback35((name) => {
    setUserAdded((prev) => {
      const next2 = new Set(prev);
      next2.delete(name);
      return next2;
    });
    onChange(name, "");
  }, [onChange]);
  const rows = [];
  if (f("Font")) {
    rows.push(
      /* @__PURE__ */ jsx60(TokenPicker, { value: getValue("font-family"), label: "Font", tokenType: "unknown", onSelect: (v) => onChange("font-family", v), children: /* @__PURE__ */ jsx60(
        TextInput,
        {
          label: "font-family",
          displayName: "Font",
          value: getValue("font-family"),
          onChange: (v) => onChange("font-family", v),
          onFocus
        }
      ) }, "font-family")
    );
  }
  if (f("Size")) {
    rows.push(
      /* @__PURE__ */ jsx60(TokenPicker, { value: getValue("font-size"), label: "Size", tokenType: "number", onSelect: (v) => onChange("font-size", v), children: /* @__PURE__ */ jsx60(
        NumberInput,
        {
          label: "font-size",
          displayName: "Size",
          value: getValue("font-size"),
          onChange: (v) => onChange("font-size", v),
          onFocus
        }
      ) }, "font-size")
    );
  }
  if (f("Color")) {
    rows.push(
      /* @__PURE__ */ jsx60(TokenPicker, { value: getValue("color"), label: "Color", tokenType: "color", onSelect: (v) => onChange("color", v), children: /* @__PURE__ */ jsx60(
        ColorInput,
        {
          label: "color",
          displayName: "Color",
          value: getValue("color"),
          onChange: (v) => onChange("color", v),
          onFocus
        }
      ) }, "color")
    );
  }
  if (f("Weight")) {
    rows.push(
      /* @__PURE__ */ jsx60(TokenPicker, { value: getValue("font-weight"), label: "Weight", tokenType: "number", onSelect: (v) => onChange("font-weight", v), children: /* @__PURE__ */ jsx60(
        NumberInput,
        {
          label: "font-weight",
          displayName: "Weight",
          value: getValue("font-weight"),
          onChange: (v) => onChange("font-weight", v),
          onFocus
        }
      ) }, "font-weight")
    );
  }
  if (f("Letter Spacing")) {
    rows.push(
      /* @__PURE__ */ jsx60(TokenPicker, { value: getValue("letter-spacing"), label: "Letter Spacing", tokenType: "number", onSelect: (v) => onChange("letter-spacing", v), children: /* @__PURE__ */ jsx60(
        NumberInput,
        {
          label: "letter-spacing",
          displayName: "Letter Spacing",
          value: getValue("letter-spacing"),
          onChange: (v) => onChange("letter-spacing", v),
          onFocus
        }
      ) }, "letter-spacing")
    );
  }
  if (f("Line Height")) {
    rows.push(
      /* @__PURE__ */ jsx60(TokenPicker, { value: getValue("line-height"), label: "Line Height", tokenType: "number", onSelect: (v) => onChange("line-height", v), children: /* @__PURE__ */ jsx60(
        NumberInput,
        {
          label: "line-height",
          displayName: "Line Height",
          value: getValue("line-height"),
          onChange: (v) => onChange("line-height", v),
          onFocus
        }
      ) }, "line-height")
    );
  }
  if (f("Align")) {
    rows.push(
      /* @__PURE__ */ jsx60(
        IconTabBar,
        {
          label: "text-align",
          displayName: "Align",
          value: getValue("text-align") || "left",
          options: TEXT_ALIGN_TABS,
          onChange: (v) => onChange("text-align", v),
          onFocus
        },
        "text-align"
      )
    );
  }
  for (const prop of visibleOptional) {
    if (!f(prop.displayName)) continue;
    const isExplicit = explicitPropertyNames.has(prop.name);
    const removable = !isExplicit;
    const wrapNode = (node) => removable ? /* @__PURE__ */ jsx60("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProperty(prop.name)), children: node }, prop.name) : node;
    if (prop.type === "icon-tab") {
      rows.push(wrapNode(
        /* @__PURE__ */ jsx60(
          IconTabBar,
          {
            label: prop.name,
            displayName: prop.displayName,
            value: getValue(prop.name) || prop.tabs[0].value,
            options: prop.tabs,
            onChange: (v) => onChange(prop.name, v),
            onFocus
          },
          prop.name
        )
      ));
    } else if (prop.type === "select") {
      rows.push(wrapNode(
        /* @__PURE__ */ jsx60(
          SelectInput,
          {
            label: prop.name,
            displayName: prop.displayName,
            value: getValue(prop.name),
            options: prop.options,
            onChange: (v) => onChange(prop.name, v),
            onFocus
          },
          prop.name
        )
      ));
    } else {
      rows.push(wrapNode(
        /* @__PURE__ */ jsx60(
          TextInput,
          {
            label: prop.name,
            displayName: prop.displayName,
            value: getValue(prop.name),
            onChange: (v) => onChange(prop.name, v),
            onFocus
          },
          prop.name
        )
      ));
    }
  }
  if (rows.length === 0) return null;
  return /* @__PURE__ */ jsxs45(Fragment25, { children: [
    /* @__PURE__ */ jsx60(Section, { title: "Text", onAdd: addableProperties.length > 0 ? handlePlusClick : void 0, addTitle: "Add text property", children: rows }),
    menuPos && /* @__PURE__ */ jsx60(
      ContextMenu,
      {
        x: menuPos.x,
        y: menuPos.y,
        animate: true,
        items: addableProperties.map((p) => ({
          label: p.displayName,
          onClick: () => handleAddProperty(p.name)
        })),
        onClose: () => setMenuPos(null)
      }
    ),
    RowContextMenu
  ] });
}

