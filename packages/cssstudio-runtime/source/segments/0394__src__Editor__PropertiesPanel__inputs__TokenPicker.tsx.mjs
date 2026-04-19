// src/Editor/PropertiesPanel/inputs/TokenPicker.tsx
import { Fragment as Fragment6, jsx as jsx31, jsxs as jsxs20 } from "react/jsx-runtime";
function extractTokenName(value) {
  const match = value.match(/^var\(--(.+?)\)$/);
  return match ? match[1] : null;
}
function TokenPicker({ value, label, indent, tokenType, onSelect, children }) {
  const { designTokens } = useStore2();
  const filteredTokens = useMemo9(() => {
    if (!tokenType || tokenType === "any") return designTokens;
    return designTokens.filter((t) => {
      const c = classifyTokenValue(t.value);
      return c === tokenType || c === "unknown";
    });
  }, [designTokens, tokenType]);
  const [open, setOpen] = useState9(false);
  const [position, setPosition] = useState9({ top: 0, left: 0 });
  const triggerRef = useRef20(null);
  const overlayRef = useRef20(null);
  const tokenName = extractTokenName(value);
  const handleOpen = useCallback18(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuHeight = 200;
      const menuWidth = 220;
      let top = rect.bottom + 4;
      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 4;
      }
      top = Math.max(4, Math.min(top, window.innerHeight - menuHeight - 4));
      const left = Math.max(4, Math.min(rect.left, window.innerWidth - menuWidth - 8));
      setPosition({ top, left });
    }
    setOpen(true);
  }, []);
  const handleSelect = useCallback18(
    (name) => {
      onSelect(`var(--${name})`);
      setOpen(false);
    },
    [onSelect]
  );
  const handleClear = useCallback18(() => {
    const token = designTokens.find((t) => t.name === tokenName);
    onSelect(token?.value ?? "");
  }, [designTokens, tokenName, onSelect]);
  useEffect21(() => {
    if (!open) return;
    const handleClick = (e) => {
      const target = e.composedPath()[0];
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (overlayRef.current?.contains(target)) return;
      setOpen(false);
    };
    const root = triggerRef.current?.getRootNode() ?? document;
    root.addEventListener("pointerdown", handleClick);
    return () => root.removeEventListener("pointerdown", handleClick);
  }, [open]);
  if (tokenName) {
    return /* @__PURE__ */ jsxs20("div", { className: `${inputs_default.row} ${indent ? inputs_default.indent : ""}`, children: [
      /* @__PURE__ */ jsx31("label", { className: inputs_default.label, title: label, children: label }),
      /* @__PURE__ */ jsxs20("div", { className: TokenPicker_default.pill, children: [
        /* @__PURE__ */ jsx31("span", { className: TokenPicker_default.pillIcon, children: /* @__PURE__ */ jsx31(TokenIcon, {}) }),
        /* @__PURE__ */ jsxs20("span", { className: TokenPicker_default.pillName, children: [
          "--",
          tokenName
        ] }),
        /* @__PURE__ */ jsx31("button", { className: TokenPicker_default.pillClear, onClick: handleClear, title: "Remove token", children: /* @__PURE__ */ jsx31(XIcon, { size: 10 }) })
      ] })
    ] });
  }
  if (filteredTokens.length === 0) {
    return /* @__PURE__ */ jsx31(Fragment6, { children });
  }
  return /* @__PURE__ */ jsxs20("div", { className: TokenPicker_default.rowWrapper, children: [
    /* @__PURE__ */ jsx31(
      "button",
      {
        ref: triggerRef,
        className: TokenPicker_default.tokenTrigger,
        onClick: handleOpen,
        title: "Pick variable",
        children: /* @__PURE__ */ jsx31(TokenIcon, {})
      }
    ),
    children,
    open && /* @__PURE__ */ jsx31(
      "div",
      {
        ref: overlayRef,
        className: TokenPicker_default.overlay,
        style: { top: position.top, left: position.left },
        children: filteredTokens.map((token) => /* @__PURE__ */ jsxs20(
          "button",
          {
            className: TokenPicker_default.tokenItem,
            onClick: () => handleSelect(token.name),
            children: [
              isColorValue(token.value) && /* @__PURE__ */ jsx31(
                "span",
                {
                  className: TokenPicker_default.tokenColor,
                  style: { background: token.value }
                }
              ),
              /* @__PURE__ */ jsxs20("span", { className: TokenPicker_default.tokenName, children: [
                "--",
                token.name
              ] }),
              /* @__PURE__ */ jsx31("span", { className: TokenPicker_default.tokenValue, children: token.value })
            ]
          },
          token.name
        ))
      }
    )
  ] });
}

