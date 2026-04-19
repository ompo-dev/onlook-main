// src/Editor/AnimationsPanel/KeyframesDropdown.tsx
import { Fragment as Fragment28, jsx as jsx67, jsxs as jsxs51 } from "react/jsx-runtime";
var validateAnimName = (v) => v.replace(/[^a-zA-Z0-9_-]/g, "-");
function KeyframesDropdown() {
  const rules = useStore2((s) => s.keyframesRules);
  const selected = useStore2((s) => s.selectedKeyframesName);
  const select = useStore2((s) => s.selectKeyframesRule);
  const selectedAnimIndex = useStore2((s) => s.selectedAnimationIndex);
  const updateEntry = useStore2((s) => s.updateAnimationEntry);
  const creating = useStore2((s) => s.creatingAnimation);
  const commitName = useStore2((s) => s.commitAnimationName);
  const cancelCreate = useStore2((s) => s.cancelCreateAnimation);
  const createAnimation = useStore2((s) => s.createAnimation);
  const selectedNodeId = useStore2((s) => s.selectedNodeId);
  const addPendingAttachment = useStore2((s) => s.addPendingAttachment);
  const openChat = useStore2((s) => s.openChat);
  if (creating) {
    return /* @__PURE__ */ jsx67(
      EditableInput,
      {
        placeholder: "animation-name",
        validate: validateAnimName,
        onCommit: (name) => name ? commitName(name) : cancelCreate(),
        onCancel: cancelCreate
      }
    );
  }
  return /* @__PURE__ */ jsxs51(Fragment28, { children: [
    rules.length > 0 && /* @__PURE__ */ jsx67(
      "select",
      {
        className: AnimationsPanel_default.dropdown,
        value: selected ?? "",
        onChange: (e) => {
          const name = e.target.value || null;
          select(name);
          if (name && selectedAnimIndex !== null) {
            updateEntry(selectedAnimIndex, { name });
          }
        },
        children: rules.map((r) => /* @__PURE__ */ jsx67("option", { value: r.name, children: r.name }, r.name))
      }
    ),
    selectedNodeId !== null && selected && /* @__PURE__ */ jsx67(
      "button",
      {
        className: AnimationsPanel_default.playbackBtn,
        onClick: () => {
          addPendingAttachment({ nodeId: selectedNodeId, label: `@keyframes ${selected}` });
          openChat();
        },
        title: "Add animation to chat",
        children: /* @__PURE__ */ jsxs51("svg", { viewBox: "0 0 24 24", style: { fill: "none" }, stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ jsx67("path", { d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" }),
          /* @__PURE__ */ jsx67("path", { d: "M12 8v6" }),
          /* @__PURE__ */ jsx67("path", { d: "M9 11h6" })
        ] })
      }
    ),
    /* @__PURE__ */ jsx67(
      "button",
      {
        className: AnimationsPanel_default.playbackBtn,
        onClick: createAnimation,
        title: "New animation",
        children: /* @__PURE__ */ jsx67(PlusIcon, {})
      }
    )
  ] });
}

