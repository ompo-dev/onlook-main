// src/Editor/QuestionPopover/index.tsx
import { jsx as jsx17, jsxs as jsxs8 } from "react/jsx-runtime";
function QuestionPopover({ question, onAnswer, onClose, anchorRef }) {
  return /* @__PURE__ */ jsxs8(Dropdown, { open: true, onClose, anchorRef, width: 280, children: [
    /* @__PURE__ */ jsx17("p", { className: QuestionPopover_default.question, children: question.question }),
    /* @__PURE__ */ jsx17("div", { className: QuestionPopover_default.options, children: question.options.map((option) => /* @__PURE__ */ jsx17(
      "button",
      {
        className: QuestionPopover_default.option,
        onClick: () => onAnswer(option),
        children: option
      },
      option
    )) })
  ] });
}

