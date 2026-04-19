// src/Editor/PropertiesPanel/Section.tsx
import { jsx as jsx24, jsxs as jsxs14 } from "react/jsx-runtime";
function Section({ title, onAdd, addTitle, children }) {
  return /* @__PURE__ */ jsxs14("div", { className: Section_default.section, children: [
    (title || onAdd) && /* @__PURE__ */ jsxs14("div", { className: Section_default.header, children: [
      title && /* @__PURE__ */ jsx24("span", { className: Section_default.title, children: title }),
      !title && /* @__PURE__ */ jsx24("span", { className: Section_default.title }),
      onAdd && /* @__PURE__ */ jsx24("button", { className: Section_default.headerAction, onClick: onAdd, title: addTitle, children: /* @__PURE__ */ jsx24(PlusIcon, {}) })
    ] }),
    /* @__PURE__ */ jsx24("div", { className: Section_default.body, children })
  ] });
}

