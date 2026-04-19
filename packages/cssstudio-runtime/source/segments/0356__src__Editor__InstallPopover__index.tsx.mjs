// src/Editor/InstallPopover/index.tsx
import { Fragment as Fragment4, jsx as jsx16, jsxs as jsxs7 } from "react/jsx-runtime";
function InstallPopover({ onClose, onReconnect, anchorRef }) {
  const [phase, setPhase] = useState3("idle");
  const timers = useRef15([]);
  useEffect15(() => () => timers.current.forEach(clearTimeout), []);
  function handleReconnect() {
    setPhase("connecting");
    onReconnect();
    const t1 = setTimeout(() => {
      if (useStore2.getState().mcpStatus === "connected") {
        setPhase("idle");
        return;
      }
      setPhase("failed");
      const t2 = setTimeout(() => setPhase("idle"), 1e3);
      timers.current.push(t2);
    }, 1e3);
    timers.current.push(t1);
  }
  return /* @__PURE__ */ jsxs7(Dropdown, { open: true, onClose, anchorRef, width: 320, children: [
    /* @__PURE__ */ jsx16("p", { className: InstallPopover_default.title, children: "Agent not connected" }),
    /* @__PURE__ */ jsxs7("p", { className: InstallPopover_default.description, children: [
      "Ensure an agent is connected by running ",
      /* @__PURE__ */ jsx16("code", { className: InstallPopover_default.inline, children: "/studio" }),
      "."
    ] }),
    /* @__PURE__ */ jsxs7("p", { className: InstallPopover_default.description, children: [
      "Not installed? Check out the",
      " ",
      /* @__PURE__ */ jsx16("a", { href: "https://cssstudio.ai/learn", target: "_blank", rel: "noopener noreferrer", className: InstallPopover_default.link, children: "installation docs" }),
      "."
    ] }),
    /* @__PURE__ */ jsx16(
      "button",
      {
        className: InstallPopover_default.reconnectButton,
        onClick: handleReconnect,
        disabled: phase !== "idle",
        children: phase === "connecting" ? /* @__PURE__ */ jsxs7(Fragment4, { children: [
          /* @__PURE__ */ jsx16("span", { className: InstallPopover_default.spinner }),
          "Connecting\u2026"
        ] }) : phase === "failed" ? "Reconnection failed" : "Reconnect"
      }
    )
  ] });
}

