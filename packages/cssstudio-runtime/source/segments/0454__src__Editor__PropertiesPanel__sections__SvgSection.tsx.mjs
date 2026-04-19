// src/Editor/PropertiesPanel/sections/SvgSection.tsx
import { jsx as jsx58, jsxs as jsxs43 } from "react/jsx-runtime";
function SvgSection({ getValue, onChange, onFocus }) {
  const filter2 = useFilter();
  const f = (name) => matchesFilter(name, filter2);
  const hasMatch = f("Fill") || f("Fill Opacity") || f("Fill Rule") || f("Stroke") || f("Stroke Opacity") || f("Stroke Width") || f("Stroke Linecap") || f("Stroke Linejoin") || f("Stroke Dasharray") || f("Stroke Dashoffset");
  if (!hasMatch) return null;
  return /* @__PURE__ */ jsxs43(Section, { title: "SVG", children: [
    f("Fill") && /* @__PURE__ */ jsx58(TokenPicker, { value: getValue("fill"), label: "Fill", tokenType: "color", onSelect: (v) => onChange("fill", v), children: /* @__PURE__ */ jsx58(
      ColorInput,
      {
        label: "fill",
        displayName: "Fill",
        value: getValue("fill"),
        onChange: (v) => onChange("fill", v),
        onFocus
      }
    ) }),
    f("Fill Opacity") && /* @__PURE__ */ jsx58(TokenPicker, { value: getValue("fill-opacity"), label: "Fill Opacity", tokenType: "number", onSelect: (v) => onChange("fill-opacity", v), children: /* @__PURE__ */ jsx58(
      NumberInput,
      {
        label: "fill-opacity",
        displayName: "Fill Opacity",
        value: getValue("fill-opacity"),
        onChange: (v) => onChange("fill-opacity", v),
        onFocus
      }
    ) }),
    f("Fill Rule") && /* @__PURE__ */ jsx58(
      SelectInput,
      {
        label: "fill-rule",
        displayName: "Fill Rule",
        value: getValue("fill-rule"),
        onChange: (v) => onChange("fill-rule", v),
        options: ["nonzero", "evenodd"],
        onFocus
      }
    ),
    f("Stroke") && /* @__PURE__ */ jsx58(TokenPicker, { value: getValue("stroke"), label: "Stroke", tokenType: "color", onSelect: (v) => onChange("stroke", v), children: /* @__PURE__ */ jsx58(
      ColorInput,
      {
        label: "stroke",
        displayName: "Stroke",
        value: getValue("stroke"),
        onChange: (v) => onChange("stroke", v),
        onFocus
      }
    ) }),
    f("Stroke Opacity") && /* @__PURE__ */ jsx58(TokenPicker, { value: getValue("stroke-opacity"), label: "Stroke Opacity", tokenType: "number", onSelect: (v) => onChange("stroke-opacity", v), children: /* @__PURE__ */ jsx58(
      NumberInput,
      {
        label: "stroke-opacity",
        displayName: "Stroke Opacity",
        value: getValue("stroke-opacity"),
        onChange: (v) => onChange("stroke-opacity", v),
        onFocus
      }
    ) }),
    f("Stroke Width") && /* @__PURE__ */ jsx58(TokenPicker, { value: getValue("stroke-width"), label: "Stroke Width", tokenType: "number", onSelect: (v) => onChange("stroke-width", v), children: /* @__PURE__ */ jsx58(
      NumberInput,
      {
        label: "stroke-width",
        displayName: "Stroke Width",
        value: getValue("stroke-width"),
        onChange: (v) => onChange("stroke-width", v),
        onFocus
      }
    ) }),
    f("Stroke Linecap") && /* @__PURE__ */ jsx58(
      SelectInput,
      {
        label: "stroke-linecap",
        displayName: "Stroke Linecap",
        value: getValue("stroke-linecap"),
        onChange: (v) => onChange("stroke-linecap", v),
        options: ["butt", "round", "square"],
        onFocus
      }
    ),
    f("Stroke Linejoin") && /* @__PURE__ */ jsx58(
      SelectInput,
      {
        label: "stroke-linejoin",
        displayName: "Stroke Linejoin",
        value: getValue("stroke-linejoin"),
        onChange: (v) => onChange("stroke-linejoin", v),
        options: ["miter", "round", "bevel"],
        onFocus
      }
    ),
    f("Stroke Dasharray") && /* @__PURE__ */ jsx58(TokenPicker, { value: getValue("stroke-dasharray"), label: "Stroke Dasharray", onSelect: (v) => onChange("stroke-dasharray", v), children: /* @__PURE__ */ jsx58(
      TextInput,
      {
        label: "stroke-dasharray",
        displayName: "Stroke Dasharray",
        value: getValue("stroke-dasharray"),
        onChange: (v) => onChange("stroke-dasharray", v),
        onFocus
      }
    ) }),
    f("Stroke Dashoffset") && /* @__PURE__ */ jsx58(TokenPicker, { value: getValue("stroke-dashoffset"), label: "Stroke Dashoffset", tokenType: "number", onSelect: (v) => onChange("stroke-dashoffset", v), children: /* @__PURE__ */ jsx58(
      NumberInput,
      {
        label: "stroke-dashoffset",
        displayName: "Stroke Dashoffset",
        value: getValue("stroke-dashoffset"),
        onChange: (v) => onChange("stroke-dashoffset", v),
        onFocus
      }
    ) })
  ] });
}

