// src/Editor/state/visual-controls.ts
var vcRoot = null;
function setVisualControlRoot(root) {
  vcRoot = root;
}
var vcState = {
  activeControls: [],
  element: null,
  computedStyles: null,
  theme: {},
  onStyleChange: null,
  running: false,
  transformContainer: null
};
var controlFactories = [
  createGapHandler,
  createPaddingHandler,
  createBorderRadiusHandler,
  createRotateHandler,
  createScaleHandler,
  createViewTimelineOverlay
];
function activateControls(element, computedStyles, theme, onStyleChange) {
  deactivateControls();
  vcState.element = element;
  vcState.computedStyles = computedStyles;
  vcState.theme = theme;
  vcState.onStyleChange = onStyleChange || null;
  const ctx = buildContext();
  if (!ctx) return;
  for (const factory of controlFactories) {
    const control = factory();
    if (control.shouldActivate(ctx)) {
      control.create(ctx);
      vcState.activeControls.push(control);
    }
  }
  if (vcState.activeControls.length > 0) {
    vcState.running = true;
    frame.read(tick, true);
  }
}
function deactivateControls() {
  if (vcState.running) {
    cancelFrame(tick);
    vcState.running = false;
  }
  for (const control of vcState.activeControls) control.destroy();
  vcState.activeControls = [];
  vcState.element = null;
  vcState.computedStyles = null;
  vcState.onStyleChange = null;
  if (vcState.transformContainer) {
    vcState.transformContainer.remove();
    vcState.transformContainer = null;
  }
}
function suspendControls() {
  if (vcState.running) {
    cancelFrame(tick);
    vcState.running = false;
  }
  const root = vcRoot || document.documentElement;
  for (const el of root.querySelectorAll("[data-cs-visual-control]")) {
    ;
    el.style.visibility = "hidden";
  }
}
function resumeControls() {
  const root = vcRoot || document.documentElement;
  for (const el of root.querySelectorAll("[data-cs-visual-control]")) {
    ;
    el.style.visibility = "";
  }
  if (vcState.element && !vcState.running) {
    vcState.running = true;
    frame.read(tick, true);
  }
}
function refreshControls(computedStyles, theme) {
  if (!vcState.element) return;
  vcState.computedStyles = computedStyles;
  if (theme) vcState.theme = theme;
  const ctx = buildContext();
  if (!ctx) return;
  const shouldCount = controlFactories.reduce((n, f) => n + (f().shouldActivate(ctx) ? 1 : 0), 0);
  if (shouldCount !== vcState.activeControls.length) {
    const cb = vcState.onStyleChange;
    activateControls(vcState.element, computedStyles, vcState.theme, cb || void 0);
    return;
  }
  for (const control of vcState.activeControls) control.tick(ctx);
}
function isVisualControlElement(el) {
  return el.hasAttribute("data-cs-visual-control");
}
function tick() {
  const ctx = buildContext();
  if (!ctx) return;
  if (vcState.transformContainer) syncTransformContainer(ctx);
  for (const control of vcState.activeControls) control.tick(ctx);
}
function buildContext() {
  if (!vcState.element || !vcState.element.isConnected || !vcState.computedStyles) return null;
  const quad = getElementQuad(vcState.element);
  return {
    element: vcState.element,
    rect: vcState.element.getBoundingClientRect(),
    quad,
    computedStyles: vcState.computedStyles,
    theme: vcState.theme,
    onStyleChange: vcState.onStyleChange
  };
}
function getTransformContainer(ctx) {
  if (!vcState.transformContainer) {
    vcState.transformContainer = document.createElement("div");
    vcState.transformContainer.setAttribute("data-cs-visual-control", "transform-root");
    vcState.transformContainer.style.cssText = "position:fixed;pointer-events:none;z-index:1;box-sizing:border-box;";
    const appendTarget = vcRoot || document.documentElement;
    appendTarget.appendChild(vcState.transformContainer);
  }
  syncTransformContainer(ctx);
  return vcState.transformContainer;
}
function syncTransformContainer(ctx) {
  const tc = vcState.transformContainer;
  if (!tc) return;
  const q = ctx.quad;
  tc.style.top = q.untransformedY + "px";
  tc.style.left = q.untransformedX + "px";
  tc.style.width = q.width + "px";
  tc.style.height = q.height + "px";
  if (q.hasTransform) {
    tc.style.transform = q.cssTransform;
    tc.style.transformOrigin = "0 0";
  } else {
    tc.style.transform = "";
    tc.style.transformOrigin = "";
  }
}
function inverseLabelTransform(ctx, baseTransform = "") {
  const q = ctx.quad;
  if (!q.hasTransform) return baseTransform;
  const angle = getMatrixRotation(q.matrix);
  const inv = `scale(${1 / q.scaleX},${1 / q.scaleY}) rotate(${-angle}deg)`;
  return baseTransform ? `${baseTransform} ${inv}` : inv;
}
function inverseGripScale(ctx) {
  const q = ctx.quad;
  if (!q.hasTransform) return "";
  return `scale(${1 / q.scaleX},${1 / q.scaleY})`;
}
function setGripBaseTransform(grip, base) {
  grip.dataset.baseTransform = base;
  grip.style.transform = base;
}
function getGripBaseTransform(grip) {
  return grip.dataset.baseTransform || "";
}
function gripHoverTransform(grip) {
  const base = getGripBaseTransform(grip);
  return base ? `${base} scale(1.3)` : "scale(1.3)";
}
function gripDragTransform(grip) {
  const base = getGripBaseTransform(grip);
  return base ? `${base} scale(1.3)` : "scale(1.3)";
}
function refreshLabelTransforms(ctx, indicators) {
  for (const ind of indicators) {
    const base = ind.label.dataset.baseTransform || "";
    const next2 = inverseLabelTransform(ctx, base);
    if (ind.label.style.transform !== next2) {
      ind.label.style.transform = next2;
    }
  }
}
function refreshGripTransforms(ctx, indicators) {
  const inv = inverseGripScale(ctx);
  for (const ind of indicators) {
    const current3 = getGripBaseTransform(ind.grip);
    if (current3 !== inv) {
      setGripBaseTransform(ind.grip, inv);
    }
  }
}
function hexToRgba(hex2, alpha2) {
  const r = parseInt(hex2.slice(1, 3), 16);
  const g = parseInt(hex2.slice(3, 5), 16);
  const b = parseInt(hex2.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha2})`;
}
var GAP_COLOR = "#8df0cc";
var PADDING_COLOR = "#b08df0";
function themeAccent(ctx) {
  return ctx.theme.accent || GAP_COLOR;
}
function createDragIndicator(name, color2, ctx, skipHover = false, appendTo) {
  const container = document.createElement("div");
  container.setAttribute("data-cs-visual-control", name);
  const positionType = appendTo ? "absolute" : "fixed";
  container.style.cssText = `position:${positionType};pointer-events:none;z-index:1;display:none;box-sizing:border-box;`;
  const line = document.createElement("div");
  line.setAttribute("data-cs-visual-control", `${name}-line`);
  line.style.cssText = `position:absolute;inset:0;background:${hexToRgba(color2, 0.08)};border-radius:2px;box-sizing:border-box;pointer-events:none;opacity:0;transition:opacity 0.15s;`;
  container.appendChild(line);
  const hitArea = document.createElement("div");
  hitArea.setAttribute("data-cs-visual-control", `${name}-handle`);
  hitArea.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:24px;height:24px;pointer-events:auto;display:flex;align-items:center;justify-content:center;`;
  container.appendChild(hitArea);
  const grip = document.createElement("div");
  grip.setAttribute("data-cs-visual-control", `${name}-grip`);
  grip.style.cssText = `border-radius:2px;transition:transform 0.15s,filter 0.15s;`;
  hitArea.appendChild(grip);
  const t = ctx.theme;
  const label = document.createElement("div");
  label.setAttribute("data-cs-visual-control", `${name}-tooltip`);
  label.style.cssText = `position:absolute;padding:2px 6px;border-radius:4px;font-size:10px;font-family:monospace;white-space:nowrap;background:${t.layer || "#1a1a28"};color:${color2};border:1px solid ${t.border || "rgba(255,255,255,0.10)"};z-index:1;pointer-events:none;opacity:0;transition:opacity 0.15s;`;
  container.appendChild(label);
  if (!skipHover) setupHoverFeedback(hitArea, line, label, grip);
  const appendTarget = appendTo || vcRoot || document.documentElement;
  appendTarget.appendChild(container);
  return { container, line, hitArea, grip, label };
}
function setupHoverFeedback(hitArea, line, label, grip, baseTransform = "") {
  hitArea.addEventListener("mouseenter", () => {
    line.style.opacity = "1";
    label.style.opacity = "1";
    const base = getGripBaseTransform(grip) || baseTransform;
    grip.style.transform = base + " scale(1.3)";
    grip.style.filter = "brightness(1.5)";
  });
  hitArea.addEventListener("mouseleave", () => {
    if (hitArea.dataset.dragging) return;
    line.style.opacity = "0";
    label.style.opacity = "0";
    grip.style.transform = getGripBaseTransform(grip) || baseTransform;
    grip.style.filter = "";
  });
}
function startDrag(target, line, label, grip, e, cursor, baseTransform = "") {
  target.setPointerCapture(e.pointerId);
  target.dataset.dragging = "1";
  line.style.opacity = "1";
  label.style.opacity = "1";
  const base = getGripBaseTransform(grip) || baseTransform;
  grip.style.transform = base + " scale(1.3)";
  grip.style.filter = "brightness(1.8)";
  document.documentElement.style.cursor = cursor;
  document.documentElement.style.userSelect = "none";
}
function endDrag(target, line, label, grip, e, onMove, onUp, baseTransform = "") {
  target.releasePointerCapture(e.pointerId);
  delete target.dataset.dragging;
  document.documentElement.style.cursor = "";
  document.documentElement.style.userSelect = "";
  target.removeEventListener("pointermove", onMove);
  target.removeEventListener("pointerup", onUp);
  target.removeEventListener("lostpointercapture", onUp);
  line.style.opacity = "0";
  label.style.opacity = "0";
  grip.style.transform = getGripBaseTransform(grip) || baseTransform;
  grip.style.filter = "";
}
function setDotGrip(gs, color2, isVertical, clampDim) {
  const dot = `radial-gradient(circle at center, ${color2} 1.5px, transparent 1.5px)`;
  const fill = color2 + "20";
  if (isVertical) {
    const w = Math.max(Math.min(8, clampDim - 2), 4);
    gs.width = w + "px";
    gs.height = "16px";
    gs.background = `${dot} 50% 2px/3px 3px no-repeat,${dot} 50% 50%/3px 3px no-repeat,${dot} 50% calc(100% - 2px)/3px 3px no-repeat,${fill}`;
  } else {
    const h = Math.max(Math.min(8, clampDim - 2), 4);
    gs.width = "16px";
    gs.height = h + "px";
    gs.background = `${dot} 2px 50%/3px 3px no-repeat,${dot} 50% 50%/3px 3px no-repeat,${dot} calc(100% - 2px) 50%/3px 3px no-repeat,${fill}`;
  }
}
function serializeRects(positions) {
  let s = "";
  for (const p of positions) s += `${p.top | 0},${p.left | 0},${p.width | 0},${p.height | 0};`;
  return s;
}
function getEl() {
  return vcState.element;
}
function createGapHandler() {
  let indicators = [];
  let prevKey = "";
  function shouldActivate(ctx) {
    if (ctx.quad.width < 50 || ctx.quad.height < 50) return false;
    const d = ctx.computedStyles.display;
    return d === "flex" || d === "inline-flex";
  }
  function create2(ctx) {
    destroy();
    const positions = computeGapPositions(ctx);
    prevKey = serializeRects(positions);
    syncIndicators(positions, ctx);
  }
  function tick2(ctx) {
    const positions = computeGapPositions(ctx);
    const key = serializeRects(positions);
    if (key !== prevKey) {
      prevKey = key;
      frame.render(() => syncIndicators(positions, ctx));
    }
    refreshGripTransforms(ctx, indicators);
    refreshLabelTransforms(ctx, indicators);
  }
  function destroy() {
    for (const ind of indicators) ind.container.remove();
    indicators = [];
    prevKey = "";
  }
  function setupGroupHover(ind) {
    ind.hitArea.addEventListener("mouseenter", () => {
      for (const sibling of indicators) {
        sibling.line.style.opacity = "1";
        sibling.grip.style.transform = gripHoverTransform(sibling.grip);
        sibling.grip.style.filter = "brightness(1.5)";
      }
      ind.label.style.opacity = "1";
    });
    ind.hitArea.addEventListener("mouseleave", () => {
      if (indicators.some((s) => s.hitArea.dataset.dragging)) return;
      for (const sibling of indicators) {
        sibling.line.style.opacity = "0";
        sibling.grip.style.transform = getGripBaseTransform(sibling.grip);
        sibling.grip.style.filter = "";
      }
      ind.label.style.opacity = "0";
    });
  }
  function syncIndicators(positions, ctx) {
    const tc = getTransformContainer(ctx);
    while (indicators.length < positions.length) {
      const ind = createDragIndicator("gap", themeAccent(ctx), ctx, true, tc);
      setupGroupHover(ind);
      setupGapDrag(ind, () => indicators);
      indicators.push(ind);
    }
    while (indicators.length > positions.length) indicators.pop().container.remove();
    const cs = getComputedStyle(ctx.element);
    const gapValue = (cs.gap || cs.rowGap || "0px") === "0px" ? "0" : cs.gap || cs.rowGap;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const ind = indicators[i];
      const s = ind.container.style;
      s.display = "block";
      s.top = pos.top + "px";
      s.left = pos.left + "px";
      s.width = pos.width + "px";
      s.height = pos.height + "px";
      const ls = ind.line.style;
      if (pos.isVertical) {
        ls.borderLeft = `1px dashed ${hexToRgba(themeAccent(ctx), 0.4)}`;
        ls.borderTop = "none";
      } else {
        ls.borderTop = `1px dashed ${hexToRgba(themeAccent(ctx), 0.4)}`;
        ls.borderLeft = "none";
      }
      setDotGrip(ind.grip.style, themeAccent(ctx), pos.isVertical, pos.isVertical ? pos.width : pos.height);
      ind.hitArea.style.cursor = pos.isVertical ? "col-resize" : "row-resize";
      ind.hitArea.dataset.vertical = pos.isVertical ? "1" : "0";
      ind.label.textContent = gapValue;
      const base = pos.isVertical ? "translate(-50%,-100%)" : "translate(-100%,-50%)";
      ind.label.dataset.baseTransform = base;
      if (pos.isVertical) {
        ind.label.style.left = "50%";
        ind.label.style.top = "-6px";
      } else {
        ind.label.style.top = "50%";
        ind.label.style.left = "-6px";
      }
      ind.label.style.transform = inverseLabelTransform(ctx, base);
      setGripBaseTransform(ind.grip, inverseGripScale(ctx));
    }
  }
  return { shouldActivate, create: create2, tick: tick2, destroy };
}
function computeGapPositions(ctx) {
  const el = ctx.element;
  const cs = getComputedStyle(el);
  const isRow = (cs.flexDirection || "row").startsWith("row");
  const q = ctx.quad;
  const children = [];
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    if (isVisualControlElement(child)) continue;
    const childCs = getComputedStyle(child);
    if (childCs.display === "none" || childCs.position === "absolute" || childCs.position === "fixed") continue;
    children.push(child);
  }
  if (children.length < 2) return [];
  const rects = children.map((c) => {
    if (q.hasTransform && c.offsetParent === el) {
      return new DOMRect(c.offsetLeft, c.offsetTop, c.offsetWidth, c.offsetHeight);
    }
    const r = c.getBoundingClientRect();
    return new DOMRect(r.left - ctx.rect.left, r.top - ctx.rect.top, r.width, r.height);
  });
  const lines = groupIntoLines(rects, isRow, cs.flexWrap !== "nowrap");
  const positions = [];
  for (const line of lines) {
    const sorted = [...line].sort((a, b) => isRow ? a.left - b.left : a.top - b.top);
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i], next2 = sorted[i + 1];
      if (isRow) {
        positions.push({ top: 0, left: curr.right, width: Math.max(next2.left - curr.right, 2), height: q.height, isVertical: true });
      } else {
        positions.push({ top: curr.bottom, left: 0, width: q.width, height: Math.max(next2.top - curr.bottom, 2), isVertical: false });
      }
    }
  }
  return positions;
}
function groupIntoLines(rects, isRow, canWrap) {
  if (!canWrap || rects.length === 0) return [rects];
  const sorted = [...rects].sort((a, b) => isRow ? a.top !== b.top ? a.top - b.top : a.left - b.left : a.left !== b.left ? a.left - b.left : a.top - b.top);
  const lines = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const r = sorted[i], prev = lines[lines.length - 1][0];
    const same = isRow ? r.top < prev.bottom && r.bottom > prev.top : r.left < prev.right && r.right > prev.left;
    if (same) lines[lines.length - 1].push(r);
    else lines.push([r]);
  }
  return lines;
}
function setupGapDrag(ind, getSiblings) {
  let startX = 0, startY = 0, startGap = 0, isVertical = false;
  let invMatrix = new DOMMatrix();
  function onDown(e) {
    e.stopPropagation();
    e.preventDefault();
    const el = getEl();
    if (!el) return;
    isVertical = ind.hitArea.dataset.vertical === "1";
    startX = e.clientX;
    startY = e.clientY;
    startGap = parseFloat(getComputedStyle(el).gap) || 0;
    const ctx = buildContext();
    invMatrix = ctx?.quad.inverseMatrix || new DOMMatrix();
    startDrag(ind.hitArea, ind.line, ind.label, ind.grip, e, isVertical ? "col-resize" : "row-resize");
    if (getSiblings) {
      for (const sibling of getSiblings()) {
        if (sibling === ind) continue;
        sibling.line.style.opacity = "1";
        sibling.grip.style.transform = gripDragTransform(sibling.grip);
        sibling.grip.style.filter = "brightness(1.8)";
      }
    }
    ind.hitArea.addEventListener("pointermove", onMove);
    ind.hitArea.addEventListener("pointerup", onUp);
    ind.hitArea.addEventListener("lostpointercapture", onUp);
  }
  function onMove(e) {
    const el = getEl();
    if (!el) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    const localDx = invMatrix.a * dx + invMatrix.c * dy;
    const localDy = invMatrix.b * dx + invMatrix.d * dy;
    const delta = isVertical ? localDx : localDy;
    const val = Math.max(0, Math.round(startGap + delta)) + "px";
    el.style.gap = val;
    ind.label.textContent = val;
    if (vcState.onStyleChange) vcState.onStyleChange("gap", val);
  }
  function onUp(e) {
    const el = getEl();
    endDrag(ind.hitArea, ind.line, ind.label, ind.grip, e, onMove, onUp);
    if (getSiblings) {
      for (const sibling of getSiblings()) {
        if (sibling === ind) continue;
        sibling.line.style.opacity = "0";
        sibling.grip.style.transform = getGripBaseTransform(sibling.grip);
        sibling.grip.style.filter = "";
      }
    }
    if (el && vcState.onStyleChange) vcState.onStyleChange("gap", el.style.gap);
  }
  ind.hitArea.addEventListener("pointerdown", onDown);
}
var OPPOSITE_SIDE = { top: "bottom", bottom: "top", left: "right", right: "left" };
function createPaddingHandler() {
  let indicators = [];
  let prevKey = "";
  function shouldActivate(ctx) {
    return ctx.quad.width >= 50 && ctx.quad.height >= 50;
  }
  function create2(ctx) {
    destroy();
    const positions = computePaddingPositions(ctx);
    prevKey = serializeRects(positions);
    syncIndicators(positions, ctx);
  }
  function tick2(ctx) {
    const positions = computePaddingPositions(ctx);
    const key = serializeRects(positions);
    if (key !== prevKey) {
      prevKey = key;
      frame.render(() => syncIndicators(positions, ctx));
    }
    refreshGripTransforms(ctx, indicators);
    refreshLabelTransforms(ctx, indicators);
  }
  function destroy() {
    for (const ind of indicators) ind.container.remove();
    indicators = [];
    prevKey = "";
  }
  function setupGroupHover(ind) {
    ind.hitArea.addEventListener("mouseenter", () => {
      for (const sibling of indicators) {
        sibling.line.style.opacity = "1";
        sibling.grip.style.transform = gripHoverTransform(sibling.grip);
        sibling.grip.style.filter = "brightness(1.5)";
      }
      ind.label.style.opacity = "1";
    });
    ind.hitArea.addEventListener("mouseleave", () => {
      if (indicators.some((s) => s.hitArea.dataset.dragging)) return;
      for (const sibling of indicators) {
        sibling.line.style.opacity = "0";
        sibling.grip.style.transform = getGripBaseTransform(sibling.grip);
        sibling.grip.style.filter = "";
      }
      ind.label.style.opacity = "0";
    });
  }
  function syncIndicators(positions, ctx) {
    const tc = getTransformContainer(ctx);
    while (indicators.length < positions.length) {
      const ind = createDragIndicator("padding", PADDING_COLOR, ctx, true, tc);
      ind.side = "top";
      setupGroupHover(ind);
      setupPaddingDrag(ind, () => indicators);
      indicators.push(ind);
    }
    while (indicators.length > positions.length) indicators.pop().container.remove();
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i], ind = indicators[i];
      ind.side = pos.side;
      const s = ind.container.style;
      s.display = "block";
      s.top = pos.top + "px";
      s.left = pos.left + "px";
      s.width = pos.width + "px";
      s.height = pos.height + "px";
      const ls = ind.line.style;
      ls.borderTop = "none";
      ls.borderRight = "none";
      ls.borderBottom = "none";
      ls.borderLeft = "none";
      const border = `1px dashed ${hexToRgba(PADDING_COLOR, 0.4)}`;
      if (pos.side === "top") ls.borderBottom = border;
      else if (pos.side === "bottom") ls.borderTop = border;
      else if (pos.side === "left") ls.borderRight = border;
      else ls.borderLeft = border;
      const isH = pos.side === "top" || pos.side === "bottom";
      setDotGrip(ind.grip.style, PADDING_COLOR, !isH, isH ? pos.height : pos.width);
      ind.hitArea.style.cursor = isH ? "ns-resize" : "ew-resize";
      ind.hitArea.dataset.side = pos.side;
      ind.label.textContent = pos.value;
      const base = pos.side === "top" ? "translate(-50%,100%)" : pos.side === "bottom" ? "translate(-50%,-100%)" : pos.side === "left" ? "translate(100%,-50%)" : "translate(-100%,-50%)";
      ind.label.dataset.baseTransform = base;
      if (pos.side === "top") {
        ind.label.style.left = "50%";
        ind.label.style.bottom = "-6px";
        ind.label.style.top = "";
      } else if (pos.side === "bottom") {
        ind.label.style.left = "50%";
        ind.label.style.top = "-6px";
        ind.label.style.bottom = "";
      } else if (pos.side === "left") {
        ind.label.style.top = "50%";
        ind.label.style.right = "-6px";
        ind.label.style.left = "";
        ind.label.style.bottom = "";
      } else {
        ind.label.style.top = "50%";
        ind.label.style.left = "-6px";
        ind.label.style.right = "";
        ind.label.style.bottom = "";
      }
      ind.label.style.transform = inverseLabelTransform(ctx, base);
      setGripBaseTransform(ind.grip, inverseGripScale(ctx));
    }
  }
  return { shouldActivate, create: create2, tick: tick2, destroy };
}
function computePaddingPositions(ctx) {
  const q = ctx.quad;
  const cs = getComputedStyle(ctx.element);
  const pt = parseFloat(cs.paddingTop) || 0, pr = parseFloat(cs.paddingRight) || 0;
  const pb = parseFloat(cs.paddingBottom) || 0, pl = parseFloat(cs.paddingLeft) || 0;
  return [
    { top: 0, left: 0, width: q.width, height: Math.max(pt, 2), side: "top", value: cs.paddingTop },
    { top: q.height - Math.max(pb, 2), left: 0, width: q.width, height: Math.max(pb, 2), side: "bottom", value: cs.paddingBottom },
    { top: pt, left: 0, width: Math.max(pl, 2), height: q.height - pt - pb, side: "left", value: cs.paddingLeft },
    { top: pt, left: q.width - Math.max(pr, 2), width: Math.max(pr, 2), height: q.height - pt - pb, side: "right", value: cs.paddingRight }
  ];
}
function setupPaddingDrag(ind, getSiblings) {
  let startX = 0, startY = 0, startVal = 0, side = "top", axisInSync = true;
  let invMatrix = new DOMMatrix();
  function onDown(e) {
    e.stopPropagation();
    e.preventDefault();
    const el = getEl();
    if (!el) return;
    side = ind.hitArea.dataset.side || "top";
    const isV = side === "top" || side === "bottom";
    startX = e.clientX;
    startY = e.clientY;
    const cs = getComputedStyle(el);
    startVal = parseFloat(cs.getPropertyValue(`padding-${side}`)) || 0;
    axisInSync = true;
    const ctx = buildContext();
    invMatrix = ctx?.quad.inverseMatrix || new DOMMatrix();
    startDrag(ind.hitArea, ind.line, ind.label, ind.grip, e, isV ? "ns-resize" : "ew-resize");
    if (getSiblings) {
      for (const sibling of getSiblings()) {
        if (sibling === ind) continue;
        sibling.line.style.opacity = "1";
        sibling.grip.style.transform = gripDragTransform(sibling.grip);
        sibling.grip.style.filter = "brightness(1.8)";
      }
    }
    ind.hitArea.addEventListener("pointermove", onMove);
    ind.hitArea.addEventListener("pointerup", onUp);
    ind.hitArea.addEventListener("lostpointercapture", onUp);
  }
  function onMove(e) {
    const el = getEl();
    if (!el) return;
    const isV = side === "top" || side === "bottom";
    const sign = side === "bottom" || side === "right" ? -1 : 1;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    const localDx = invMatrix.a * dx + invMatrix.c * dy;
    const localDy = invMatrix.b * dx + invMatrix.d * dy;
    const delta = isV ? localDy : localDx;
    const val = Math.max(0, Math.round(startVal + delta * sign)) + "px";
    const prop = `padding-${side}`;
    el.style.setProperty(prop, val);
    if (vcState.onStyleChange) vcState.onStyleChange(prop, val);
    if (!e.shiftKey && axisInSync) {
      const opp = `padding-${OPPOSITE_SIDE[side]}`;
      el.style.setProperty(opp, val);
      if (vcState.onStyleChange) vcState.onStyleChange(opp, val);
    }
    ind.label.textContent = val;
  }
  function onUp(e) {
    const el = getEl();
    endDrag(ind.hitArea, ind.line, ind.label, ind.grip, e, onMove, onUp);
    if (getSiblings) {
      for (const sibling of getSiblings()) {
        if (sibling === ind) continue;
        sibling.line.style.opacity = "0";
        sibling.grip.style.transform = getGripBaseTransform(sibling.grip);
        sibling.grip.style.filter = "";
      }
    }
    if (el && vcState.onStyleChange) {
      const v = el.style.getPropertyValue(`padding-${side}`);
      if (v) vcState.onStyleChange(`padding-${side}`, v);
    }
  }
  ind.hitArea.addEventListener("pointerdown", onDown);
}
function createBorderRadiusHandler() {
  let ind = null;
  function shouldActivate(ctx) {
    if (ctx.quad.width < 50 || ctx.quad.height < 50) return false;
    const cs = getComputedStyle(ctx.element);
    const bg = cs.backgroundColor;
    if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent") return false;
    const tl = cs.borderTopLeftRadius;
    return tl === cs.borderTopRightRadius && tl === cs.borderBottomRightRadius && tl === cs.borderBottomLeftRadius;
  }
  function create2(ctx) {
    destroy();
    ind = createRadiusElement(ctx);
    positionRadius(ctx);
  }
  function tick2(ctx) {
    positionRadius(ctx);
  }
  function destroy() {
    if (ind) {
      ind.container.remove();
      ind = null;
    }
  }
  function positionRadius(ctx) {
    if (!ind) return;
    const q = ctx.quad;
    const radius = parseFloat(getComputedStyle(ctx.element).borderTopLeftRadius) || 0;
    const offset = Math.max(radius, 8);
    const tc = getTransformContainer(ctx);
    if (ind.container.parentElement !== tc) tc.appendChild(ind.container);
    ind.container.style.display = "block";
    ind.container.style.position = "absolute";
    ind.container.style.top = offset + "px";
    ind.container.style.left = offset + "px";
    ind.container.style.width = "1px";
    ind.container.style.height = "1px";
    const a = ind.arc.style;
    a.width = radius * 2 + "px";
    a.height = radius * 2 + "px";
    a.top = -offset + "px";
    a.left = -offset + "px";
    a.borderRadius = `0 0 ${radius}px 0`;
    ind.label.textContent = radius === 0 ? "0" : Math.round(radius) + "px";
    const invTransform = inverseLabelTransform(ctx, "translate(-50%,-50%)");
    if (ctx.quad.hasTransform) ind.label.style.transform = invTransform;
  }
  return { shouldActivate, create: create2, tick: tick2, destroy };
}
function createRadiusElement(ctx) {
  const color2 = themeAccent(ctx);
  const container = document.createElement("div");
  container.setAttribute("data-cs-visual-control", "radius");
  container.style.cssText = `position:fixed;pointer-events:none;z-index:3;display:none;overflow:visible;`;
  const arc = document.createElement("div");
  arc.style.cssText = "display:none;";
  const handle = document.createElement("div");
  handle.setAttribute("data-cs-visual-control", "radius-handle");
  handle.style.cssText = `position:absolute;width:12px;height:12px;border-radius:50%;background:${hexToRgba(color2, 0.25)};pointer-events:auto;cursor:nwse-resize;transform:translate(-50%,-50%);transition:transform 0.15s,filter 0.15s;`;
  const inner = document.createElement("div");
  inner.style.cssText = `position:absolute;top:50%;left:50%;width:4px;height:4px;border-radius:50%;background:${color2};transform:translate(-50%,-50%);`;
  handle.appendChild(inner);
  container.appendChild(handle);
  const t = ctx.theme;
  const label = document.createElement("div");
  label.setAttribute("data-cs-visual-control", "radius-tooltip");
  label.style.cssText = `position:absolute;left:12px;top:-6px;padding:2px 6px;border-radius:4px;font-size:10px;font-family:monospace;white-space:nowrap;background:${t.layer || "#1a1a28"};color:${color2};border:1px solid ${t.border || "rgba(255,255,255,0.10)"};z-index:1;pointer-events:none;opacity:0;transition:opacity 0.15s;`;
  container.appendChild(label);
  setupHoverFeedback(handle, arc, label, handle, "translate(-50%,-50%)");
  setupRadiusDrag(handle, arc, label);
  const appendTarget = vcRoot || document.documentElement;
  appendTarget.appendChild(container);
  return { container, handle, arc, label };
}
function setupRadiusDrag(handle, arc, label) {
  function onDown(e) {
    e.stopPropagation();
    e.preventDefault();
    const el = getEl();
    if (!el) return;
    handle.setPointerCapture(e.pointerId);
    handle.dataset.dragging = "1";
    arc.style.opacity = "1";
    label.style.opacity = "1";
    handle.style.transform = "translate(-50%,-50%) scale(1.3)";
    handle.style.filter = "brightness(1.8)";
    document.documentElement.style.cursor = "nwse-resize";
    document.documentElement.style.userSelect = "none";
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("lostpointercapture", onUp);
  }
  function onMove(e) {
    const el = getEl();
    if (!el) return;
    const ctx = buildContext();
    const q = ctx?.quad;
    let localX, localY, w, h;
    if (q && q.hasTransform) {
      const local = q.inverseMatrix.transformPoint(new DOMPoint(e.clientX, e.clientY));
      localX = local.x;
      localY = local.y;
      w = q.width;
      h = q.height;
    } else {
      const rect = el.getBoundingClientRect();
      localX = e.clientX - rect.left;
      localY = e.clientY - rect.top;
      w = rect.width;
      h = rect.height;
    }
    if (localX < 0 || localX > w || localY < 0 || localY > h) return;
    const dist = Math.hypot(localX, localY);
    const maxR = Math.min(w, h) / 2;
    const val = Math.max(0, Math.min(maxR, Math.round(dist))) + "px";
    el.style.borderRadius = val;
    label.textContent = val;
    if (vcState.onStyleChange) vcState.onStyleChange("border-radius", val);
  }
  function onUp(e) {
    const el = getEl();
    handle.releasePointerCapture(e.pointerId);
    delete handle.dataset.dragging;
    document.documentElement.style.cursor = "";
    document.documentElement.style.userSelect = "";
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onUp);
    handle.removeEventListener("lostpointercapture", onUp);
    if (el && vcState.onStyleChange) vcState.onStyleChange("border-radius", el.style.borderRadius);
    arc.style.opacity = "0";
    label.style.opacity = "0";
    handle.style.transform = "translate(-50%,-50%)";
    handle.style.filter = "";
  }
  handle.addEventListener("pointerdown", onDown);
}
function setTransformParts(updates) {
  const el = getEl();
  if (!el) return;
  const fns = parseTransformFunctions(el.style.transform);
  const { x, y } = extractTranslateXY(fns);
  const { sx, sy } = extractScaleXY(fns);
  const composed = composeTransform({
    translateX: x,
    translateY: y,
    rotate: updates.rotate ?? extractTransformValue(fns, "rotate"),
    scaleX: updates.scaleX ?? sx,
    scaleY: updates.scaleY ?? sy,
    skewX: extractTransformValue(fns, "skewX"),
    skewY: extractTransformValue(fns, "skewY"),
    other: getOtherFunctions(fns)
  });
  el.style.transform = composed;
  if (vcState.onStyleChange) vcState.onStyleChange("transform", composed);
}
var ROTATE_CURSOR = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none'><path d='M12 21a9 9 0 0 1 0-18c2.52 0 4.93 1 6.74 2.74L21 8' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'/><path d='M21 3v5h-5' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'/><path d='M12 21a9 9 0 0 1 0-18c2.52 0 4.93 1 6.74 2.74L21 8' stroke='%231a1a1a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M21 3v5h-5' stroke='%231a1a1a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>") 9 9, grab`;
function createRotateHandler() {
  let wrapper = null;
  let hitArea = null;
  function shouldActivate(ctx) {
    return ctx.quad.width >= 50 && ctx.quad.height >= 50;
  }
  function create2(ctx) {
    destroy();
    const tc = getTransformContainer(ctx);
    wrapper = document.createElement("div");
    wrapper.setAttribute("data-cs-visual-control", "rotate");
    wrapper.style.cssText = `position:absolute;top:-12px;left:-12px;width:1px;height:1px;overflow:visible;pointer-events:none;z-index:2;`;
    hitArea = document.createElement("div");
    hitArea.setAttribute("data-cs-visual-control", "rotate-handle");
    hitArea.style.cssText = `position:absolute;width:24px;height:24px;pointer-events:auto;cursor:${ROTATE_CURSOR};transform:translate(-50%,-50%);`;
    wrapper.appendChild(hitArea);
    tc.appendChild(wrapper);
    setupRotateDrag(hitArea);
    syncPosition(ctx);
  }
  function tick2(ctx) {
    syncPosition(ctx);
  }
  function destroy() {
    if (wrapper) {
      wrapper.remove();
      wrapper = null;
      hitArea = null;
    }
  }
  function syncPosition(ctx) {
    if (!wrapper) return;
    const q = ctx.quad;
    if (q.hasTransform) {
      wrapper.style.transform = `scale(${1 / q.scaleX},${1 / q.scaleY})`;
    } else {
      wrapper.style.transform = "";
    }
  }
  return { shouldActivate, create: create2, tick: tick2, destroy };
}
function setupRotateDrag(zone) {
  let startAngle = 0, startRotation = 0;
  function angle(cx, cy, ex, ey) {
    return Math.atan2(ey - cy, ex - cx) * (180 / Math.PI);
  }
  function currentRotation() {
    const el = getEl();
    if (!el) return 0;
    const t = getComputedStyle(el).transform;
    if (!t || t === "none") return 0;
    const m2 = t.match(/matrix\((.+)\)/);
    if (!m2) return 0;
    const v = m2[1].split(",").map(Number);
    return Math.atan2(v[1], v[0]) * (180 / Math.PI);
  }
  function onDown(e) {
    e.stopPropagation();
    e.preventDefault();
    const el = getEl();
    if (!el) return;
    zone.setPointerCapture(e.pointerId);
    zone.dataset.dragging = "1";
    const ctx = buildContext();
    const q = ctx?.quad;
    const cx = q ? (q.corners[0].x + q.corners[2].x) / 2 : 0;
    const cy = q ? (q.corners[0].y + q.corners[2].y) / 2 : 0;
    startAngle = angle(cx, cy, e.clientX, e.clientY);
    startRotation = currentRotation();
    document.documentElement.style.cursor = ROTATE_CURSOR;
    document.documentElement.style.userSelect = "none";
    zone.addEventListener("pointermove", onMove);
    zone.addEventListener("pointerup", onUp);
    zone.addEventListener("lostpointercapture", onUp);
  }
  function onMove(e) {
    const el = getEl();
    if (!el) return;
    const ctx = buildContext();
    const q = ctx?.quad;
    const cx = q ? (q.corners[0].x + q.corners[2].x) / 2 : 0;
    const cy = q ? (q.corners[0].y + q.corners[2].y) / 2 : 0;
    let rot = startRotation + (angle(cx, cy, e.clientX, e.clientY) - startAngle);
    if (e.shiftKey) rot = Math.round(rot / 45) * 45;
    setTransformParts({ rotate: `${Math.round(rot)}deg` });
  }
  function onUp(e) {
    zone.releasePointerCapture(e.pointerId);
    delete zone.dataset.dragging;
    document.documentElement.style.cursor = "";
    document.documentElement.style.userSelect = "";
    zone.removeEventListener("pointermove", onMove);
    zone.removeEventListener("pointerup", onUp);
    zone.removeEventListener("lostpointercapture", onUp);
    const el = getEl();
    if (el && vcState.onStyleChange) vcState.onStyleChange("transform", el.style.transform);
  }
  zone.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    e.preventDefault();
    setTransformParts({ rotate: "0deg" });
  });
  zone.addEventListener("pointerdown", onDown);
}
function createScaleHandler() {
  let wrapper = null;
  let hitArea = null;
  function shouldActivate(ctx) {
    return ctx.quad.width >= 50 && ctx.quad.height >= 50;
  }
  function create2(ctx) {
    destroy();
    const color2 = themeAccent(ctx);
    const tc = getTransformContainer(ctx);
    const q = ctx.quad;
    const oX = q.hasTransform ? 14 / q.scaleX : 14;
    const oY = q.hasTransform ? 14 / q.scaleY : 14;
    wrapper = document.createElement("div");
    wrapper.setAttribute("data-cs-visual-control", "scale");
    wrapper.style.cssText = `position:absolute;width:1px;height:1px;overflow:visible;pointer-events:none;z-index:2;top:${q.height - oY}px;left:${q.width - oX}px;`;
    hitArea = document.createElement("div");
    hitArea.setAttribute("data-cs-visual-control", "scale-handle");
    hitArea.style.cssText = "position:absolute;width:28px;height:28px;pointer-events:auto;cursor:nwse-resize;display:flex;align-items:center;justify-content:center;border-radius:4px;transform:translate(-50%,-50%);";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "12");
    svg.setAttribute("height", "12");
    svg.setAttribute("viewBox", "0 0 8 8");
    svg.style.cssText = "opacity:0.8;transition:opacity 0.15s;pointer-events:none;";
    svg.innerHTML = `<line x1="1" y1="7" x2="7" y2="1" stroke="${color2}" stroke-width="1" stroke-linecap="round"/><line x1="3.5" y1="7" x2="7" y2="3.5" stroke="${color2}" stroke-width="1" stroke-linecap="round"/><line x1="6" y1="7" x2="7" y2="6" stroke="${color2}" stroke-width="1" stroke-linecap="round"/>`;
    hitArea.appendChild(svg);
    wrapper.appendChild(hitArea);
    tc.appendChild(wrapper);
    const ha = hitArea;
    ha.addEventListener("mouseenter", () => {
      svg.style.opacity = "1";
    });
    ha.addEventListener("mouseleave", () => {
      if (!ha.dataset.dragging) svg.style.opacity = "0.8";
    });
    setupScaleDrag(ha, svg);
    syncPosition(ctx);
  }
  function tick2(ctx) {
    syncPosition(ctx);
  }
  function destroy() {
    if (wrapper) {
      wrapper.remove();
      wrapper = null;
      hitArea = null;
    }
  }
  function syncPosition(ctx) {
    if (!wrapper) return;
    const q = ctx.quad;
    const oX = q.hasTransform ? 14 / q.scaleX : 14;
    const oY = q.hasTransform ? 14 / q.scaleY : 14;
    wrapper.style.top = q.height - oY + "px";
    wrapper.style.left = q.width - oX + "px";
    if (q.hasTransform) {
      wrapper.style.transform = `scale(${1 / q.scaleX},${1 / q.scaleY})`;
    } else {
      wrapper.style.transform = "";
    }
  }
  return { shouldActivate, create: create2, tick: tick2, destroy };
}
function setupScaleDrag(zone, svg) {
  let startDist = 0;
  let startX = 0, startY = 0;
  let startSx = 1, startSy = 1;
  function currentScaleXY() {
    const el = getEl();
    if (!el) return { sx: 1, sy: 1 };
    const t = getComputedStyle(el).transform;
    if (!t || t === "none") return { sx: 1, sy: 1 };
    const m2 = t.match(/matrix\((.+)\)/);
    if (!m2) return { sx: 1, sy: 1 };
    const v = m2[1].split(",").map(Number);
    return {
      sx: Math.sqrt(v[0] * v[0] + v[1] * v[1]),
      sy: Math.sqrt(v[2] * v[2] + v[3] * v[3])
    };
  }
  function onDown(e) {
    e.stopPropagation();
    e.preventDefault();
    const el = getEl();
    if (!el) return;
    zone.setPointerCapture(e.pointerId);
    zone.dataset.dragging = "1";
    svg.style.opacity = "1";
    const ctx = buildContext();
    const q = ctx?.quad;
    const cx = q ? (q.corners[0].x + q.corners[2].x) / 2 : 0;
    const cy = q ? (q.corners[0].y + q.corners[2].y) / 2 : 0;
    startX = e.clientX;
    startY = e.clientY;
    startDist = Math.hypot(e.clientX - cx, e.clientY - cy);
    const scales = currentScaleXY();
    startSx = scales.sx;
    startSy = scales.sy;
    document.documentElement.style.cursor = "nwse-resize";
    document.documentElement.style.userSelect = "none";
    zone.addEventListener("pointermove", onMove);
    zone.addEventListener("pointerup", onUp);
    zone.addEventListener("lostpointercapture", onUp);
  }
  function onMove(e) {
    const el = getEl();
    if (!el) return;
    if (startDist === 0) return;
    const ctx = buildContext();
    const q = ctx?.quad;
    const cx = q ? (q.corners[0].x + q.corners[2].x) / 2 : 0;
    const cy = q ? (q.corners[0].y + q.corners[2].y) / 2 : 0;
    if (e.shiftKey) {
      let localMx, localMy, localStartX, localStartY;
      if (q && q.hasTransform) {
        const lm = q.inverseMatrix.transformPoint(new DOMPoint(e.clientX, e.clientY));
        const ls = q.inverseMatrix.transformPoint(new DOMPoint(startX, startY));
        const lc = q.inverseMatrix.transformPoint(new DOMPoint(cx, cy));
        localMx = Math.abs(lm.x - lc.x);
        localMy = Math.abs(lm.y - lc.y);
        localStartX = Math.abs(ls.x - lc.x);
        localStartY = Math.abs(ls.y - lc.y);
      } else {
        localMx = Math.abs(e.clientX - cx);
        localMy = Math.abs(e.clientY - cy);
        localStartX = Math.abs(startX - cx);
        localStartY = Math.abs(startY - cy);
      }
      let sx = localStartX > 1 ? startSx * (localMx / localStartX) : startSx;
      let sy = localStartY > 1 ? startSy * (localMy / localStartY) : startSy;
      sx = Math.max(0.1, Math.round(sx * 100) / 100);
      sy = Math.max(0.1, Math.round(sy * 100) / 100);
      setTransformParts({ scaleX: String(sx), scaleY: String(sy) });
    } else {
      const curDist = Math.hypot(e.clientX - cx, e.clientY - cy);
      let s = startSx * (curDist / startDist);
      s = Math.max(0.1, Math.round(s * 100) / 100);
      setTransformParts({ scaleX: String(s), scaleY: String(s) });
    }
  }
  function onUp(e) {
    zone.releasePointerCapture(e.pointerId);
    delete zone.dataset.dragging;
    svg.style.opacity = "0.8";
    document.documentElement.style.cursor = "";
    document.documentElement.style.userSelect = "";
    zone.removeEventListener("pointermove", onMove);
    zone.removeEventListener("pointerup", onUp);
    zone.removeEventListener("lostpointercapture", onUp);
    const el = getEl();
    if (el && vcState.onStyleChange) vcState.onStyleChange("transform", el.style.transform);
  }
  zone.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    e.preventDefault();
    setTransformParts({ scaleX: "1", scaleY: "1" });
  });
  zone.addEventListener("pointerdown", onDown);
}
var VIEW_INSET_COLOR = "#a78bfa";
function createViewTimelineOverlay() {
  let startContainer = null;
  let startLabel = null;
  let endContainer = null;
  let endLabel = null;
  let progressLine = null;
  let progressLabel = null;
  let scrollHandler = null;
  let scrollTarget = null;
  function getLayoutRect(el) {
    const htmlEl = el;
    let top = htmlEl.offsetTop;
    let left = htmlEl.offsetLeft;
    let parent = htmlEl.offsetParent;
    while (parent) {
      top += parent.offsetTop + parent.clientTop - parent.scrollTop;
      left += parent.offsetLeft + parent.clientLeft - parent.scrollLeft;
      parent = parent.offsetParent;
    }
    top -= window.scrollY;
    left -= window.scrollX;
    return new DOMRect(left, top, htmlEl.offsetWidth, htmlEl.offsetHeight);
  }
  function shouldActivate() {
    const s = useStore2.getState();
    return s.animTimeline === "view";
  }
  function makeLineContainer() {
    const container = document.createElement("div");
    container.setAttribute("data-cs-visual-control", "view-range");
    container.style.cssText = `
            position: fixed; left: 0; right: 0; height: 0; pointer-events: none; z-index: 5;
            border-top: 1px dashed ${hexToRgba(VIEW_INSET_COLOR, 0.4)};
            transition: border-color 0.15s;
        `;
    return container;
  }
  function makeHitArea() {
    const hit = document.createElement("div");
    hit.setAttribute("data-cs-visual-control", "view-range-handle");
    hit.style.cssText = `
            position: absolute; left: 0; right: 0; top: -8px; height: 16px;
            pointer-events: auto; cursor: row-resize;
        `;
    return hit;
  }
  function makeLabel(text) {
    const label = document.createElement("div");
    label.setAttribute("data-cs-visual-control", "view-range-label");
    label.style.cssText = `
            position: absolute; left: 12px; top: 4px;
            padding: 2px 6px; border-radius: 4px;
            font-size: 10px; font-family: monospace; white-space: nowrap;
            background: rgba(26,26,40,0.9); color: ${VIEW_INSET_COLOR};
            border: 1px solid rgba(255,255,255,0.10);
            pointer-events: none; opacity: 0; transition: opacity 0.15s;
        `;
    label.textContent = text;
    return label;
  }
  function setupHover(container, hit, label) {
    hit.addEventListener("mouseenter", () => {
      container.style.borderTopColor = hexToRgba(VIEW_INSET_COLOR, 0.8);
      label.style.opacity = "1";
    });
    hit.addEventListener("mouseleave", () => {
      if (hit.dataset.dragging) return;
      container.style.borderTopColor = hexToRgba(VIEW_INSET_COLOR, 0.4);
      label.style.opacity = "0";
    });
  }
  function setupDrag(container, hit, label, isStart) {
    let cachedRangeName = "";
    let cachedBounds = { start: 0, end: 0 };
    function onDown(e) {
      e.stopPropagation();
      e.preventDefault();
      hit.setPointerCapture(e.pointerId);
      hit.dataset.dragging = "1";
      const s = useStore2.getState();
      const vh2 = window.innerHeight;
      const scrollportTop = parseInset(s.animViewInsetStart, vh2);
      const scrollportBottom = vh2 - parseInset(s.animViewInsetEnd, vh2);
      const el = vcState.element;
      const elRect = el ? el.getBoundingClientRect() : new DOMRect();
      const range = parseRange(isStart ? s.animRangeStart : s.animRangeEnd);
      cachedRangeName = range.name;
      cachedBounds = rangeBounds(range.name, scrollportTop, scrollportBottom, elRect);
      container.style.borderTopColor = hexToRgba(VIEW_INSET_COLOR, 1);
      label.style.opacity = "1";
      document.documentElement.style.cursor = "row-resize";
      document.documentElement.style.userSelect = "none";
      hit.addEventListener("pointermove", onMove);
      hit.addEventListener("pointerup", onUp);
      hit.addEventListener("lostpointercapture", onUp);
    }
    function onMove(e) {
      const total = cachedBounds.end - cachedBounds.start;
      if (total === 0) return;
      const pct = Math.max(0, Math.min(100, Math.round((e.clientY - cachedBounds.start) / total * 100)));
      const val = `${cachedRangeName} ${pct}%`;
      const s = useStore2.getState();
      if (isStart) {
        s.setAnimRangeStart(val);
      } else {
        s.setAnimRangeEnd(val);
      }
    }
    function onUp(e) {
      hit.releasePointerCapture(e.pointerId);
      delete hit.dataset.dragging;
      document.documentElement.style.cursor = "";
      document.documentElement.style.userSelect = "";
      hit.removeEventListener("pointermove", onMove);
      hit.removeEventListener("pointerup", onUp);
      hit.removeEventListener("lostpointercapture", onUp);
      container.style.borderTopColor = hexToRgba(VIEW_INSET_COLOR, 0.4);
      label.style.opacity = "0";
    }
    hit.addEventListener("pointerdown", onDown);
  }
  function rangeBounds(rangeName, scrollportTop, scrollportBottom, elRect) {
    switch (rangeName) {
      case "entry":
        return { start: scrollportBottom, end: scrollportBottom - elRect.height };
      case "exit":
        return { start: scrollportTop + elRect.height, end: scrollportTop };
      case "contain":
        return { start: scrollportBottom - elRect.height, end: scrollportTop };
      case "cover":
      default:
        return { start: scrollportBottom, end: scrollportTop - elRect.height };
    }
  }
  function create2() {
    destroy();
    const root = vcRoot || document.documentElement;
    startContainer = makeLineContainer();
    const startHit = makeHitArea();
    startLabel = makeLabel("start");
    startContainer.appendChild(startHit);
    startContainer.appendChild(startLabel);
    setupHover(startContainer, startHit, startLabel);
    setupDrag(startContainer, startHit, startLabel, true);
    root.appendChild(startContainer);
    endContainer = makeLineContainer();
    const endHit = makeHitArea();
    endLabel = makeLabel("end");
    endContainer.appendChild(endHit);
    endContainer.appendChild(endLabel);
    setupHover(endContainer, endHit, endLabel);
    setupDrag(endContainer, endHit, endLabel, false);
    root.appendChild(endContainer);
    progressLine = document.createElement("div");
    progressLine.setAttribute("data-cs-visual-control", "view-progress");
    progressLine.style.cssText = `
            position: fixed; left: 0; right: 0; height: 0; pointer-events: none; z-index: 4;
            border-top: 2px solid ${hexToRgba(VIEW_INSET_COLOR, 0.7)};
        `;
    progressLabel = document.createElement("div");
    progressLabel.setAttribute("data-cs-visual-control", "view-progress-label");
    progressLabel.style.cssText = `
            position: absolute; left: 12px; top: 4px;
            padding: 2px 6px; border-radius: 4px;
            font-size: 10px; font-family: monospace; white-space: nowrap;
            background: ${hexToRgba(VIEW_INSET_COLOR, 0.9)}; color: #fff;
            pointer-events: none;
        `;
    progressLine.appendChild(progressLabel);
    root.appendChild(progressLine);
    positionLines();
    setupScrollSync();
  }
  function setupScrollSync() {
    cleanupScrollSync();
    const el = vcState.element;
    if (!el) return;
    let parent = el.parentElement;
    let source = null;
    while (parent) {
      const style2 = getComputedStyle(parent);
      const oy = style2.overflowY, ox = style2.overflowX;
      if ((oy === "auto" || oy === "scroll" || ox === "auto" || ox === "scroll") && (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth)) {
        source = parent;
        break;
      }
      parent = parent.parentElement;
    }
    if (!source) source = document.scrollingElement || document.documentElement;
    let rafPending = false;
    scrollHandler = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        positionProgress();
      });
    };
    scrollTarget = source === document.documentElement || source === document.body ? window : source;
    scrollTarget.addEventListener("scroll", scrollHandler, { passive: true });
    positionProgress();
  }
  function cleanupScrollSync() {
    if (scrollHandler && scrollTarget) {
      scrollTarget.removeEventListener("scroll", scrollHandler);
      scrollHandler = null;
      scrollTarget = null;
    }
  }
  function parseInset(value, viewportSize) {
    if (value === "auto" || !value) return 0;
    const num = parseFloat(value);
    if (isNaN(num)) return 0;
    if (value.endsWith("%")) return num / 100 * viewportSize;
    return num;
  }
  function parseRange(value) {
    const parts = value.trim().split(/\s+/);
    if (parts.length === 2) {
      return { name: parts[0], pct: parseFloat(parts[1]) / 100 || 0 };
    }
    if (parts[0] === "normal") return { name: "cover", pct: 0 };
    return { name: parts[0], pct: 0 };
  }
  function rangeToViewportY(rangeName, pct, scrollportTop, scrollportBottom, elRect) {
    const { start: start2, end } = rangeBounds(rangeName, scrollportTop, scrollportBottom, elRect);
    return start2 + (end - start2) * pct;
  }
  function positionLines() {
    if (!startContainer || !endContainer || !startLabel || !endLabel) return;
    const s = useStore2.getState();
    const vh2 = window.innerHeight;
    const insetTop = parseInset(s.animViewInsetStart, vh2);
    const insetBottom = parseInset(s.animViewInsetEnd, vh2);
    const scrollportTop = insetTop;
    const scrollportBottom = vh2 - insetBottom;
    const el = vcState.element;
    const elRect = el ? getLayoutRect(el) : new DOMRect(0, 0, 0, 0);
    const rs = parseRange(s.animRangeStart);
    const re = parseRange(s.animRangeEnd);
    const startY = rangeToViewportY(rs.name, rs.pct, scrollportTop, scrollportBottom, elRect);
    const endY = rangeToViewportY(re.name, re.pct, scrollportTop, scrollportBottom, elRect);
    startContainer.style.top = startY + "px";
    endContainer.style.top = endY + "px";
    startLabel.textContent = s.animRangeStart === "normal" ? "start: 0%" : `start: ${s.animRangeStart}`;
    endLabel.textContent = s.animRangeEnd === "normal" ? "end: 100%" : `end: ${s.animRangeEnd}`;
    positionProgress();
  }
  function positionProgress() {
    if (!progressLine || !progressLabel || !vcState.element) return;
    const s = useStore2.getState();
    const vh2 = window.innerHeight;
    const insetTop = parseInset(s.animViewInsetStart, vh2);
    const insetBottom = parseInset(s.animViewInsetEnd, vh2);
    const scrollportTop = insetTop;
    const scrollportBottom = vh2 - insetBottom;
    const elRect = getLayoutRect(vcState.element);
    const rs = parseRange(s.animRangeStart);
    const re = parseRange(s.animRangeEnd);
    const startY = rangeToViewportY(rs.name, rs.pct, scrollportTop, scrollportBottom, elRect);
    const endY = rangeToViewportY(re.name, re.pct, scrollportTop, scrollportBottom, elRect);
    const totalTravel = startY - endY;
    if (totalTravel <= 0) return;
    const progress3 = Math.max(0, Math.min(1, (startY - elRect.top) / totalTravel));
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    const y = Math.max(minY, Math.min(maxY, elRect.top));
    progressLine.style.top = y + "px";
    progressLabel.textContent = `${Math.round(progress3 * 100)}%`;
    useStore2.getState().animScrubTo(progress3);
  }
  let prevVh = 0;
  let prevInsetStart = "";
  let prevInsetEnd = "";
  let prevRangeStart = "";
  let prevRangeEnd = "";
  function tick2() {
    const s = useStore2.getState();
    const vh2 = window.innerHeight;
    if (vh2 === prevVh && s.animViewInsetStart === prevInsetStart && s.animViewInsetEnd === prevInsetEnd && s.animRangeStart === prevRangeStart && s.animRangeEnd === prevRangeEnd) return;
    prevVh = vh2;
    prevInsetStart = s.animViewInsetStart;
    prevInsetEnd = s.animViewInsetEnd;
    prevRangeStart = s.animRangeStart;
    prevRangeEnd = s.animRangeEnd;
    positionLines();
  }
  function destroy() {
    cleanupScrollSync();
    if (startContainer) {
      startContainer.remove();
      startContainer = null;
      startLabel = null;
    }
    if (endContainer) {
      endContainer.remove();
      endContainer = null;
      endLabel = null;
    }
    if (progressLine) {
      progressLine.remove();
      progressLine = null;
      progressLabel = null;
    }
    prevVh = 0;
    prevInsetStart = "";
    prevInsetEnd = "";
  }
  return { shouldActivate, create: create2, tick: tick2, destroy };
}

