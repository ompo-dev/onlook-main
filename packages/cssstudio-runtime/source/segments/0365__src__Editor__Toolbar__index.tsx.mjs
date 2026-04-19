// src/Editor/Toolbar/index.tsx
import { Fragment as Fragment5, jsx as jsx20, jsxs as jsxs10 } from "react/jsx-runtime";
var blurFade = {
  initial: { opacity: 0, filter: "blur(2px)" },
  animate: { opacity: 1, filter: "blur(0px)" },
  exit: { opacity: 0, filter: "blur(2px)" },
  transition: { duration: 0.15 },
  style: { display: "flex", alignItems: "center" }
};
var blurScale = {
  ...blurFade,
  initial: { ...blurFade.initial, scale: 0.9 },
  animate: { ...blurFade.animate, scale: 1 },
  exit: { ...blurFade.exit, scale: 0.9 }
};
var COLLAPSED_KEY = "cssstudio-toolbar-collapsed";
function useToolbarCollapsed() {
  const [collapsed, setCollapsed] = useState5(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggle = useCallback12(() => {
    setCollapsed((prev) => {
      const next2 = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next2 ? "1" : "0");
      } catch {
      }
      return next2;
    });
  }, []);
  return [collapsed, toggle];
}
function Toolbar({
  isPicking,
  isDrawing,
  onTogglePicker,
  onToggleDraw,
  onLogin,
  onSendEdit,
  onAnswer,
  onReconnect,
  mode
}) {
  const {
    isAuthenticated,
    isAuthChecking,
    mcpStatus,
    agentPolling,
    autoApply,
    pendingChanges,
    stagedChanges,
    applying,
    panic,
    question,
    clearPendingChanges
  } = useStore2();
  const navigatorOpen = useStore2((s) => s.panels.navigator.open);
  const chatOpen = useStore2((s) => s.panels.navigator.open && s.panels.navigator.activeTab === "chat");
  const togglePanel = useStore2((s) => s.togglePanel);
  const togglePanelTab = useStore2((s) => s.togglePanelTab);
  const [collapsed, toggleCollapsed] = useToolbarCollapsed();
  const [showInstallPopover, setShowInstallPopover] = useState5(false);
  const [showDemoPopover, setShowDemoPopover] = useState5(false);
  const [applied, setApplied] = useState5(false);
  const wasApplyingRef = useRef17(false);
  const cableRef = useRef17(null);
  const applyRef = useRef17(null);
  const isConnected = mcpStatus === "connected";
  const isAgentActive = isConnected && agentPolling || mode === "demo";
  const editVersion = useStore2((s) => s.editVersion);
  const showCopy = !isAuthChecking && (isAuthenticated || mode === "demo");
  const showApply = isAgentActive;
  const copyIsPrimary = showCopy && !showApply;
  const hasChanges = stagedChanges.length > 0;
  const applyDisabled = autoApply || applying || applied || !hasChanges;
  useEffect17(() => {
    if (applying) {
      wasApplyingRef.current = true;
      setApplied(false);
    } else if (wasApplyingRef.current) {
      wasApplyingRef.current = false;
      setApplied(true);
    }
  }, [applying]);
  useEffect17(() => {
    if (hasChanges) setApplied(false);
  }, [hasChanges]);
  useEffect17(() => {
    if (question) setShowInstallPopover(true);
  }, [question]);
  const demoRef = useRef17(null);
  useEffect17(() => {
    const handler = (e) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.code === "Period") {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleCollapsed]);
  return /* @__PURE__ */ jsxs10("div", { "data-cs-toolbar": true, className: `${Toolbar_default.toolbar} ${collapsed ? Toolbar_default.toolbarCollapsed : ""}`, style: mode === "demo" && !collapsed ? { paddingTop: 22 } : void 0, children: [
    !collapsed && /* @__PURE__ */ jsxs10(Fragment5, { children: [
      mode === "demo" && /* @__PURE__ */ jsxs10(Fragment5, { children: [
        /* @__PURE__ */ jsx20(
          "button",
          {
            ref: demoRef,
            className: Toolbar_default.demoStrip,
            onClick: () => setShowDemoPopover((v) => !v),
            children: "Demo"
          }
        ),
        showDemoPopover && /* @__PURE__ */ jsx20(
          DemoPopover,
          {
            anchorRef: demoRef,
            onClose: () => setShowDemoPopover(false)
          }
        )
      ] }),
      /* @__PURE__ */ jsx20(Settings, {}),
      /* @__PURE__ */ jsx20(IconButton, { active: navigatorOpen, onClick: () => togglePanel("navigator"), title: "Toggle Elements panel (\u2325E)", children: /* @__PURE__ */ jsx20("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx20("path", { d: "M4 6h16M4 12h10M4 18h6" }) }) }),
      /* @__PURE__ */ jsx20("div", { className: Toolbar_default.separator }),
      /* @__PURE__ */ jsx20(IconButton, { active: isPicking, onClick: onTogglePicker, title: "Select element (\u2325C)", children: /* @__PURE__ */ jsx20(SelectElementIcon, {}) }),
      /* @__PURE__ */ jsx20(IconButton, { active: isDrawing, onClick: onToggleDraw, title: "Draw element (\u2325F)", children: /* @__PURE__ */ jsx20(DrawElementIcon, {}) }),
      /* @__PURE__ */ jsx20("div", { className: Toolbar_default.separator }),
      false && /* @__PURE__ */ jsxs10("span", { ref: cableRef, className: Toolbar_default.agentStatus, children: [
        /* @__PURE__ */ jsx20(
          IconButton,
          {
            active: chatOpen,
            title: !isAuthenticated ? "Sign in to connect agent" : question ? "Agent has a question \u2014 click to answer" : panic ? "Agent error \u2014 click to view" : isConnected ? "Chat with agent (\u2325T)" : "Agent not connected \u2014 click to install",
            onClick: () => {
              if (!isAuthenticated) {
                onLogin();
                return;
              }
              if (question) {
                setShowInstallPopover((v) => !v);
              } else if (!isAgentActive && !panic) {
                setShowInstallPopover((v) => !v);
              } else {
                togglePanelTab("navigator", "chat");
              }
            },
            children: /* @__PURE__ */ jsx20(AnimatePresence, { mode: "wait", initial: false, children: panic ? /* @__PURE__ */ jsx20(motion.span, { ...blurScale, children: /* @__PURE__ */ jsx20(AlertSmall, { size: 14 }) }, "panic") : question ? /* @__PURE__ */ jsx20(motion.span, { ...blurScale, children: /* @__PURE__ */ jsx20(QuestionSmall, { size: 14 }) }, "question") : /* @__PURE__ */ jsx20(motion.span, { ...blurScale, style: { display: "flex", alignItems: "center", justifyContent: "center", color: !isAgentActive ? "#f59e0b" : void 0 }, children: isAgentActive || mode === "demo" ? /* @__PURE__ */ jsx20(BotIcon, {}) : /* @__PURE__ */ jsx20(CableIcon, {}) }, "default") })
          }
        ),
        showInstallPopover && question && /* @__PURE__ */ jsx20(
          QuestionPopover,
          {
            question,
            anchorRef: cableRef,
            onAnswer: (answer) => {
              onAnswer(answer);
              setShowInstallPopover(false);
            },
            onClose: () => setShowInstallPopover(false)
          }
        ),
        showInstallPopover && !isAgentActive && !panic && !question && /* @__PURE__ */ jsx20(
          InstallPopover,
          {
            anchorRef: cableRef,
            onClose: () => setShowInstallPopover(false),
            onReconnect
          }
        )
      ] }),
      showCopy && /* @__PURE__ */ jsx20(
        CopyPromptButton,
        {
          stagedChanges,
          onCopied: clearPendingChanges,
          mode: copyIsPrimary ? "primary" : void 0,
          muted: !hasChanges || autoApply && isAgentActive,
          isAuthenticated,
          onLogin,
          isDemo: mode === "demo"
        }
      ),
      showApply && /* @__PURE__ */ jsx20("span", { ref: applyRef, style: { display: "flex", position: "relative" }, children: /* @__PURE__ */ jsx20(
        IconButton,
        {
          mode: "primary",
          disabled: mode === "demo" ? !hasChanges : applyDisabled,
          onClick: () => {
            if (mode === "demo") {
              setShowDemoPopover((v) => !v);
            } else {
              onSendEdit();
            }
          },
          title: applying ? "Applying\u2026" : applied ? "Applied" : "Apply changes (\u2318\u21B5)",
          children: /* @__PURE__ */ jsx20(AnimatePresence, { mode: "wait", initial: false, children: applying ? /* @__PURE__ */ jsx20(motion.span, { ...blurFade, children: /* @__PURE__ */ jsx20(ApplySpinnerIcon, {}) }, "spinner") : applied ? /* @__PURE__ */ jsx20(motion.span, { ...blurFade, children: /* @__PURE__ */ jsx20(TickIcon, { delay: 0 }) }, "tick") : /* @__PURE__ */ jsx20(motion.span, { ...blurFade, children: /* @__PURE__ */ jsx20(ApplyIcon, {}) }, "idle") })
        }
      ) }),
      /* @__PURE__ */ jsx20("div", { className: Toolbar_default.separator })
    ] }),
    /* @__PURE__ */ jsx20(
      "button",
      {
        className: Toolbar_default.collapseToggle,
        onClick: toggleCollapsed,
        title: collapsed ? "Expand toolbar (\u2325.)" : "Collapse toolbar (\u2325.)",
        children: /* @__PURE__ */ jsx20("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: collapsed ? /* @__PURE__ */ jsxs10(Fragment5, { children: [
          /* @__PURE__ */ jsx20("path", { d: "m11 17-5-5 5-5" }),
          /* @__PURE__ */ jsx20("path", { d: "m18 17-5-5 5-5" })
        ] }) : /* @__PURE__ */ jsxs10(Fragment5, { children: [
          /* @__PURE__ */ jsx20("path", { d: "m6 17 5-5-5-5" }),
          /* @__PURE__ */ jsx20("path", { d: "m13 17 5-5-5-5" })
        ] }) })
      }
    )
  ] });
}
function CopyPromptButton({ muted, stagedChanges, onCopied, mode, isAuthenticated, onLogin, isDemo }) {
  const [copied, setCopied] = useState5(false);
  function handleCopy() {
    if (!isAuthenticated) {
      onLogin();
      return;
    }
    const prompt = buildCopyPrompt(stagedChanges, { demo: isDemo });
    navigator.clipboard.writeText(prompt).then(() => {
      onCopied();
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    });
  }
  return /* @__PURE__ */ jsx20(
    IconButton,
    {
      mode,
      muted,
      onClick: handleCopy,
      title: !isAuthenticated ? "Sign in to copy prompt" : copied ? "Copied" : "Copy prompt (\u2318\u21E7C)",
      children: /* @__PURE__ */ jsx20(AnimatePresence, { mode: "wait", initial: false, children: copied ? /* @__PURE__ */ jsx20(motion.span, { ...blurFade, children: /* @__PURE__ */ jsx20(TickIcon, { color: "currentColor", delay: 0 }) }, "tick") : /* @__PURE__ */ jsx20(motion.span, { ...blurFade, children: /* @__PURE__ */ jsx20(CopyIcon, {}) }, "copy") })
    }
  );
}
function DemoPopover({ anchorRef, onClose }) {
  return /* @__PURE__ */ jsxs10(Dropdown, { open: true, onClose, anchorRef, width: 320, children: [
    /* @__PURE__ */ jsx20("p", { className: Toolbar_default.demoTitle, children: "Demo mode" }),
    /* @__PURE__ */ jsx20("p", { className: Toolbar_default.demoDescription, children: "In the real product you can use the apply button to send changes to your local AI agent. Or, with auto-apply enabled, changes are sent as you edit." }),
    /* @__PURE__ */ jsx20(
      "a",
      {
        href: "https://cssstudio.ai/learn",
        target: "_blank",
        rel: "noopener noreferrer",
        className: Toolbar_default.demoLink,
        children: "Get started"
      }
    )
  ] });
}

