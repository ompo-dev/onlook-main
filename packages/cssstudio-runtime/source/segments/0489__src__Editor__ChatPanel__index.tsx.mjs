// src/Editor/ChatPanel/index.tsx
import { jsx as jsx74, jsxs as jsxs58 } from "react/jsx-runtime";
function ChatPanel({ onSend, mode }) {
  const chatMessages = useStore2((s) => s.chatMessages);
  const agentResponding = useStore2((s) => s.agentResponding);
  const mcpStatus = useStore2((s) => s.mcpStatus);
  const isConnected = mcpStatus === "connected" || mode === "demo";
  const pendingAttachments = useStore2((s) => s.pendingAttachments);
  const removePendingAttachment = useStore2((s) => s.removePendingAttachment);
  const clearPendingAttachments = useStore2((s) => s.clearPendingAttachments);
  const selectedNodeIds = useStore2((s) => s.selectedNodeIds);
  const domTree = useStore2((s) => s.domTree);
  const autoAttachments = useMemo23(() => {
    if (selectedNodeIds.length === 0 || !domTree) return [];
    return selectedNodeIds.filter((id3) => !pendingAttachments.some((a) => a.nodeId === id3)).map((id3) => {
      const info = getElementInfoById(id3);
      return { nodeId: id3, label: info.element };
    });
  }, [selectedNodeIds, pendingAttachments, domTree]);
  const [inputValue, setInputValue] = useState34("");
  const messagesRef = useRef41(null);
  const inputRef = useRef41(null);
  useEffect41(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages.length, agentResponding]);
  useEffect41(() => {
    inputRef.current?.focus();
  }, []);
  const handleSend = useCallback43(() => {
    const text = inputValue.trim();
    if (!text) return;
    const allAttachments = [
      ...autoAttachments,
      ...pendingAttachments
    ];
    onSend(text, allAttachments);
    setInputValue("");
    clearPendingAttachments();
  }, [inputValue, autoAttachments, pendingAttachments, onSend, clearPendingAttachments]);
  const handleKeyDown = useCallback43((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);
  return /* @__PURE__ */ jsxs58("div", { className: ChatPanel_default.chatContent, children: [
    /* @__PURE__ */ jsxs58("div", { className: ChatPanel_default.messages, ref: messagesRef, children: [
      chatMessages.map((msg) => {
        if (msg.role === "status") {
          return /* @__PURE__ */ jsx74("div", { className: ChatPanel_default.statusMsg, "data-error": msg.isError || void 0, children: msg.text }, msg.id);
        }
        if (msg.role === "user") {
          return /* @__PURE__ */ jsxs58("div", { className: `${ChatPanel_default.userMsg}${msg.pending ? ` ${ChatPanel_default.userMsgPending}` : ""}`, children: [
            msg.attachments && msg.attachments.length > 0 && /* @__PURE__ */ jsx74("div", { className: ChatPanel_default.msgAttachments, children: msg.attachments.map((a) => /* @__PURE__ */ jsx74("span", { className: ChatPanel_default.msgChip, children: a.label }, a.nodeId)) }),
            msg.text
          ] }, msg.id);
        }
        return /* @__PURE__ */ jsx74("div", { className: ChatPanel_default.agentMsg, "data-error": msg.isError || void 0, children: msg.text }, msg.id);
      }),
      agentResponding && /* @__PURE__ */ jsx74("div", { className: ChatPanel_default.agentMsg, children: /* @__PURE__ */ jsxs58("span", { className: ChatPanel_default.typingDots, children: [
        /* @__PURE__ */ jsx74("span", {}),
        /* @__PURE__ */ jsx74("span", {}),
        /* @__PURE__ */ jsx74("span", {})
      ] }) })
    ] }),
    (autoAttachments.length > 0 || pendingAttachments.length > 0) && /* @__PURE__ */ jsxs58("div", { className: ChatPanel_default.attachments, children: [
      autoAttachments.map((a) => /* @__PURE__ */ jsx74("span", { className: `${ChatPanel_default.chip} ${ChatPanel_default.chipAuto}`, children: a.label }, a.nodeId)),
      pendingAttachments.map((a) => /* @__PURE__ */ jsxs58("span", { className: ChatPanel_default.chip, children: [
        a.label,
        /* @__PURE__ */ jsx74(
          "button",
          {
            className: ChatPanel_default.chipRemove,
            onClick: () => removePendingAttachment(a.nodeId),
            title: "Remove",
            children: "\xD7"
          }
        )
      ] }, a.nodeId))
    ] }),
    /* @__PURE__ */ jsxs58("div", { className: ChatPanel_default.inputRow, children: [
      /* @__PURE__ */ jsx74(
        "textarea",
        {
          ref: inputRef,
          className: ChatPanel_default.input,
          value: inputValue,
          onChange: (e) => {
            setInputValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          },
          onKeyDown: handleKeyDown,
          placeholder: !isConnected ? "Agent not connected" : mode === "demo" ? "Try sending a message\u2026" : "Message agent\u2026",
          disabled: !isConnected,
          rows: 1
        }
      ),
      /* @__PURE__ */ jsx74(
        "button",
        {
          className: ChatPanel_default.sendButton,
          onClick: handleSend,
          disabled: !isConnected || !inputValue.trim(),
          children: "Send"
        }
      )
    ] })
  ] });
}

