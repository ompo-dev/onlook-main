// src/Editor/Toolbar/IconButton.tsx
import { jsx as jsx6 } from "react/jsx-runtime";
function IconButton({ active, muted, mode, disabled, onClick, title, children }) {
  return /* @__PURE__ */ jsx6(
    "button",
    {
      className: `${Toolbar_default.toolbarButton} ${active ? Toolbar_default.active : ""} ${mode === "primary" ? Toolbar_default.primary : ""} ${muted ? Toolbar_default.muted : ""}`,
      onClick,
      disabled,
      title,
      children
    }
  );
}

