// src/Editor/AnimationsPanel/KeyframePopover.tsx
import { useState as useState30, useEffect as useEffect37, useRef as useRef38, useCallback as useCallback40 } from "react";
import { jsx as jsx69, jsxs as jsxs53 } from "react/jsx-runtime";
var COLOR_PROPERTIES = /* @__PURE__ */ new Set([
  "color",
  "background-color",
  "border-color",
  "outline-color",
  "fill",
  "stroke",
  "text-decoration-color",
  "column-rule-color",
  "caret-color",
  "accent-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color"
]);
function getInputType(prop) {
  if (COLOR_PROPERTIES.has(prop) || prop.endsWith("-color")) return "color";
  if (prop in STEP_CONFIGS) return "number";
  return "text";
}
function extractBezier3(timingFunction) {
  const named = NAMED_EASINGS[timingFunction];
  if (named) return named;
  const match = timingFunction.match(
    /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/
  );
  if (match) {
    return [
      parseFloat(match[1]),
      parseFloat(match[2]),
      parseFloat(match[3]),
      parseFloat(match[4])
    ];
  }
  return null;
}
function getEasingLabel2(easing, hasSpring) {
  if (hasSpring) return "Spring";
  if (!easing) return "linear";
  if (easing in NAMED_EASINGS) return easing;
  if (easing.startsWith("cubic-bezier")) return "custom";
  return easing;
}
function KeyframePopover({ propertyName, value, offset, easing, springConfig, anchorRect, onChange, onEasingChange, onDelete, onClose }) {
  const ref = useRef38(null);
  const inputType = getInputType(propertyName);
  const config = STEP_CONFIGS[propertyName];
  const domPanelHeight = useStore2((s) => s.dockedClaims.bottom);
  const [easingPopoverOpen, setEasingPopoverOpen] = useState30(false);
  const easingTriggerRef = useRef38(null);
  const easingAnchorRef = useRef38(null);
  const pendingRef = useRef38(null);
  const flushPending = useCallback40(() => {
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    onEasingChange(p.easing, p.spring ?? void 0);
  }, [onEasingChange]);
  const hasSpring = !!springConfig;
  const bezier = !hasSpring && easing ? extractBezier3(easing) : null;
  const easingLabel = getEasingLabel2(easing, hasSpring);
  useEffect37(() => {
    requestAnimationFrame(() => {
      const input = ref.current?.querySelector("input");
      if (input) input.focus();
    });
  }, []);
  useEffect37(() => {
    function handleMouseDown(e) {
      const target = e.composedPath()[0];
      if (target && ref.current && !ref.current.contains(target)) {
        onClose();
      }
    }
    const root = ref.current?.getRootNode() ?? document;
    root.addEventListener("mousedown", handleMouseDown);
    return () => root.removeEventListener("mousedown", handleMouseDown);
  }, [onClose]);
  const popoverWidth = 220;
  const popoverHeight = 120;
  const maxBottom = window.innerHeight - domPanelHeight;
  let top = anchorRect.bottom + 8;
  let isAbove = false;
  if (top + popoverHeight > maxBottom) {
    top = anchorRect.top - popoverHeight - 8;
    isAbove = true;
  }
  const rawLeft = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
  const left = Math.max(8, Math.min(rawLeft, window.innerWidth - popoverWidth - 8));
  const handleEasingTriggerClick = useCallback40(() => {
    if (easingTriggerRef.current) {
      easingAnchorRef.current = easingTriggerRef.current.getBoundingClientRect();
    }
    setEasingPopoverOpen((prev) => !prev);
  }, []);
  const handleEasingTimingChange = useCallback40((value2) => {
    if (!pendingRef.current) {
      pendingRef.current = {};
      queueMicrotask(flushPending);
    }
    pendingRef.current.easing = value2 === "linear" ? void 0 : value2;
  }, [flushPending]);
  const handleSpringConfigChange = useCallback40((config2) => {
    if (!pendingRef.current) {
      pendingRef.current = {};
      queueMicrotask(flushPending);
    }
    pendingRef.current.spring = { ...config2 };
  }, [flushPending]);
  const handleClearSpring = useCallback40(() => {
    if (!pendingRef.current) {
      pendingRef.current = {};
      queueMicrotask(flushPending);
    }
    pendingRef.current.spring = null;
  }, [flushPending]);
  const handleEasingClose = useCallback40(() => {
    setEasingPopoverOpen(false);
  }, []);
  return /* @__PURE__ */ jsxs53(
    "div",
    {
      ref,
      className: AnimationsPanel_default.popover,
      style: { top, left },
      onClick: (e) => e.stopPropagation(),
      onPointerDown: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ jsx69("div", { className: isAbove ? AnimationsPanel_default.popoverArrowBottom : AnimationsPanel_default.popoverArrow }),
        /* @__PURE__ */ jsxs53("div", { className: AnimationsPanel_default.popoverHeader, children: [
          /* @__PURE__ */ jsx69("span", { className: AnimationsPanel_default.popoverProp, children: propertyName }),
          /* @__PURE__ */ jsxs53("span", { className: AnimationsPanel_default.editOffset, children: [
            Math.round(offset * 100),
            "%"
          ] }),
          /* @__PURE__ */ jsx69("button", { className: AnimationsPanel_default.editDelete, onClick: onDelete, title: "Delete keyframe", children: /* @__PURE__ */ jsxs53("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ jsx69("path", { d: "M3 6h18" }),
            /* @__PURE__ */ jsx69("path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }),
            /* @__PURE__ */ jsx69("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs53("div", { className: AnimationsPanel_default.popoverBody, children: [
          inputType === "number" && /* @__PURE__ */ jsx69(
            NumberInput,
            {
              value,
              step: config?.step,
              min: config?.min,
              max: config?.max,
              unit: config?.unit,
              units: config?.units,
              onChange
            }
          ),
          inputType === "color" && /* @__PURE__ */ jsx69(ColorInput, { label: "", value, onChange }),
          inputType === "text" && /* @__PURE__ */ jsx69(PopoverTextInput, { value, onChange })
        ] }),
        /* @__PURE__ */ jsxs53("div", { className: AnimationsPanel_default.popoverEasingRow, children: [
          /* @__PURE__ */ jsx69("span", { className: AnimationsPanel_default.popoverEasingLabel, children: "Easing" }),
          /* @__PURE__ */ jsxs53(
            "button",
            {
              ref: easingTriggerRef,
              className: AnimationsPanel_default.popoverEasingTrigger,
              onClick: handleEasingTriggerClick,
              title: "Edit easing (applies from this keyframe to the next)",
              children: [
                /* @__PURE__ */ jsx69("svg", { className: AnimationsPanel_default.popoverEasingPreview, viewBox: "0 0 24 24", children: hasSpring ? /* @__PURE__ */ jsx69(
                  SpringCurve,
                  {
                    spring: springConfig,
                    width: 24,
                    height: 24,
                    left: 2,
                    top: 2,
                    right: 22,
                    bottom: 22,
                    color: "var(--cs-accent)",
                    pathWidth: 1.5
                  }
                ) : bezier ? /* @__PURE__ */ jsx69(
                  EasingCurve,
                  {
                    curve: bezier,
                    width: 24,
                    height: 24,
                    left: 2,
                    top: 2,
                    right: 22,
                    bottom: 22,
                    color: "var(--cs-accent)",
                    pathWidth: 1.5
                  }
                ) : /* @__PURE__ */ jsx69("line", { x1: "2", y1: "22", x2: "22", y2: "2", stroke: "var(--cs-accent)", strokeWidth: "1.5" }) }),
                /* @__PURE__ */ jsx69("span", { className: AnimationsPanel_default.popoverEasingName, children: easingLabel })
              ]
            }
          )
        ] }),
        easingPopoverOpen && easingAnchorRef.current && /* @__PURE__ */ jsx69(
          EasingPopover,
          {
            anchorRect: easingAnchorRef.current,
            bezier,
            timingFunction: easing || "linear",
            springConfig: springConfig ?? null,
            onTimingChange: handleEasingTimingChange,
            onDurationChange: () => {
            },
            onSpringConfigChange: handleSpringConfigChange,
            onClearSpring: handleClearSpring,
            onClose: handleEasingClose
          }
        )
      ]
    }
  );
}
function PopoverTextInput({ value, onChange }) {
  const [local, setLocal] = useState30(value);
  useEffect37(() => {
    setLocal(value);
  }, [value]);
  const commit = useCallback40(() => {
    if (local !== value) onChange(local);
  }, [local, value, onChange]);
  return /* @__PURE__ */ jsx69(
    "input",
    {
      className: AnimationsPanel_default.popoverTextInput,
      value: local,
      onChange: (e) => setLocal(e.target.value),
      onBlur: commit,
      onKeyDown: (e) => {
        if (e.key === "Enter") commit();
      },
      placeholder: "value",
      autoFocus: true
    }
  );
}

