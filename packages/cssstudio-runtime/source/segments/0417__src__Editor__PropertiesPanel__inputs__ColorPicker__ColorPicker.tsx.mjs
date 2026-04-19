// src/Editor/PropertiesPanel/inputs/ColorPicker/ColorPicker.tsx
import { Fragment as Fragment12, jsx as jsx40, jsxs as jsxs27 } from "react/jsx-runtime";
var supportsEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;
function ColorPicker({
  hsva,
  mode,
  anchorRect,
  onChange,
  onModeChange,
  onCustomChange,
  onClose,
  supportsGradient,
  activeTab = "color",
  onTabChange,
  gradientConfig,
  onGradientChange
}) {
  return /* @__PURE__ */ jsxs27(PopoverPanel, { title: "Color", anchorRect, popoverHeight: 400, onClose, children: [
    supportsGradient && onTabChange && /* @__PURE__ */ jsxs27("div", { className: ColorPicker_default.tabBar, children: [
      /* @__PURE__ */ jsx40(
        "button",
        {
          className: `${ColorPicker_default.tab} ${activeTab === "color" ? ColorPicker_default.active : ""}`,
          onClick: () => onTabChange("color"),
          children: "Color"
        }
      ),
      /* @__PURE__ */ jsx40(
        "button",
        {
          className: `${ColorPicker_default.tab} ${activeTab === "gradient" ? ColorPicker_default.active : ""}`,
          onClick: () => onTabChange("gradient"),
          children: "Gradient"
        }
      )
    ] }),
    activeTab === "gradient" && gradientConfig && onGradientChange ? /* @__PURE__ */ jsx40(
      GradientPicker,
      {
        config: gradientConfig,
        onChange: onGradientChange
      }
    ) : /* @__PURE__ */ jsx40(
      ColorPickerCore,
      {
        hsva,
        mode,
        onChange,
        onModeChange,
        onCustomChange
      }
    )
  ] });
}
function ColorPickerCore({
  hsva,
  mode,
  onChange,
  onModeChange,
  onCustomChange
}) {
  function dragHandlers(map) {
    const handle = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pctX = clamp2((e.clientX - rect.left) / rect.width);
      const pctY = clamp2((e.clientY - rect.top) / rect.height);
      onChange({ ...hsva, ...map(pctX, pctY) });
    };
    return {
      onPointerDown: (e) => {
        handle(e);
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        handle(e);
      }
    };
  }
  const handleEyeDropper = useCallback24(async () => {
    try {
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      const picked = hexToHsva(result.sRGBHex);
      onChange({ ...picked, a: hsva.a });
    } catch {
    }
  }, [hsva.a, onChange]);
  const svDrag = dragHandlers((x, y) => ({ s: x, v: 1 - y }));
  const hueDrag = dragHandlers((x) => ({ h: x * 360 }));
  const alphaDrag = dragHandlers((x) => ({ a: x }));
  const solidHex = hsvaToHex({ ...hsva, a: 1 });
  const thumbRgba = hsvaToRgba(hsva);
  return /* @__PURE__ */ jsxs27(Fragment12, { children: [
    /* @__PURE__ */ jsxs27("div", { className: ColorPicker_default.visualSection, children: [
      /* @__PURE__ */ jsx40(
        "div",
        {
          className: ColorPicker_default.svArea,
          style: { backgroundColor: `hsl(${hsva.h}, 100%, 50%)` },
          ...svDrag,
          children: /* @__PURE__ */ jsx40(
            "div",
            {
              className: ColorPicker_default.thumb,
              style: {
                left: `calc(6px + (100% - 12px) * ${hsva.s})`,
                top: `calc(6px + (100% - 12px) * ${1 - hsva.v})`,
                backgroundColor: `rgb(${thumbRgba.r},${thumbRgba.g},${thumbRgba.b})`
              }
            }
          )
        }
      ),
      /* @__PURE__ */ jsx40(
        "div",
        {
          className: `${ColorPicker_default.sliderTrack} ${ColorPicker_default.hueTrack}`,
          ...hueDrag,
          children: /* @__PURE__ */ jsx40(
            "div",
            {
              className: ColorPicker_default.sliderThumb,
              style: { left: `calc(6px + (100% - 12px) * ${hsva.h / 360})` }
            }
          )
        }
      ),
      /* @__PURE__ */ jsxs27(
        "div",
        {
          className: `${ColorPicker_default.sliderTrack} ${ColorPicker_default.alphaTrack}`,
          ...alphaDrag,
          children: [
            /* @__PURE__ */ jsx40(
              "div",
              {
                className: ColorPicker_default.alphaGradient,
                style: {
                  background: `linear-gradient(to right, transparent, ${solidHex})`
                }
              }
            ),
            /* @__PURE__ */ jsx40(
              "div",
              {
                className: ColorPicker_default.sliderThumb,
                style: { left: `calc(6px + (100% - 12px) * ${hsva.a})` }
              }
            )
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx40(
      ChannelInputs,
      {
        hsva,
        mode,
        onChange,
        onCustomChange
      }
    ),
    /* @__PURE__ */ jsxs27("div", { className: ColorPicker_default.bottomRow, children: [
      /* @__PURE__ */ jsxs27(
        "select",
        {
          className: ColorPicker_default.modeSelect,
          value: mode,
          onChange: (e) => onModeChange(e.target.value),
          children: [
            /* @__PURE__ */ jsx40("option", { value: "rgba", children: "RGB" }),
            /* @__PURE__ */ jsx40("option", { value: "hsla", children: "HSL" }),
            /* @__PURE__ */ jsx40("option", { value: "hex", children: "Hex" }),
            /* @__PURE__ */ jsx40("option", { value: "custom", children: "Custom" })
          ]
        }
      ),
      supportsEyeDropper && /* @__PURE__ */ jsx40(
        "button",
        {
          className: ColorPicker_default.eyedropperButton,
          onClick: handleEyeDropper,
          title: "Pick color from screen",
          children: /* @__PURE__ */ jsxs27(
            "svg",
            {
              width: "16",
              height: "16",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              children: [
                /* @__PURE__ */ jsx40("path", { d: "m2 22 1-1h3l9-9" }),
                /* @__PURE__ */ jsx40("path", { d: "M3 21v-3l9-9" }),
                /* @__PURE__ */ jsx40("path", { d: "m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3L15 6" })
              ]
            }
          )
        }
      )
    ] })
  ] });
}
function ChannelInputs({ hsva, mode, onChange, onCustomChange }) {
  if (mode === "custom") {
    return /* @__PURE__ */ jsx40(CustomInput, { hsva, onChange, onCustomChange });
  }
  if (mode === "hex") {
    return /* @__PURE__ */ jsx40(HexInputs, { hsva, onChange });
  }
  if (mode === "hsla") {
    return /* @__PURE__ */ jsx40(HslaInputs, { hsva, onChange });
  }
  return /* @__PURE__ */ jsx40(RgbaInputs, { hsva, onChange });
}
function RgbaInputs({
  hsva,
  onChange
}) {
  const { r, g, b, a } = hsvaToRgba(hsva);
  const update = useCallback24(
    (channel, raw) => {
      const num = parseInt(raw) || 0;
      if (channel === "a") {
        onChange({ ...hsva, a: clamp2(num / 100) });
      } else {
        const rgba2 = hsvaToRgba(hsva);
        const clamped = Math.max(0, Math.min(255, num));
        const newRgba = { ...rgba2, [channel]: clamped };
        onChange(rgbaToHsva(newRgba.r, newRgba.g, newRgba.b, hsva.a, hsva.h));
      }
    },
    [hsva, onChange]
  );
  return /* @__PURE__ */ jsxs27("div", { className: ColorPicker_default.channelGroup, children: [
    /* @__PURE__ */ jsxs27("div", { className: ColorPicker_default.channelLabels, children: [
      /* @__PURE__ */ jsx40("span", { className: ColorPicker_default.channelLabel, children: "R" }),
      /* @__PURE__ */ jsx40("span", { className: ColorPicker_default.channelLabel, children: "G" }),
      /* @__PURE__ */ jsx40("span", { className: ColorPicker_default.channelLabel, children: "B" }),
      /* @__PURE__ */ jsx40("span", { className: ColorPicker_default.channelLabel, children: "A" })
    ] }),
    /* @__PURE__ */ jsxs27("div", { className: ColorPicker_default.channelRow, children: [
      /* @__PURE__ */ jsx40(ChannelField, { value: r, onCommit: (v) => update("r", v), scrub: { min: 0, max: 255 } }),
      /* @__PURE__ */ jsx40(ChannelField, { value: g, onCommit: (v) => update("g", v), scrub: { min: 0, max: 255 } }),
      /* @__PURE__ */ jsx40(ChannelField, { value: b, onCommit: (v) => update("b", v), scrub: { min: 0, max: 255 } }),
      /* @__PURE__ */ jsx40(
        ChannelField,
        {
          value: `${Math.round(a * 100)}%`,
          onCommit: (v) => update("a", v.replace("%", "")),
          scrub: { min: 0, max: 100, suffix: "%" }
        }
      )
    ] })
  ] });
}
function HslaInputs({
  hsva,
  onChange
}) {
  const { h, s, l, a } = hsvaToHsla(hsva);
  const update = useCallback24(
    (channel, raw) => {
      const num = parseInt(raw) || 0;
      if (channel === "a") {
        onChange({ ...hsva, a: clamp2(num / 100) });
      } else {
        const hsl = hsvaToHsla(hsva);
        const newHsl = { ...hsl, [channel]: num };
        newHsl.h = Math.max(0, Math.min(360, newHsl.h));
        newHsl.s = Math.max(0, Math.min(100, newHsl.s));
        newHsl.l = Math.max(0, Math.min(100, newHsl.l));
        onChange(hslaToHsva(newHsl.h, newHsl.s, newHsl.l, hsva.a));
      }
    },
    [hsva, onChange]
  );
  return /* @__PURE__ */ jsxs27("div", { className: ColorPicker_default.channelGroup, children: [
    /* @__PURE__ */ jsxs27("div", { className: ColorPicker_default.channelLabels, children: [
      /* @__PURE__ */ jsx40("span", { className: ColorPicker_default.channelLabel, children: "H" }),
      /* @__PURE__ */ jsx40("span", { className: ColorPicker_default.channelLabel, children: "S" }),
      /* @__PURE__ */ jsx40("span", { className: ColorPicker_default.channelLabel, children: "L" }),
      /* @__PURE__ */ jsx40("span", { className: ColorPicker_default.channelLabel, children: "A" })
    ] }),
    /* @__PURE__ */ jsxs27("div", { className: ColorPicker_default.channelRow, children: [
      /* @__PURE__ */ jsx40(ChannelField, { value: h, onCommit: (v) => update("h", v), scrub: { min: 0, max: 360 } }),
      /* @__PURE__ */ jsx40(ChannelField, { value: s, onCommit: (v) => update("s", v), scrub: { min: 0, max: 100 } }),
      /* @__PURE__ */ jsx40(ChannelField, { value: l, onCommit: (v) => update("l", v), scrub: { min: 0, max: 100 } }),
      /* @__PURE__ */ jsx40(
        ChannelField,
        {
          value: `${Math.round(a * 100)}%`,
          onCommit: (v) => update("a", v.replace("%", "")),
          scrub: { min: 0, max: 100, suffix: "%" }
        }
      )
    ] })
  ] });
}
function HexInputs({
  hsva,
  onChange
}) {
  const hex2 = hsvaToHex({ ...hsva, a: 1 }).slice(1);
  const commitHex = useCallback24(
    (raw) => {
      const cleaned = raw.replace(/^#/, "");
      if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{4}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(cleaned)) {
        const parsed = hexToHsva("#" + cleaned);
        onChange({ ...parsed, a: hsva.a });
      }
    },
    [hsva.a, onChange]
  );
  const commitAlpha = useCallback24(
    (raw) => {
      const num = parseInt(raw.replace("%", "")) || 0;
      onChange({ ...hsva, a: clamp2(num / 100) });
    },
    [hsva, onChange]
  );
  return /* @__PURE__ */ jsxs27("div", { className: ColorPicker_default.channelGroup, children: [
    /* @__PURE__ */ jsxs27("div", { className: `${ColorPicker_default.channelLabels} ${ColorPicker_default.twoCol}`, children: [
      /* @__PURE__ */ jsx40("span", { className: ColorPicker_default.channelLabel, children: "Hex" }),
      /* @__PURE__ */ jsx40("span", { className: ColorPicker_default.channelLabel, children: "A" })
    ] }),
    /* @__PURE__ */ jsxs27("div", { className: `${ColorPicker_default.channelRow} ${ColorPicker_default.twoCol}`, children: [
      /* @__PURE__ */ jsx40(ChannelField, { value: hex2, onCommit: commitHex }),
      /* @__PURE__ */ jsx40(
        ChannelField,
        {
          value: `${Math.round(hsva.a * 100)}%`,
          onCommit: commitAlpha,
          scrub: { min: 0, max: 100, suffix: "%" }
        }
      )
    ] })
  ] });
}
function CustomInput({
  hsva,
  onChange,
  onCustomChange
}) {
  const [local, setLocal] = useState14(() => formatColor(hsva, "rgba"));
  const isFocusedRef = useRef24(false);
  useEffect25(() => {
    if (isFocusedRef.current) return;
    setLocal(formatColor(hsva, "rgba"));
  }, [hsva]);
  const handleCommit = useCallback24(() => {
    const parsed = parseCssColor(local);
    if (parsed) {
      onChange(parsed);
    } else {
      onCustomChange?.(local);
    }
  }, [local, onChange, onCustomChange]);
  return /* @__PURE__ */ jsx40("div", { className: ColorPicker_default.channelRow, children: /* @__PURE__ */ jsx40(
    "input",
    {
      className: ColorPicker_default.customInput,
      value: local,
      onChange: (e) => setLocal(e.target.value),
      onFocus: () => {
        isFocusedRef.current = true;
      },
      onBlur: () => {
        isFocusedRef.current = false;
        handleCommit();
      },
      onKeyDown: (e) => e.key === "Enter" && handleCommit()
    }
  ) });
}
function ChannelField({
  value,
  onCommit,
  scrub
}) {
  const [local, setLocal] = useState14(String(value));
  const isFocusedRef = useRef24(false);
  const dragRef = useRef24(null);
  useEffect25(() => {
    if (isFocusedRef.current || dragRef.current) return;
    setLocal(String(value));
  }, [value]);
  return /* @__PURE__ */ jsx40(
    "input",
    {
      className: `${ColorPicker_default.channelInput} ${scrub ? ColorPicker_default.scrubbable : ""}`,
      value: local,
      onChange: (e) => setLocal(e.target.value),
      onFocus: () => {
        isFocusedRef.current = true;
      },
      onBlur: () => {
        isFocusedRef.current = false;
        onCommit(local);
      },
      onKeyDown: (e) => {
        if (e.key === "Enter") onCommit(local);
      },
      onPointerDown: scrub ? (e) => {
        if (isFocusedRef.current) return;
        e.preventDefault();
        const numStr = String(value).replace(/[^0-9.\-]/g, "");
        dragRef.current = { startX: e.clientX, startVal: parseFloat(numStr) || 0 };
        e.currentTarget.setPointerCapture(e.pointerId);
        document.body.style.cursor = "ew-resize";
      } : void 0,
      onPointerMove: scrub ? (e) => {
        if (!dragRef.current || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
        const delta = e.clientX - dragRef.current.startX;
        const clamped = Math.round(Math.max(scrub.min, Math.min(scrub.max, dragRef.current.startVal + delta)));
        const formatted = scrub.suffix ? `${clamped}${scrub.suffix}` : String(clamped);
        setLocal(formatted);
        onCommit(formatted);
      } : void 0,
      onPointerUp: scrub ? (e) => {
        document.body.style.cursor = "";
        const drag2 = dragRef.current;
        dragRef.current = null;
        if (!drag2) return;
        if (Math.abs(e.clientX - drag2.startX) < 3) {
          e.currentTarget.focus();
          e.currentTarget.select();
        }
      } : void 0
    }
  );
}
function clamp2(v) {
  return Math.max(0, Math.min(1, v));
}

