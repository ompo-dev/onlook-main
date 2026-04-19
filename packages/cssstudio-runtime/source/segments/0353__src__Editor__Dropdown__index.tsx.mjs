// src/Editor/Dropdown/index.tsx
import { jsx as jsx15 } from "react/jsx-runtime";
function Dropdown({ open, onClose, anchorRef, children, width }) {
  const ref = useRef14(null);
  useEffect14(() => {
    if (!open) return;
    function handleClick(e) {
      const target = e.composedPath()[0];
      if (target && ref.current && !ref.current.contains(target) && anchorRef.current && !anchorRef.current.contains(target)) {
        onClose();
      }
    }
    const root = ref.current?.getRootNode();
    if (root && root !== document) root.addEventListener("mousedown", handleClick);
    document.addEventListener("mousedown", handleClick);
    return () => {
      if (root && root !== document) root.removeEventListener("mousedown", handleClick);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose, anchorRef]);
  return /* @__PURE__ */ jsx15(
    motion.div,
    {
      ref,
      className: Dropdown_default.dropdown,
      initial: { opacity: 0, scale: 0.9, filter: "blur(2px)" },
      animate: open ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 0.9, filter: "blur(2px)" },
      style: {
        transformOrigin: "top right",
        pointerEvents: open ? "auto" : "none",
        width
      },
      transition: { duration: 0.12, ease: "easeOut" },
      children
    }
  );
}

