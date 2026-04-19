// src/Editor/PropertiesPanel/inputs/BoxShadowInput.tsx
import { Fragment as Fragment15, jsx as jsx46, jsxs as jsxs33 } from "react/jsx-runtime";
function BoxShadowInput({ value, onChange, onFocus }) {
  const shadows = useMemo12(() => parseBoxShadow(value), [value]);
  const isTokenRef = value.trim().startsWith("var(");
  const handleFieldChange = useCallback27(
    (index, field, fieldValue) => {
      const updated = shadows.map(
        (s, i) => i === index ? { ...s, [field]: fieldValue } : s
      );
      onChange(serializeBoxShadow(updated));
    },
    [shadows, onChange]
  );
  const handleAdd = useCallback27(() => {
    onChange(serializeBoxShadow([...shadows, { ...DEFAULT_SHADOW }]));
  }, [shadows, onChange]);
  const handleDelete = useCallback27(
    (index) => {
      const updated = shadows.filter((_, i) => i !== index);
      onChange(serializeBoxShadow(updated));
    },
    [shadows, onChange]
  );
  if (isTokenRef) {
    return /* @__PURE__ */ jsx46(
      TextInput,
      {
        label: "box-shadow",
        displayName: "Shadow",
        value,
        onChange,
        onFocus
      }
    );
  }
  return /* @__PURE__ */ jsxs33(Fragment15, { children: [
    /* @__PURE__ */ jsxs33("div", { className: inputs_default.row, children: [
      /* @__PURE__ */ jsx46("label", { className: inputs_default.label, children: "Shadow" }),
      /* @__PURE__ */ jsx46("span", {}),
      /* @__PURE__ */ jsx46(
        "button",
        {
          className: BoxShadowInput_default.addButton,
          onClick: handleAdd,
          title: "Add shadow",
          children: /* @__PURE__ */ jsx46(PlusIcon, {})
        }
      )
    ] }),
    shadows.map((shadow, i) => /* @__PURE__ */ jsx46(
      ShadowItem,
      {
        index: i,
        shadow,
        showSeparator: i > 0,
        onFieldChange: handleFieldChange,
        onDelete: handleDelete,
        onFocus
      },
      i
    ))
  ] });
}
function ShadowItem({
  index,
  shadow,
  showSeparator,
  onFieldChange,
  onDelete,
  onFocus
}) {
  return /* @__PURE__ */ jsxs33(Fragment15, { children: [
    showSeparator && /* @__PURE__ */ jsx46("div", { className: BoxShadowInput_default.separator }),
    /* @__PURE__ */ jsx46(
      ColorInput,
      {
        label: "color",
        displayName: "Color",
        value: shadow.color,
        onChange: (v) => onFieldChange(index, "color", v),
        onFocus
      }
    ),
    /* @__PURE__ */ jsx46(
      NumberInput,
      {
        displayName: "X",
        value: shadow.offsetX,
        units: SHADOW_UNITS,
        indent: true,
        onChange: (v) => onFieldChange(index, "offsetX", v),
        onFocus
      }
    ),
    /* @__PURE__ */ jsx46(
      NumberInput,
      {
        displayName: "Y",
        value: shadow.offsetY,
        units: SHADOW_UNITS,
        indent: true,
        onChange: (v) => onFieldChange(index, "offsetY", v),
        onFocus
      }
    ),
    /* @__PURE__ */ jsx46(
      NumberInput,
      {
        displayName: "Blur",
        value: shadow.blur,
        units: SHADOW_BLUR_UNITS,
        indent: true,
        onChange: (v) => onFieldChange(index, "blur", v),
        onFocus
      }
    ),
    /* @__PURE__ */ jsx46(
      NumberInput,
      {
        displayName: "Spread",
        value: shadow.spread,
        units: SHADOW_UNITS,
        indent: true,
        onChange: (v) => onFieldChange(index, "spread", v),
        onFocus
      }
    ),
    /* @__PURE__ */ jsxs33("div", { className: `${inputs_default.row} ${inputs_default.indent}`, children: [
      /* @__PURE__ */ jsx46("label", { className: inputs_default.label, children: "Inset" }),
      /* @__PURE__ */ jsx46(
        Toggle,
        {
          value: shadow.inset,
          onChange: (v) => onFieldChange(index, "inset", v)
        }
      ),
      /* @__PURE__ */ jsx46(
        "button",
        {
          className: inputs_default.deleteButton,
          onClick: () => onDelete(index),
          title: "Remove shadow",
          children: /* @__PURE__ */ jsx46(XIcon, { size: 10 })
        }
      )
    ] })
  ] });
}

