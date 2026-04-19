// src/Editor/PropertiesPanel/use-row-context-menu.tsx
import { useState as useState10, useCallback as useCallback20 } from "react";
import { jsx as jsx35 } from "react/jsx-runtime";
function useRowContextMenu() {
  const [rowMenu, setRowMenu] = useState10(null);
  const onRowContextMenu = useCallback20((e, action) => {
    e.preventDefault();
    setRowMenu({ x: e.clientX, y: e.clientY, action });
  }, []);
  const RowContextMenu = rowMenu ? /* @__PURE__ */ jsx35(
    ContextMenu,
    {
      x: rowMenu.x,
      y: rowMenu.y,
      items: [{ label: "Remove value", onClick: rowMenu.action }],
      onClose: () => setRowMenu(null)
    }
  ) : null;
  return { onRowContextMenu, RowContextMenu };
}

