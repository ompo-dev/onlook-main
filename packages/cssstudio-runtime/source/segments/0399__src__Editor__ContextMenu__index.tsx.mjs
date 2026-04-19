// src/Editor/ContextMenu/index.tsx
import { Fragment as Fragment9, jsx as jsx34, jsxs as jsxs22 } from "react/jsx-runtime";
function ContextMenu({ x, y, items, onClose, animate: animate2 = false, transformOrigin = "top left" }) {
  const menuRef = useRef21(null);
  useEffect22(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const positionRef = useRef21({ x, y });
  positionRef.current = { x, y };
  useEffect22(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 4;
    const maxY = window.innerHeight - rect.height - 4;
    if (positionRef.current.x > maxX) el.style.left = `${maxX}px`;
    if (positionRef.current.y > maxY) el.style.top = `${maxY}px`;
  }, []);
  const content = items.map((item, i) => {
    if ("separator" in item && item.separator) {
      return /* @__PURE__ */ jsx34("div", { className: ContextMenu_default.separator }, `sep-${i}`);
    }
    return /* @__PURE__ */ jsxs22(
      "button",
      {
        className: `${ContextMenu_default.item} ${item.danger ? ContextMenu_default.danger : ""}`,
        onClick: () => {
          item.onClick();
          onClose();
        },
        children: [
          /* @__PURE__ */ jsx34("span", { children: item.label }),
          item.shortcut && /* @__PURE__ */ jsx34("span", { className: ContextMenu_default.shortcut, children: item.shortcut })
        ]
      },
      item.label
    );
  });
  const menuProps = {
    ref: menuRef,
    className: ContextMenu_default.menu,
    style: { left: x, top: y }
  };
  const menu = animate2 ? /* @__PURE__ */ jsx34(
    motion.div,
    {
      ...menuProps,
      initial: { opacity: 0, scale: 0.9, filter: "blur(2px)" },
      animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
      transition: { duration: 0.12, ease: "easeOut" },
      style: { ...menuProps.style, transformOrigin },
      children: content
    }
  ) : /* @__PURE__ */ jsx34("div", { ...menuProps, children: content });
  return /* @__PURE__ */ jsxs22(Fragment9, { children: [
    /* @__PURE__ */ jsx34("div", { className: ContextMenu_default.backdrop, onMouseDown: onClose }),
    menu
  ] });
}

