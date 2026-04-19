// src/Editor/Panel/index.tsx
import { jsx as jsx22, jsxs as jsxs12 } from "react/jsx-runtime";
function Panel({ panelId, tabs, onClose, headerSlot, label, children, className }) {
  const panel = useStore2((s) => s.panels[panelId]);
  const setPanelActiveTab = useStore2((s) => s.setPanelActiveTab);
  const { style: style2, isDragging: isDragging2, dragHandlers, handleResizeStart } = usePanelPosition(panelId);
  const { dock, activeTab } = panel;
  const resizeEdgeClass = dock === "bottom" ? Panel_default.resizeEdgeTop : dock === "left" ? Panel_default.resizeEdgeRight : Panel_default.resizeEdgeLeft;
  return /* @__PURE__ */ jsxs12(
    "div",
    {
      "data-cs-panel": panelId,
      "data-dock": dock,
      className: `${Panel_default.panel} ${isDragging2 ? Panel_default.dragging : ""} ${className ?? ""}`,
      style: style2,
      children: [
        /* @__PURE__ */ jsx22(
          "div",
          {
            className: `${Panel_default.resizeEdge} ${resizeEdgeClass}`,
            onPointerDown: handleResizeStart
          }
        ),
        /* @__PURE__ */ jsxs12("div", { className: Panel_default.header, ...dock !== "bottom" ? dragHandlers : {}, children: [
          label && /* @__PURE__ */ jsx22("span", { className: Panel_default.label, children: label }),
          /* @__PURE__ */ jsx22("div", { className: Panel_default.tabBar, children: tabs.map((tab) => /* @__PURE__ */ jsx22(
            "button",
            {
              className: `${Panel_default.tab} ${activeTab === tab.id ? Panel_default.tabActive : ""}`,
              onClick: () => !tab.disabled && setPanelActiveTab(panelId, tab.id),
              disabled: tab.disabled,
              title: tab.disabled ? `${tab.label} (single selection only)` : tab.shortcut ?? tab.label,
              children: tab.label
            },
            tab.id
          )) }),
          /* @__PURE__ */ jsxs12("div", { className: Panel_default.headerRight, children: [
            headerSlot,
            /* @__PURE__ */ jsx22("button", { className: Panel_default.headerButton, onClick: onClose, title: "Close", children: /* @__PURE__ */ jsx22(XIcon, {}) })
          ] })
        ] }),
        /* @__PURE__ */ jsx22("div", { className: Panel_default.content, children })
      ]
    }
  );
}

