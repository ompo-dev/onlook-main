// src/Editor/PropertiesPanel/sections/TransformSection.tsx
import { useState as useState18, useMemo as useMemo15, useCallback as useCallback30 } from "react";
import { Fragment as Fragment18, jsx as jsx49, jsxs as jsxs36 } from "react/jsx-runtime";
var OPTIONAL_PROPS = [
  { key: "skewX", displayName: "Skew X" },
  { key: "skewY", displayName: "Skew Y" },
  { key: "origin", displayName: "Origin" }
];
var ORIGIN_UNITS = [
  { unit: "%", min: -100, max: 200, step: 1, sliderMin: 0, sliderMax: 100 },
  { unit: "px", min: -2e3, max: 2e3, step: 1, sliderMin: -200, sliderMax: 200 }
];
function parseTransformOrigin(value) {
  if (!value || value === "none") return { ox: "50%", oy: "50%" };
  const keywords = {
    left: "0%",
    center: "50%",
    right: "100%",
    top: "0%",
    bottom: "100%"
  };
  const parts = value.trim().split(/\s+/);
  const ox = keywords[parts[0]] ?? parts[0] ?? "50%";
  const oy = keywords[parts[1]] ?? parts[1] ?? "50%";
  return { ox, oy };
}
function TransformSection({ getValue, onChange, onFocus, explicitPropertyNames }) {
  const [addedProps, setAddedProps] = useState18(/* @__PURE__ */ new Set());
  const [menuPos, setMenuPos] = useState18(null);
  const { onRowContextMenu, RowContextMenu } = useRowContextMenu();
  const filter2 = useFilter();
  const f = (name) => matchesFilter(name, filter2);
  const transformValue = getValue("transform");
  const isMatrix = hasMatrixTransform(transformValue);
  const parsed = useMemo15(
    () => isMatrix ? [] : parseTransformFunctions(transformValue),
    [transformValue, isMatrix]
  );
  const { x, y } = useMemo15(() => extractTranslateXY(parsed), [parsed]);
  const rotateValue = extractTransformValue(parsed, "rotate");
  const { sx: scaleXValue, sy: scaleYValue } = useMemo15(() => extractScaleXY(parsed), [parsed]);
  const skewXValue = extractTransformValue(parsed, "skewX");
  const skewYValue = extractTransformValue(parsed, "skewY");
  const showTranslate = true;
  const showRotate = true;
  const showScale = true;
  const showSkewX = !!skewXValue || addedProps.has("skewX");
  const showSkewY = !!skewYValue || addedProps.has("skewY");
  const hasExplicitOrigin = explicitPropertyNames?.has("transform-origin") ?? false;
  const originValue = getValue("transform-origin");
  const { ox: originX, oy: originY } = useMemo15(
    () => hasExplicitOrigin ? parseTransformOrigin(originValue) : { ox: "50%", oy: "50%" },
    [originValue, hasExplicitOrigin]
  );
  const showOrigin = hasExplicitOrigin || addedProps.has("origin");
  const otherFunctions = useMemo15(() => getOtherFunctions(parsed), [parsed]);
  const currentTransform = useMemo15(() => ({
    translateX: x,
    translateY: y,
    rotate: rotateValue,
    scaleX: scaleXValue,
    scaleY: scaleYValue,
    skewX: skewXValue,
    skewY: skewYValue,
    other: otherFunctions
  }), [x, y, rotateValue, scaleXValue, scaleYValue, skewXValue, skewYValue, otherFunctions]);
  const handleChange = useCallback30(
    (key, value) => {
      const next2 = { ...currentTransform };
      switch (key) {
        case "x":
          next2.translateX = value;
          break;
        case "y":
          next2.translateY = value;
          break;
        case "rotate":
          next2.rotate = value;
          break;
        case "scaleX":
          next2.scaleX = value;
          break;
        case "scaleY":
          next2.scaleY = value;
          break;
        case "skewX":
          next2.skewX = value;
          break;
        case "skewY":
          next2.skewY = value;
          break;
      }
      onChange("transform", composeTransform(next2));
    },
    [currentTransform, onChange]
  );
  const handleOriginChange = useCallback30(
    (axis, value) => {
      const newOx = axis === "ox" ? value : originX;
      const newOy = axis === "oy" ? value : originY;
      onChange("transform-origin", `${newOx} ${newOy}`);
    },
    [originX, originY, onChange]
  );
  const handlePlusClick = useCallback30((e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ x: rect.left, y: rect.bottom + 4 });
  }, []);
  const handleRemoveProp = useCallback30(
    (key) => {
      setAddedProps((prev) => {
        const next3 = new Set(prev);
        next3.delete(key);
        return next3;
      });
      if (key === "origin") {
        onChange("transform-origin", "");
        return;
      }
      const next2 = { ...currentTransform };
      switch (key) {
        case "translate":
          next2.translateX = "";
          next2.translateY = "";
          break;
        case "rotate":
          next2.rotate = "";
          break;
        case "scale":
          next2.scaleX = "";
          next2.scaleY = "";
          break;
        case "skewX":
          next2.skewX = "";
          break;
        case "skewY":
          next2.skewY = "";
          break;
      }
      onChange("transform", composeTransform(next2));
    },
    [currentTransform, onChange]
  );
  const addableProps = useMemo15(
    () => OPTIONAL_PROPS.filter((p) => {
      if (p.key === "skewX") return !showSkewX;
      if (p.key === "skewY") return !showSkewY;
      if (p.key === "origin") return !showOrigin;
      return false;
    }),
    [showSkewX, showSkewY, showOrigin]
  );
  if (isMatrix) {
    if (!f("Transform")) return null;
    return /* @__PURE__ */ jsxs36(Section, { title: "Transform", children: [
      /* @__PURE__ */ jsx49("div", { onContextMenu: (e) => onRowContextMenu(e, () => onChange("transform", "")), children: /* @__PURE__ */ jsx49(
        TextInput,
        {
          label: "transform",
          displayName: "Transform",
          value: transformValue,
          onChange: (v) => onChange("transform", v),
          onFocus
        }
      ) }),
      RowContextMenu
    ] });
  }
  const rows = [];
  if (showTranslate && f("X")) {
    rows.push({ name: "X", node: /* @__PURE__ */ jsx49("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProp("translate")), children: /* @__PURE__ */ jsx49(
      NumberInput,
      {
        displayName: "X",
        value: x || "0px",
        units: TRANSLATE_UNITS,
        onChange: (v) => handleChange("x", v),
        onFocus
      }
    ) }, "x") });
  }
  if (showTranslate && f("Y")) {
    rows.push({ name: "Y", node: /* @__PURE__ */ jsx49("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProp("translate")), children: /* @__PURE__ */ jsx49(
      NumberInput,
      {
        displayName: "Y",
        value: y || "0px",
        units: TRANSLATE_UNITS,
        onChange: (v) => handleChange("y", v),
        onFocus
      }
    ) }, "y") });
  }
  if (showRotate && f("Rotate")) {
    rows.push({ name: "Rotate", node: /* @__PURE__ */ jsx49("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProp("rotate")), children: /* @__PURE__ */ jsx49(
      NumberInput,
      {
        displayName: "Rotate",
        value: rotateValue || "0deg",
        min: -360,
        max: 360,
        sliderMin: -180,
        sliderMax: 180,
        step: 1,
        unit: "deg",
        onChange: (v) => handleChange("rotate", v),
        onFocus
      }
    ) }, "rotate") });
  }
  if (showScale && f("Scale X")) {
    rows.push({ name: "Scale X", node: /* @__PURE__ */ jsx49("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProp("scale")), children: /* @__PURE__ */ jsx49(
      NumberInput,
      {
        displayName: "Scale X",
        value: scaleXValue || "1",
        min: 0,
        max: 10,
        sliderMin: 0,
        sliderMax: 3,
        step: 0.01,
        onChange: (v) => handleChange("scaleX", v),
        onFocus
      }
    ) }, "scaleX") });
  }
  if (showScale && f("Scale Y")) {
    rows.push({ name: "Scale Y", node: /* @__PURE__ */ jsx49("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProp("scale")), children: /* @__PURE__ */ jsx49(
      NumberInput,
      {
        displayName: "Scale Y",
        value: scaleYValue || "1",
        min: 0,
        max: 10,
        sliderMin: 0,
        sliderMax: 3,
        step: 0.01,
        onChange: (v) => handleChange("scaleY", v),
        onFocus
      }
    ) }, "scaleY") });
  }
  if (showSkewX && f("Skew X")) {
    rows.push({ name: "Skew X", node: /* @__PURE__ */ jsx49("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProp("skewX")), children: /* @__PURE__ */ jsx49(
      NumberInput,
      {
        displayName: "Skew X",
        value: skewXValue || "0deg",
        min: -89,
        max: 89,
        sliderMin: -45,
        sliderMax: 45,
        step: 1,
        unit: "deg",
        onChange: (v) => handleChange("skewX", v),
        onFocus
      }
    ) }, "skewX") });
  }
  if (showSkewY && f("Skew Y")) {
    rows.push({ name: "Skew Y", node: /* @__PURE__ */ jsx49("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProp("skewY")), children: /* @__PURE__ */ jsx49(
      NumberInput,
      {
        displayName: "Skew Y",
        value: skewYValue || "0deg",
        min: -89,
        max: 89,
        sliderMin: -45,
        sliderMax: 45,
        step: 1,
        unit: "deg",
        onChange: (v) => handleChange("skewY", v),
        onFocus
      }
    ) }, "skewY") });
  }
  if (showOrigin && f("Origin X")) {
    rows.push({ name: "Origin X", node: /* @__PURE__ */ jsx49("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProp("origin")), children: /* @__PURE__ */ jsx49(
      NumberInput,
      {
        displayName: "Origin X",
        value: originX,
        units: ORIGIN_UNITS,
        onChange: (v) => handleOriginChange("ox", v),
        onFocus
      }
    ) }, "originX") });
  }
  if (showOrigin && f("Origin Y")) {
    rows.push({ name: "Origin Y", node: /* @__PURE__ */ jsx49("div", { onContextMenu: (e) => onRowContextMenu(e, () => handleRemoveProp("origin")), children: /* @__PURE__ */ jsx49(
      NumberInput,
      {
        displayName: "Origin Y",
        value: originY,
        units: ORIGIN_UNITS,
        onChange: (v) => handleOriginChange("oy", v),
        onFocus
      }
    ) }, "originY") });
  }
  if (rows.length === 0 && !f("Transform")) return null;
  return /* @__PURE__ */ jsxs36(Fragment18, { children: [
    /* @__PURE__ */ jsx49(Section, { title: "Transform", onAdd: addableProps.length > 0 ? handlePlusClick : void 0, addTitle: "Add transform property", children: rows.map((r) => r.node) }),
    menuPos && /* @__PURE__ */ jsx49(
      ContextMenu,
      {
        x: menuPos.x,
        y: menuPos.y,
        animate: true,
        items: addableProps.map((p) => ({
          label: p.displayName,
          onClick: () => {
            setAddedProps((prev) => new Set(prev).add(p.key));
          }
        })),
        onClose: () => setMenuPos(null)
      }
    ),
    RowContextMenu
  ] });
}

