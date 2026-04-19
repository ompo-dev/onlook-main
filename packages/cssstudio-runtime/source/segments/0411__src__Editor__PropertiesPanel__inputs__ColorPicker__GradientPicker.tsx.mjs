// src/Editor/PropertiesPanel/inputs/ColorPicker/GradientPicker.tsx
import { Fragment as Fragment11, jsx as jsx38, jsxs as jsxs25 } from "react/jsx-runtime";
function getMaxStopPosition(stops, unit) {
  return unit === "px" ? Math.max(1, ...stops.map((s) => s.position)) : 100;
}
var POS_UNITS = [
  { unit: "%", min: 0, max: 100, step: 1 },
  { unit: "px", min: 0, max: 2e3, step: 1 }
];
var GRADIENT_TYPES = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
  { value: "conic", label: "Conic" }
];
function GradientPicker({ config, onChange }) {
  const selectedStop = config.stops.find(
    (s) => s.id === config.selectedStopId
  );
  const [miniPickerOpen, setMiniPickerOpen] = useState12(false);
  const [stopMode, setStopMode] = useState12("hex");
  const [stopHsva, setStopHsva] = useState12({ h: 0, s: 0, v: 0, a: 1 });
  const stopHueRef = useRef22(0);
  const selectedStopColor = selectedStop?.color;
  const selectedStopId = selectedStop?.id;
  useEffect23(() => {
    if (!selectedStopColor) return;
    const parsed = parseCssColor(selectedStopColor);
    if (!parsed) return;
    if (parsed.s > 0 && parsed.v > 0) stopHueRef.current = parsed.h;
    setStopHsva({
      ...parsed,
      h: parsed.s === 0 || parsed.v === 0 ? stopHueRef.current : parsed.h
    });
  }, [selectedStopId, selectedStopColor]);
  const handleAddStop = useCallback22(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.round(
        (e.clientX - rect.left) / rect.width * 100
      );
      const newStop = {
        id: uid(),
        color: "#808080",
        position: Math.max(0, Math.min(100, pct))
      };
      onChange({
        ...config,
        stops: [...config.stops, newStop],
        selectedStopId: newStop.id
      });
    },
    [config, onChange]
  );
  const handleSelectStop = useCallback22(
    (id3) => {
      onChange({ ...config, selectedStopId: id3 });
      setMiniPickerOpen(false);
    },
    [config, onChange]
  );
  const handleStopDrag = useCallback22(
    (id3, position) => {
      onChange({
        ...config,
        stops: config.stops.map(
          (s) => s.id === id3 ? { ...s, position: Math.max(0, Math.min(100, position)) } : s
        )
      });
    },
    [config, onChange]
  );
  const handleStopColorChange = useCallback22(
    (id3, color2) => {
      onChange({
        ...config,
        stops: config.stops.map(
          (s) => s.id === id3 ? { ...s, color: color2 } : s
        )
      });
    },
    [config, onChange]
  );
  const handleDeleteStop = useCallback22(
    (id3) => {
      if (config.stops.length <= 2) return;
      const newStops = config.stops.filter((s) => s.id !== id3);
      onChange({
        ...config,
        stops: newStops,
        selectedStopId: config.selectedStopId === id3 ? newStops[0]?.id ?? null : config.selectedStopId
      });
      setMiniPickerOpen(false);
    },
    [config, onChange]
  );
  const handleTypeChange = useCallback22(
    (type) => {
      onChange({ ...config, type });
    },
    [config, onChange]
  );
  const handleRepeatToggle = useCallback22(
    (repeating) => {
      if (repeating) {
        const size = 20;
        onChange({
          ...config,
          repeating,
          stopUnit: "px",
          stops: config.stops.map((s) => ({
            ...s,
            position: Math.round(s.position / 100 * size)
          }))
        });
      } else {
        const maxPos2 = Math.max(1, ...config.stops.map((s) => s.position));
        onChange({
          ...config,
          repeating,
          stopUnit: "%",
          stops: config.stops.map((s) => ({
            ...s,
            position: Math.round(s.position / maxPos2 * 100)
          }))
        });
      }
    },
    [config, onChange]
  );
  const repeatSize = useMemo11(() => {
    if (!config.repeating) return 0;
    return Math.max(1, ...config.stops.map((s) => s.position));
  }, [config.repeating, config.stops]);
  const handleRepeatSizeChange = useCallback22(
    (raw) => {
      const newSize = Math.max(1, parseInt(raw) || 1);
      const oldSize = repeatSize;
      if (oldSize === 0) return;
      onChange({
        ...config,
        stops: config.stops.map((s) => ({
          ...s,
          position: Math.round(s.position / oldSize * newSize)
        }))
      });
    },
    [config, onChange, repeatSize]
  );
  const handleAngleChange = useCallback22(
    (raw) => {
      const num = parseInt(raw) || 0;
      onChange({ ...config, angle: num });
    },
    [config, onChange]
  );
  const handleShapeChange = useCallback22(
    (shape) => {
      onChange({ ...config, shape });
    },
    [config, onChange]
  );
  const handlePosXChange = useCallback22(
    (raw) => {
      onChange({ ...config, posX: raw });
    },
    [config, onChange]
  );
  const handlePosYChange = useCallback22(
    (raw) => {
      onChange({ ...config, posY: raw });
    },
    [config, onChange]
  );
  const handlePositionChange = useCallback22(
    (id3, raw) => {
      const num = parseInt(raw.replace(/[%px]/g, "")) || 0;
      const max = config.stopUnit === "px" ? 9999 : 100;
      const clamped = Math.max(0, Math.min(max, num));
      onChange({
        ...config,
        stops: config.stops.map(
          (s) => s.id === id3 ? { ...s, position: clamped } : s
        )
      });
    },
    [config, onChange]
  );
  const handleStopHsvaChange = useCallback22(
    (newHsva) => {
      if (!selectedStop) return;
      if (newHsva.s > 0 && newHsva.v > 0) stopHueRef.current = newHsva.h;
      setStopHsva(newHsva);
      const { r, g, b, a } = hsvaToRgba(newHsva);
      const color2 = a < 1 ? `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})` : hsvaToHex(newHsva);
      handleStopColorChange(selectedStop.id, color2);
    },
    [selectedStop, handleStopColorChange]
  );
  const handleSwatchClick = useCallback22(() => {
    setMiniPickerOpen((prev) => !prev);
  }, []);
  const sortedStops = [...config.stops].sort((a, b) => a.position - b.position);
  const maxPos = getMaxStopPosition(config.stops, config.stopUnit ?? "%");
  const stopPreviewCss = `linear-gradient(to right, ${sortedStops.map((s) => `${s.color} ${s.position / maxPos * 100}%`).join(", ")})`;
  return /* @__PURE__ */ jsxs25("div", { className: GradientPicker_default.gradientPicker, children: [
    /* @__PURE__ */ jsxs25("div", { children: [
      /* @__PURE__ */ jsxs25("div", { className: GradientPicker_default.previewWrapper, children: [
        /* @__PURE__ */ jsx38("div", { className: GradientPicker_default.previewCheckerboard }),
        /* @__PURE__ */ jsx38(
          "div",
          {
            className: GradientPicker_default.previewGradient,
            style: { backgroundImage: stopPreviewCss },
            onClick: handleAddStop
          }
        )
      ] }),
      /* @__PURE__ */ jsx38(
        StopBar,
        {
          stops: config.stops,
          selectedId: config.selectedStopId,
          stopUnit: config.stopUnit ?? "%",
          onSelect: handleSelectStop,
          onDrag: handleStopDrag,
          onDelete: handleDeleteStop
        }
      )
    ] }),
    selectedStop && /* @__PURE__ */ jsxs25("div", { className: GradientPicker_default.stopEditor, children: [
      /* @__PURE__ */ jsxs25("div", { className: GradientPicker_default.stopColorRow, children: [
        /* @__PURE__ */ jsx38(
          StopSwatch,
          {
            color: selectedStop.color,
            onClick: handleSwatchClick
          }
        ),
        /* @__PURE__ */ jsx38(
          StopColorField,
          {
            color: selectedStop.color,
            onChange: (c) => handleStopColorChange(selectedStop.id, c)
          }
        ),
        /* @__PURE__ */ jsx38(
          PositionField,
          {
            position: selectedStop.position,
            unit: config.stopUnit ?? "%",
            onChange: (raw) => handlePositionChange(selectedStop.id, raw)
          }
        ),
        config.stops.length > 2 && /* @__PURE__ */ jsx38(
          "button",
          {
            className: GradientPicker_default.deleteStopButton,
            onClick: () => handleDeleteStop(selectedStop.id),
            title: "Remove stop",
            children: /* @__PURE__ */ jsx38(XIcon, { size: 10 })
          }
        )
      ] }),
      miniPickerOpen && /* @__PURE__ */ jsx38(
        ColorPickerCore,
        {
          hsva: stopHsva,
          mode: stopMode,
          onChange: handleStopHsvaChange,
          onModeChange: setStopMode
        }
      )
    ] }),
    miniPickerOpen && /* @__PURE__ */ jsx38("div", { className: GradientPicker_default.divider }),
    /* @__PURE__ */ jsxs25("div", { className: GradientPicker_default.typeRow, children: [
      /* @__PURE__ */ jsx38(
        "select",
        {
          className: GradientPicker_default.typeSelect,
          value: config.type,
          onChange: (e) => handleTypeChange(e.target.value),
          children: GRADIENT_TYPES.map((t) => /* @__PURE__ */ jsx38("option", { value: t.value, children: t.label }, t.value))
        }
      ),
      /* @__PURE__ */ jsxs25("label", { className: GradientPicker_default.repeatLabel, children: [
        /* @__PURE__ */ jsx38("span", { children: "Repeat" }),
        /* @__PURE__ */ jsx38(Toggle, { value: config.repeating, onChange: handleRepeatToggle })
      ] })
    ] }),
    config.repeating && /* @__PURE__ */ jsx38(
      NumberInput,
      {
        displayName: "Size",
        value: `${repeatSize}px`,
        min: 1,
        max: 2e3,
        sliderMin: 1,
        sliderMax: 200,
        step: 1,
        unit: "px",
        onChange: handleRepeatSizeChange
      }
    ),
    (config.type === "linear" || config.type === "conic") && /* @__PURE__ */ jsx38(
      NumberInput,
      {
        displayName: "Angle",
        value: `${config.angle}deg`,
        min: 0,
        max: 360,
        step: 1,
        unit: "deg",
        onChange: handleAngleChange
      }
    ),
    config.type === "radial" && /* @__PURE__ */ jsxs25(Fragment11, { children: [
      /* @__PURE__ */ jsxs25(
        "select",
        {
          className: GradientPicker_default.typeSelect,
          value: config.shape.startsWith("circle") ? "circle" : "ellipse",
          onChange: (e) => handleShapeChange(e.target.value),
          children: [
            /* @__PURE__ */ jsx38("option", { value: "circle", children: "Circle" }),
            /* @__PURE__ */ jsx38("option", { value: "ellipse", children: "Ellipse" })
          ]
        }
      ),
      /* @__PURE__ */ jsx38(
        NumberInput,
        {
          displayName: "X",
          value: config.posX ?? "50%",
          units: POS_UNITS,
          onChange: handlePosXChange
        }
      ),
      /* @__PURE__ */ jsx38(
        NumberInput,
        {
          displayName: "Y",
          value: config.posY ?? "50%",
          units: POS_UNITS,
          onChange: handlePosYChange
        }
      )
    ] })
  ] });
}
function StopBar({
  stops,
  selectedId,
  stopUnit,
  onSelect,
  onDrag,
  onDelete
}) {
  const barRef = useRef22(null);
  const draggingRef = useRef22(null);
  const maxPos = getMaxStopPosition(stops, stopUnit);
  const handlePointerDown = useCallback22(
    (e, id3) => {
      e.preventDefault();
      onSelect(id3);
      draggingRef.current = id3;
      e.target.setPointerCapture(e.pointerId);
    },
    [onSelect]
  );
  const handlePointerMove = useCallback22(
    (e) => {
      if (!draggingRef.current || !barRef.current) return;
      if (!e.target.hasPointerCapture(e.pointerId))
        return;
      const rect = barRef.current.getBoundingClientRect();
      const pos = Math.round(
        (e.clientX - rect.left) / rect.width * maxPos
      );
      onDrag(draggingRef.current, pos);
    },
    [onDrag]
  );
  const handlePointerUp = useCallback22(() => {
    draggingRef.current = null;
  }, []);
  return /* @__PURE__ */ jsx38(
    "div",
    {
      ref: barRef,
      className: GradientPicker_default.stopBar,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      children: stops.map((stop) => /* @__PURE__ */ jsx38(
        "div",
        {
          className: `${GradientPicker_default.stopThumb} ${stop.id === selectedId ? GradientPicker_default.selected : ""}`,
          style: {
            left: `${stop.position / maxPos * 100}%`,
            backgroundColor: stop.color
          },
          onPointerDown: (e) => handlePointerDown(e, stop.id),
          onDoubleClick: () => onDelete(stop.id)
        },
        stop.id
      ))
    }
  );
}
function StopSwatch({
  color: color2,
  onClick
}) {
  const isParseable = parseCssColor(color2) !== null;
  return /* @__PURE__ */ jsx38("button", { className: GradientPicker_default.stopSwatch, onClick, children: /* @__PURE__ */ jsx38(
    "span",
    {
      className: GradientPicker_default.stopSwatchColor,
      style: {
        backgroundColor: isParseable ? color2 : "transparent"
      }
    }
  ) });
}
function StopColorField({
  color: color2,
  onChange
}) {
  const [local, setLocal] = useState12(color2);
  const isFocusedRef = useRef22(false);
  useEffect23(() => {
    if (isFocusedRef.current) return;
    setLocal(color2);
  }, [color2]);
  return /* @__PURE__ */ jsx38(
    "input",
    {
      className: GradientPicker_default.stopColorInput,
      value: local,
      onChange: (e) => setLocal(e.target.value),
      onFocus: () => {
        isFocusedRef.current = true;
      },
      onBlur: () => {
        isFocusedRef.current = false;
        onChange(local);
      },
      onKeyDown: (e) => {
        if (e.key === "Enter") onChange(local);
      }
    }
  );
}
function PositionField({
  position,
  unit,
  onChange
}) {
  const [local, setLocal] = useState12(`${Math.round(position)}${unit}`);
  const isFocusedRef = useRef22(false);
  useEffect23(() => {
    if (isFocusedRef.current) return;
    setLocal(`${Math.round(position)}${unit}`);
  }, [position, unit]);
  return /* @__PURE__ */ jsx38(
    "input",
    {
      className: GradientPicker_default.positionInput,
      value: local,
      onChange: (e) => setLocal(e.target.value),
      onFocus: () => {
        isFocusedRef.current = true;
      },
      onBlur: () => {
        isFocusedRef.current = false;
        onChange(local);
      },
      onKeyDown: (e) => {
        if (e.key === "Enter") onChange(local);
      }
    }
  );
}

