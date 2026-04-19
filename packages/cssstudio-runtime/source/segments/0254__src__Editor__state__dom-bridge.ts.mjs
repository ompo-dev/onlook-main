// src/Editor/state/dom-bridge.ts
var state = {
  nextId: 1,
  elements: /* @__PURE__ */ new Map(),
  reverseMap: /* @__PURE__ */ new WeakMap(),
  highlightEl: null,
  selectEl: null,
  layoutBoxEl: null,
  selectedId: null,
  _selectRaf: 0,
  pickerCleanup: null,
  pickerMarqueeEl: null,
  inlineEditActive: false,
  inlineEditCleanup: null,
  _inlineCommit: null,
  scrollCleanup: null,
  observer: null,
  observedId: null,
  _mutationTimer: null,
  previewEls: /* @__PURE__ */ new Set(),
  localInsertedEls: /* @__PURE__ */ new Set(),
  _bodyObserver: null,
  _bodyDirtyTimer: null,
  theme: null,
  promptIconEl: null,
  _promptIconCallback: null,
  contextMenuCleanup: null,
  previewAnimation: null,
  reorderActive: false,
  reorderLineEl: null,
  reorderGhostEl: null,
  selectClickCleanup: null,
  drawCleanup: null,
  drawOverlayEl: null,
  drawParentHighlightEl: null,
  overlayRoot: null,
  // Multi-select overlays
  multiSelectEls: /* @__PURE__ */ new Map(),
  multiSelectOverlaySet: /* @__PURE__ */ new WeakSet(),
  _multiSelectRaf: 0
};
function getId(el) {
  let id3 = state.reverseMap.get(el);
  if (!id3) {
    id3 = state.nextId++;
    state.elements.set(id3, el);
    state.reverseMap.set(el, id3);
  }
  return id3;
}
function getEl2(id3) {
  return state.elements.get(id3);
}
function getElement(id3) {
  return state.elements.get(id3);
}
function scrollElementIntoView(id3) {
  const el = state.elements.get(id3);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function getTheme() {
  return state.theme || {};
}
function isMultiSelectOverlay(el) {
  return state.multiSelectOverlaySet.has(el);
}
function isOverlay(el) {
  return el === state.highlightEl || el === state.selectEl || el === state.layoutBoxEl || el === state.promptIconEl || el === state.reorderLineEl || el === state.reorderGhostEl || el === state.drawOverlayEl || el === state.drawParentHighlightEl || el === state.pickerMarqueeEl || el.localName === "css-studio-panel" || isVisualControlElement(el) || isMultiSelectOverlay(el);
}
function cleanupPrompt() {
  if (state.promptIconEl) {
    state.promptIconEl.remove();
    state.promptIconEl = null;
  }
}
function setOverlayRoot(root) {
  state.overlayRoot = root;
}
function setOverlayBlocking(blocking) {
  if (state.selectEl) {
    if (blocking && state.inlineEditActive) return;
    state.selectEl.style.pointerEvents = blocking ? "auto" : "none";
  }
}
function getPageElementAtPoint(x, y) {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el.localName === "css-studio-panel") continue;
    if (el === document.documentElement || el === document.body) continue;
    if (isOverlay(el)) continue;
    return el;
  }
  return null;
}
function getReactComponentInfo(el) {
  const fiberKey = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  if (!fiberKey) return null;
  let fiber = el[fiberKey];
  if (!fiber) return null;
  while (fiber) {
    const type = fiber.type;
    if (type && typeof type !== "string") {
      const name = type.displayName || type.name;
      if (name) {
        const result = { component: name };
        const debug = fiber._debugSource;
        if (debug?.fileName) {
          let file = debug.fileName;
          const srcIdx = file.indexOf("/src/");
          if (srcIdx !== -1) file = file.slice(srcIdx + 1);
          result.source = debug.lineNumber ? `${file}:${debug.lineNumber}` : file;
        }
        return result;
      }
    }
    fiber = fiber.return;
  }
  return null;
}
function isElementConnected(id3) {
  const el = getEl2(id3);
  return el !== void 0 && el.isConnected;
}
function buildElementSelector(id3) {
  const el = getEl2(id3);
  if (!el) return null;
  const tag = el.localName;
  if (el.id) return `${tag}#${CSS.escape(el.id)}`;
  const testId = el.getAttribute("data-testid");
  if (testId) return `${tag}[data-testid="${CSS.escape(testId)}"]`;
  const dataId = el.getAttribute("data-id");
  if (dataId) return `${tag}[data-id="${CSS.escape(dataId)}"]`;
  if (el.className && typeof el.className === "string") {
    const classes = el.className.trim().split(/\s+/).filter(Boolean);
    if (classes.length > 0) {
      return `${tag}${classes.map((c) => `.${CSS.escape(c)}`).join("")}`;
    }
  }
  return tag;
}
function findReplacementElement(selector, oldId) {
  try {
    const candidates = document.querySelectorAll(selector);
    if (candidates.length === 0) return null;
    if (candidates.length === 1) {
      const el = candidates[0];
      if (el.isConnected && !isOverlay(el)) return getId(el);
      return null;
    }
    const oldEl = getEl2(oldId);
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (el !== oldEl && el.isConnected && !isOverlay(el)) {
        return getId(el);
      }
    }
  } catch {
  }
  return null;
}
function purgeDetachedElements() {
  for (const [id3, el] of state.elements) {
    if (!el.isConnected && id3 !== state.selectedId) {
      state.elements.delete(id3);
    }
  }
}
function initBridge() {
  return true;
}
function fetchDomTree() {
  function walk(el) {
    if (isOverlay(el)) return null;
    const id3 = getId(el);
    const attrs = {};
    for (let i = 0; i < el.attributes.length; i++) {
      attrs[el.attributes[i].name] = el.attributes[i].value;
    }
    const children = [];
    for (let j = 0; j < el.children.length; j++) {
      const c = walk(el.children[j]);
      if (c) children.push(c);
    }
    let text = "";
    for (let k = 0; k < el.childNodes.length; k++) {
      if (el.childNodes[k].nodeType === 3) text += el.childNodes[k].textContent;
    }
    const reactInfo = getReactComponentInfo(el);
    return {
      id: id3,
      localName: el.localName,
      className: el.className || "",
      attributes: attrs,
      children,
      textContent: text.slice(0, 200),
      component: reactInfo?.component,
      source: reactInfo?.source
    };
  }
  return walk(document.documentElement);
}
function fetchStyles(id3) {
  const el = getEl2(id3);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const computed = {};
  for (let i = 0; i < cs.length; i++) {
    computed[cs[i]] = cs.getPropertyValue(cs[i]);
  }
  const htmlEl = el;
  const inline = {};
  for (let j = 0; j < htmlEl.style.length; j++) {
    const prop = htmlEl.style[j];
    inline[prop] = htmlEl.style.getPropertyValue(prop);
  }
  const matched = [];
  try {
    const sheets = document.styleSheets;
    for (let s = 0; s < sheets.length; s++) {
      try {
        const rules = sheets[s].cssRules;
        for (let r = 0; r < rules.length; r++) {
          const rule = rules[r];
          if (rule.selectorText && el.matches(rule.selectorText)) {
            const props = {};
            for (let p = 0; p < rule.style.length; p++) {
              props[rule.style[p]] = rule.style.getPropertyValue(rule.style[p]);
            }
            matched.push({ selector: rule.selectorText, properties: props });
          }
        }
      } catch {
      }
    }
  } catch {
  }
  const parent = htmlEl.parentElement;
  const parentDisplay = parent ? getComputedStyle(parent).display : "";
  return { computed, inline, matched, parentDisplay };
}
function setDocumentProperty(prop, value) {
  document.documentElement.style.setProperty(prop, value);
}
function removeDocumentProperty(prop) {
  document.documentElement.style.removeProperty(prop);
}
function setStyleProperty(id3, prop, value) {
  const el = getEl2(id3);
  if (el) el.style.setProperty(prop, value);
}
function setAttribute(id3, name, value) {
  const el = getEl2(id3);
  if (el) el.setAttribute(name, value);
}
function removeAttribute(id3, name) {
  const el = getEl2(id3);
  if (el) el.removeAttribute(name);
}
function setTextContent(id3, text) {
  const el = getEl2(id3);
  if (!el) return;
  const textNodes = [];
  for (let i = 0; i < el.childNodes.length; i++) {
    if (el.childNodes[i].nodeType === 3) textNodes.push(el.childNodes[i]);
  }
  if (textNodes.length === 0) {
    el.textContent = text;
  } else {
    textNodes[0].textContent = text;
    for (let j = 1; j < textNodes.length; j++) textNodes[j].textContent = "";
  }
}
function fetchDesignTokens() {
  const cs = getComputedStyle(document.documentElement);
  const tokens = [];
  for (let i = 0; i < cs.length; i++) {
    if (cs[i].startsWith("--")) {
      tokens.push({ name: cs[i].slice(2), value: cs.getPropertyValue(cs[i]).trim() });
    }
  }
  return tokens;
}
function getMetaContent(selector) {
  return document.querySelector(selector)?.content ?? "";
}
function fetchPageMetadata() {
  return {
    title: document.title,
    description: getMetaContent('meta[name="description"]'),
    charset: document.querySelector("meta[charset]")?.getAttribute("charset") ?? "",
    viewport: getMetaContent('meta[name="viewport"]'),
    ogTitle: getMetaContent('meta[property="og:title"]'),
    ogDescription: getMetaContent('meta[property="og:description"]'),
    ogImage: getMetaContent('meta[property="og:image"]'),
    favicon: document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')?.href ?? ""
  };
}
function ensureMeta(attr, value) {
  const selector = `meta[${attr}="${value}"]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  return el;
}
function setPageMetadataField(field, value) {
  switch (field) {
    case "title":
      document.title = value;
      break;
    case "description":
      ensureMeta("name", "description").content = value;
      break;
    case "charset": {
      let el = document.querySelector("meta[charset]");
      if (!el) {
        el = document.createElement("meta");
        document.head.prepend(el);
      }
      el.setAttribute("charset", value);
      break;
    }
    case "viewport":
      ensureMeta("name", "viewport").content = value;
      break;
    case "ogTitle":
      ensureMeta("property", "og:title").content = value;
      break;
    case "ogDescription":
      ensureMeta("property", "og:description").content = value;
      break;
    case "ogImage":
      ensureMeta("property", "og:image").content = value;
      break;
    case "favicon": {
      let link = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = value;
      break;
    }
  }
}
function findInlineOrigin(el, prop) {
  let current3 = el;
  while (current3) {
    const htmlEl = current3;
    if (htmlEl.style && htmlEl.style.getPropertyValue(prop)) {
      return state.reverseMap.get(current3) ?? null;
    }
    current3 = current3.parentElement;
  }
  return null;
}
function fetchElementVariables(id3) {
  const el = getEl2(id3);
  if (!el) return [];
  const cs = getComputedStyle(el);
  const vars = [];
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i];
    if (!prop.startsWith("--")) continue;
    const value = cs.getPropertyValue(prop).trim();
    const originNodeId = findInlineOrigin(el, prop);
    vars.push({ name: prop.slice(2), value, originNodeId });
  }
  return vars;
}
function observeElement(id3, onMutation) {
  if (state.observer) {
    state.observer.disconnect();
    state.observer = null;
  }
  if (state._mutationTimer) {
    clearTimeout(state._mutationTimer);
    state._mutationTimer = null;
  }
  state.observedId = id3;
  const el = getEl2(id3);
  if (!el) return;
  state.observer = new MutationObserver(() => {
    if (state.inlineEditActive || state.reorderActive) return;
    if (!onMutation) return;
    if (state._mutationTimer) clearTimeout(state._mutationTimer);
    state._mutationTimer = setTimeout(() => {
      state._mutationTimer = null;
      onMutation();
    }, 500);
  });
  state.observer.observe(el, { attributes: true, childList: true, characterData: true, subtree: false });
}
function highlightElement(id3) {
  if (id3 === null) {
    if (state.highlightEl) state.highlightEl.style.display = "none";
    return;
  }
  const el = getEl2(id3);
  if (!el || !el.isConnected) return;
  if (!state.highlightEl) {
    state.highlightEl = document.createElement("div");
    state.highlightEl.style.cssText = "position:fixed;pointer-events:none;z-index:2147483640;transition:all 0.05s;";
    document.documentElement.appendChild(state.highlightEl);
  }
  const h = state.highlightEl;
  const quad = getElementQuad(el);
  if (quad.hasTransform) {
    const avgScale = (quad.scaleX + quad.scaleY) / 2;
    h.style.background = "rgba(111,168,220,0.3)";
    h.style.border = `${1 / avgScale}px solid rgba(111,168,220,0.7)`;
    h.style.display = "block";
    h.style.top = quad.untransformedY + "px";
    h.style.left = quad.untransformedX + "px";
    h.style.width = quad.width + "px";
    h.style.height = quad.height + "px";
    h.style.transform = quad.cssTransform;
    h.style.transformOrigin = "0 0";
  } else {
    h.style.background = "rgba(111,168,220,0.3)";
    h.style.border = "1px solid rgba(111,168,220,0.7)";
    h.style.display = "block";
    h.style.top = quad.untransformedY + "px";
    h.style.left = quad.untransformedX + "px";
    h.style.width = quad.width + "px";
    h.style.height = quad.height + "px";
    h.style.transform = "";
    h.style.transformOrigin = "";
  }
}
function selectElement(id3) {
  if (id3 === null) {
    state.selectedId = null;
    setOverlayBlocking(false);
    if (state._selectRaf) cancelAnimationFrame(state._selectRaf);
    if (state.selectEl) state.selectEl.style.display = "none";
    if (state.layoutBoxEl) state.layoutBoxEl.style.display = "none";
    if (state.scrollCleanup) {
      state.scrollCleanup();
      state.scrollCleanup = null;
    }
    cleanupPrompt();
    return;
  }
  state.selectedId = id3;
  setOverlayBlocking(true);
  const el = getEl2(id3);
  if (!el) return;
  if (!state.selectEl) {
    state.selectEl = document.createElement("div");
    state.selectEl.style.cssText = "position:fixed;pointer-events:none;z-index:2147483639;border:1px solid rgba(111,168,220,0.7);";
    document.documentElement.appendChild(state.selectEl);
  }
  const s = state.selectEl;
  let prevKey = "";
  function tick2() {
    if (!el.isConnected) {
      s.style.display = "none";
      if (state.layoutBoxEl) state.layoutBoxEl.style.display = "none";
      if (state.promptIconEl) state.promptIconEl.style.display = "none";
      return;
    }
    const quad = getElementQuad(el);
    const key = `${quad.untransformedX},${quad.untransformedY},${quad.width},${quad.height},${quad.cssTransform}`;
    if (key !== prevKey) {
      prevKey = key;
      s.style.display = "block";
      s.style.top = quad.untransformedY + "px";
      s.style.left = quad.untransformedX + "px";
      s.style.width = quad.width + "px";
      s.style.height = quad.height + "px";
      if (quad.hasTransform) {
        const avgScale = (quad.scaleX + quad.scaleY) / 2;
        s.style.transform = quad.cssTransform;
        s.style.transformOrigin = "0 0";
        s.style.borderWidth = 1 / avgScale + "px";
        const selfCs = getComputedStyle(el);
        const selfTransformed = selfCs.transform && selfCs.transform !== "none";
        if (selfTransformed) {
          if (!state.layoutBoxEl) {
            state.layoutBoxEl = document.createElement("div");
            state.layoutBoxEl.style.cssText = "position:fixed;pointer-events:none;z-index:2147483638;border:1px dashed rgba(111,168,220,0.45);background:none;";
            document.documentElement.appendChild(state.layoutBoxEl);
          }
          const lb = state.layoutBoxEl;
          lb.style.display = "block";
          lb.style.top = quad.untransformedY + "px";
          lb.style.left = quad.untransformedX + "px";
          lb.style.width = quad.width + "px";
          lb.style.height = quad.height + "px";
          lb.style.transform = "";
          lb.style.transformOrigin = "";
        } else if (state.layoutBoxEl) {
          state.layoutBoxEl.style.display = "none";
        }
      } else {
        s.style.transform = "";
        s.style.transformOrigin = "";
        s.style.borderWidth = "1px";
        if (state.layoutBoxEl) state.layoutBoxEl.style.display = "none";
      }
    }
    if (state.promptIconEl) {
      const tr = quad.corners[1];
      const ix = Math.min(tr.x + 4, window.innerWidth - 32);
      const iy = Math.max(tr.y - 4, 4);
      state.promptIconEl.style.top = iy + "px";
      state.promptIconEl.style.left = ix + "px";
    }
    state._selectRaf = requestAnimationFrame(tick2);
  }
  if (state.scrollCleanup) state.scrollCleanup();
  tick2();
  state.scrollCleanup = () => {
    cancelAnimationFrame(state._selectRaf);
  };
}
function clearMultiSelectOverlays() {
  if (state._multiSelectRaf) {
    cancelAnimationFrame(state._multiSelectRaf);
    state._multiSelectRaf = 0;
  }
  for (const overlay of state.multiSelectEls.values()) {
    state.multiSelectOverlaySet.delete(overlay);
    overlay.remove();
  }
  state.multiSelectEls.clear();
}
function selectElements(ids, primaryId) {
  if (ids.length <= 1) {
    clearMultiSelectOverlays();
    selectElement(ids[0] ?? null);
    return;
  }
  selectElement(primaryId);
  const secondaryIds = new Set(ids.filter((id3) => id3 !== primaryId));
  for (const [id3, overlay] of state.multiSelectEls) {
    if (!secondaryIds.has(id3)) {
      state.multiSelectOverlaySet.delete(overlay);
      overlay.remove();
      state.multiSelectEls.delete(id3);
    }
  }
  for (const id3 of secondaryIds) {
    if (!state.multiSelectEls.has(id3)) {
      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;pointer-events:none;z-index:2147483638;border:1px dashed rgba(111,168,220,0.7);background:rgba(111,168,220,0.08);";
      document.documentElement.appendChild(overlay);
      state.multiSelectEls.set(id3, overlay);
      state.multiSelectOverlaySet.add(overlay);
    }
  }
  if (state._multiSelectRaf) cancelAnimationFrame(state._multiSelectRaf);
  const prevKeys = /* @__PURE__ */ new Map();
  function tickMulti() {
    for (const [id3, overlay] of state.multiSelectEls) {
      const el = getEl2(id3);
      if (!el || !el.isConnected) {
        state.multiSelectOverlaySet.delete(overlay);
        overlay.remove();
        state.multiSelectEls.delete(id3);
        prevKeys.delete(id3);
        continue;
      }
      const quad = getElementQuad(el);
      const key = `${quad.untransformedX},${quad.untransformedY},${quad.width},${quad.height},${quad.cssTransform}`;
      if (key === prevKeys.get(id3)) continue;
      prevKeys.set(id3, key);
      overlay.style.display = "block";
      overlay.style.top = quad.untransformedY + "px";
      overlay.style.left = quad.untransformedX + "px";
      overlay.style.width = quad.width + "px";
      overlay.style.height = quad.height + "px";
      if (quad.hasTransform) {
        const avgScale = (quad.scaleX + quad.scaleY) / 2;
        overlay.style.transform = quad.cssTransform;
        overlay.style.transformOrigin = "0 0";
        overlay.style.borderWidth = 1 / avgScale + "px";
      } else {
        overlay.style.transform = "";
        overlay.style.transformOrigin = "";
        overlay.style.borderWidth = "1px";
      }
    }
    if (state.multiSelectEls.size > 0) {
      state._multiSelectRaf = requestAnimationFrame(tickMulti);
    } else {
      state._multiSelectRaf = 0;
    }
  }
  tickMulti();
}
function startPicker(onPick, onMarquee) {
  setOverlayBlocking(false);
  if (state.drawCleanup) state.drawCleanup();
  if (state.pickerCleanup) state.pickerCleanup();
  let dragging = false;
  let startX = 0;
  let startY = 0;
  const DRAG_THRESHOLD3 = 5;
  function onMove(e) {
    if (dragging) return;
    const el = e.target;
    if (el.localName === "css-studio-panel" || el.closest && el.closest("css-studio-panel")) return;
    if (!state.highlightEl) {
      state.highlightEl = document.createElement("div");
      state.highlightEl.style.cssText = "position:fixed;pointer-events:none;z-index:2147483640;background:rgba(111,168,220,0.3);border:1px solid rgba(111,168,220,0.7);transition:all 0.05s;";
      document.documentElement.appendChild(state.highlightEl);
    }
    const r = el.getBoundingClientRect();
    const h = state.highlightEl;
    h.style.display = "block";
    h.style.top = r.top + "px";
    h.style.left = r.left + "px";
    h.style.width = r.width + "px";
    h.style.height = r.height + "px";
  }
  function suppress(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
  let spaceHeld = false;
  let lastMoveX = 0;
  let lastMoveY = 0;
  function onSpaceDown(e) {
    if (e.code === "Space" && dragging && !spaceHeld) {
      e.preventDefault();
      spaceHeld = true;
    }
  }
  function onSpaceUp(e) {
    if (e.code === "Space") {
      e.preventDefault();
      spaceHeld = false;
    }
  }
  function onDragMove(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (spaceHeld) {
      const dx2 = e.clientX - lastMoveX;
      const dy2 = e.clientY - lastMoveY;
      startX += dx2;
      startY += dy2;
    }
    lastMoveX = e.clientX;
    lastMoveY = e.clientY;
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (!dragging && dx < DRAG_THRESHOLD3 && dy < DRAG_THRESHOLD3) return;
    if (!dragging) {
      dragging = true;
      if (state.highlightEl) state.highlightEl.style.display = "none";
      document.addEventListener("keydown", onSpaceDown, true);
      document.addEventListener("keyup", onSpaceUp, true);
    }
    if (!state.pickerMarqueeEl) {
      state.pickerMarqueeEl = document.createElement("div");
      state.pickerMarqueeEl.style.cssText = "position:fixed;pointer-events:none;z-index:2147483640;border:2px solid rgba(111,168,220,0.7);border-radius:2px;";
      document.documentElement.appendChild(state.pickerMarqueeEl);
    }
    const m2 = state.pickerMarqueeEl;
    m2.style.display = "block";
    m2.style.left = Math.min(startX, e.clientX) + "px";
    m2.style.top = Math.min(startY, e.clientY) + "px";
    m2.style.width = dx + "px";
    m2.style.height = dy + "px";
  }
  function onDragUp(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    document.removeEventListener("pointermove", onDragMove, true);
    document.removeEventListener("pointerup", onDragUp, true);
    if (state.pickerMarqueeEl) state.pickerMarqueeEl.style.display = "none";
    if (!dragging) {
      const el = document.elementFromPoint(e.clientX, e.clientY) || e.target;
      if (el.localName === "css-studio-panel" || el.closest && el.closest("css-studio-panel")) return;
      cleanup();
      onPick(getId(el));
      return;
    }
    if (!onMarquee) {
      cleanup();
      return;
    }
    const rx = Math.min(startX, e.clientX);
    const ry = Math.min(startY, e.clientY);
    const rw = Math.abs(e.clientX - startX);
    const rh = Math.abs(e.clientY - startY);
    if (rw < DRAG_THRESHOLD3 && rh < DRAG_THRESHOLD3) {
      cleanup();
      return;
    }
    const ids = [];
    const all = document.body.querySelectorAll("*");
    for (const el of all) {
      if (isOverlay(el)) continue;
      if (el === document.body || el === document.documentElement) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right < rx || r.left > rx + rw || r.bottom < ry || r.top > ry + rh) continue;
      ids.push(getId(el));
    }
    const leafIds = [];
    for (const id3 of ids) {
      const el = getEl2(id3);
      if (!el) continue;
      let hasChildMatch = false;
      for (const childId of ids) {
        if (childId === id3) continue;
        const child = getEl2(childId);
        if (child && el.contains(child)) {
          hasChildMatch = true;
          break;
        }
      }
      if (!hasChildMatch) leafIds.push(id3);
    }
    cleanup();
    if (leafIds.length > 0) onMarquee(leafIds);
  }
  function onDown(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const target = document.elementFromPoint(e.clientX, e.clientY) || e.target;
    if (target.localName === "css-studio-panel" || target.closest && target.closest("css-studio-panel")) return;
    dragging = false;
    spaceHeld = false;
    startX = e.clientX;
    startY = e.clientY;
    lastMoveX = e.clientX;
    lastMoveY = e.clientY;
    document.removeEventListener("pointerup", suppress, true);
    document.addEventListener("pointermove", onDragMove, true);
    document.addEventListener("pointerup", onDragUp, true);
  }
  function cleanup() {
    document.documentElement.style.cursor = "";
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("pointerdown", onDown, true);
    document.removeEventListener("pointermove", onDragMove, true);
    document.removeEventListener("pointerup", onDragUp, true);
    document.removeEventListener("pointerup", suppress, true);
    document.removeEventListener("keydown", onSpaceDown, true);
    document.removeEventListener("keyup", onSpaceUp, true);
    if (state.highlightEl) state.highlightEl.style.display = "none";
    if (state.pickerMarqueeEl) state.pickerMarqueeEl.style.display = "none";
    state.pickerCleanup = null;
    spaceHeld = false;
    requestAnimationFrame(() => {
      document.removeEventListener("mousedown", suppress, true);
      document.removeEventListener("mouseup", suppress, true);
      document.removeEventListener("click", suppress, true);
    });
  }
  document.documentElement.style.setProperty("cursor", "crosshair", "important");
  state.pickerCleanup = cleanup;
  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("pointerdown", onDown, true);
  document.addEventListener("pointerup", suppress, true);
  document.addEventListener("mousedown", suppress, true);
  document.addEventListener("mouseup", suppress, true);
  document.addEventListener("click", suppress, true);
}
function stopPicker() {
  if (state.pickerCleanup) state.pickerCleanup();
}
function startDrawMode(onDraw) {
  setOverlayBlocking(false);
  if (state.pickerCleanup) state.pickerCleanup();
  if (state.drawCleanup) state.drawCleanup();
  let startX = 0;
  let startY = 0;
  let lastMoveX = 0;
  let lastMoveY = 0;
  let spaceHeld = false;
  let isDragging2 = false;
  let detectedParent = null;
  function suppress(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
  function onSpaceDown(e) {
    if (e.code === "Space" && isDragging2 && !spaceHeld) {
      e.preventDefault();
      spaceHeld = true;
    }
  }
  function onSpaceUp(e) {
    if (e.code === "Space") {
      e.preventDefault();
      spaceHeld = false;
    }
  }
  function detectParent(rect) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    let candidate = getPageElementAtPoint(cx, cy);
    if (!candidate) return document.body;
    while (candidate && candidate !== document.body) {
      const pr = candidate.getBoundingClientRect();
      if (rect.x >= pr.left && rect.y >= pr.top && rect.x + rect.w <= pr.right && rect.y + rect.h <= pr.bottom) {
        break;
      }
      candidate = candidate.parentElement ?? document.body;
    }
    return candidate ?? document.body;
  }
  function onDown(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const target = document.elementFromPoint(e.clientX, e.clientY) || e.target;
    if (target.localName === "css-studio-panel" || target.closest && target.closest("css-studio-panel")) return;
    startX = e.clientX;
    startY = e.clientY;
    lastMoveX = e.clientX;
    lastMoveY = e.clientY;
    spaceHeld = false;
    isDragging2 = true;
    document.addEventListener("keydown", onSpaceDown, true);
    document.addEventListener("keyup", onSpaceUp, true);
    if (!state.drawOverlayEl) {
      state.drawOverlayEl = document.createElement("div");
      state.drawOverlayEl.style.cssText = "position:fixed;pointer-events:none;z-index:2147483640;background:rgba(111,168,220,0.15);border:2px solid rgba(111,168,220,0.7);border-radius:2px;";
      document.documentElement.appendChild(state.drawOverlayEl);
    }
    state.drawOverlayEl.style.display = "block";
    state.drawOverlayEl.style.left = startX + "px";
    state.drawOverlayEl.style.top = startY + "px";
    state.drawOverlayEl.style.width = "0px";
    state.drawOverlayEl.style.height = "0px";
    if (!state.drawParentHighlightEl) {
      state.drawParentHighlightEl = document.createElement("div");
      state.drawParentHighlightEl.style.cssText = "position:fixed;pointer-events:none;z-index:2147483639;border:2px solid rgba(111,168,220,0.5);border-radius:2px;";
      document.documentElement.appendChild(state.drawParentHighlightEl);
    }
    state.drawParentHighlightEl.style.display = "none";
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
  }
  function onMove(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (spaceHeld) {
      const dx = e.clientX - lastMoveX;
      const dy = e.clientY - lastMoveY;
      startX += dx;
      startY += dy;
    }
    lastMoveX = e.clientX;
    lastMoveY = e.clientY;
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    if (state.drawOverlayEl) {
      state.drawOverlayEl.style.left = x + "px";
      state.drawOverlayEl.style.top = y + "px";
      state.drawOverlayEl.style.width = w + "px";
      state.drawOverlayEl.style.height = h + "px";
    }
    if (w > 2 || h > 2) {
      detectedParent = detectParent({ x, y, w, h });
      if (state.drawParentHighlightEl && detectedParent) {
        const pr = detectedParent.getBoundingClientRect();
        state.drawParentHighlightEl.style.display = "block";
        state.drawParentHighlightEl.style.left = pr.left + "px";
        state.drawParentHighlightEl.style.top = pr.top + "px";
        state.drawParentHighlightEl.style.width = pr.width + "px";
        state.drawParentHighlightEl.style.height = pr.height + "px";
      }
    }
  }
  function onUp(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    document.removeEventListener("pointermove", onMove, true);
    document.removeEventListener("pointerup", onUp, true);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    if (state.drawOverlayEl) state.drawOverlayEl.style.display = "none";
    if (state.drawParentHighlightEl) state.drawParentHighlightEl.style.display = "none";
    if (w < 5 && h < 5) {
      cleanup();
      return;
    }
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const parent = detectedParent ?? document.body;
    const parentId = getId(parent);
    cleanup();
    onDraw(parentId, { x, y, w: Math.round(w), h: Math.round(h) });
  }
  function cleanup() {
    document.documentElement.style.cursor = "";
    document.removeEventListener("pointerdown", onDown, true);
    document.removeEventListener("pointermove", onMove, true);
    document.removeEventListener("pointerup", onUp, true);
    document.removeEventListener("keydown", onSpaceDown, true);
    document.removeEventListener("keyup", onSpaceUp, true);
    if (state.drawOverlayEl) state.drawOverlayEl.style.display = "none";
    if (state.drawParentHighlightEl) state.drawParentHighlightEl.style.display = "none";
    state.drawCleanup = null;
    spaceHeld = false;
    isDragging2 = false;
    requestAnimationFrame(() => {
      document.removeEventListener("mousedown", suppress, true);
      document.removeEventListener("mouseup", suppress, true);
      document.removeEventListener("click", suppress, true);
    });
  }
  document.documentElement.style.setProperty("cursor", "crosshair", "important");
  state.drawCleanup = cleanup;
  document.addEventListener("pointerdown", onDown, true);
  document.addEventListener("mousedown", suppress, true);
  document.addEventListener("mouseup", suppress, true);
  document.addEventListener("click", suppress, true);
}
function stopDrawMode() {
  if (state.drawCleanup) state.drawCleanup();
}
function cleanupOverlays() {
  setOverlayBlocking(false);
  if (state.highlightEl) {
    state.highlightEl.remove();
    state.highlightEl = null;
  }
  if (state._selectRaf) {
    cancelAnimationFrame(state._selectRaf);
    state._selectRaf = 0;
  }
  if (state.selectEl) {
    state.selectEl.remove();
    state.selectEl = null;
  }
  if (state.layoutBoxEl) {
    state.layoutBoxEl.remove();
    state.layoutBoxEl = null;
  }
  if (state.scrollCleanup) {
    state.scrollCleanup();
    state.scrollCleanup = null;
  }
  clearMultiSelectOverlays();
  if (state.pickerCleanup) state.pickerCleanup();
  if (state.drawCleanup) state.drawCleanup();
  if (state.drawOverlayEl) {
    state.drawOverlayEl.remove();
    state.drawOverlayEl = null;
  }
  if (state.drawParentHighlightEl) {
    state.drawParentHighlightEl.remove();
    state.drawParentHighlightEl = null;
  }
  if (state.pickerMarqueeEl) {
    state.pickerMarqueeEl.remove();
    state.pickerMarqueeEl = null;
  }
  if (state.inlineEditCleanup) {
    state.inlineEditCleanup();
    state.inlineEditCleanup = null;
  }
  if (state.observer) {
    state.observer.disconnect();
    state.observer = null;
  }
  if (state.reorderLineEl) {
    state.reorderLineEl.remove();
    state.reorderLineEl = null;
  }
  if (state.reorderGhostEl) {
    state.reorderGhostEl.remove();
    state.reorderGhostEl = null;
  }
  cleanupPrompt();
  deactivateControls();
}
function isInlineEditActive() {
  return state.inlineEditActive;
}
function startInlineEdit(callbacks) {
  if (state.pickerCleanup || state.inlineEditActive) return;
  if (state.inlineEditCleanup) state.inlineEditCleanup();
  function hasTextContent(el) {
    for (let i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent?.trim()) return true;
    }
    return false;
  }
  function getTextNodes(el) {
    const result = [];
    for (let i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3) result.push(el.childNodes[i]);
    }
    return result;
  }
  function readText(el) {
    return getTextNodes(el).map((n) => n.textContent).join("");
  }
  function beginEdit(el) {
    if (state._inlineCommit) state._inlineCommit();
    state.inlineEditActive = true;
    setOverlayBlocking(false);
    const id3 = getId(el);
    callbacks.onSelect(id3);
    const savedNodes = getTextNodes(el).map((n) => ({ node: n, text: n.textContent }));
    const originalText = readText(el);
    const htmlEl = el;
    htmlEl.contentEditable = "true";
    htmlEl.style.outline = "2px solid rgba(111,168,220,0.7)";
    htmlEl.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    const textNodes = getTextNodes(el);
    if (textNodes.length > 0) {
      range.setStart(textNodes[0], 0);
      range.setEnd(textNodes[textNodes.length - 1], textNodes[textNodes.length - 1].textContent.length);
    } else {
      range.selectNodeContents(el);
    }
    sel.removeAllRanges();
    sel.addRange(range);
    function commit() {
      if (!state.inlineEditActive || state._inlineCommit !== commit) return;
      const newText = readText(el);
      htmlEl.contentEditable = "false";
      htmlEl.style.outline = "";
      el.removeEventListener("keydown", onKey, true);
      el.removeEventListener("blur", onBlur, true);
      state.inlineEditActive = false;
      state._inlineCommit = null;
      setOverlayBlocking(true);
      callbacks.onResult({ id: id3, oldText: originalText, newText });
    }
    function cancel() {
      for (const s of savedNodes) s.node.textContent = s.text;
      htmlEl.contentEditable = "false";
      htmlEl.style.outline = "";
      el.removeEventListener("keydown", onKey, true);
      el.removeEventListener("blur", onBlur, true);
      state.inlineEditActive = false;
      state._inlineCommit = null;
      setOverlayBlocking(true);
    }
    function onKey(e) {
      const ke = e;
      if (ke.key === "Enter" && !ke.shiftKey) {
        ke.preventDefault();
        commit();
      }
      if (ke.key === "Escape") {
        ke.preventDefault();
        cancel();
      }
    }
    function onBlur() {
      commit();
    }
    state._inlineCommit = commit;
    el.addEventListener("keydown", onKey, true);
    el.addEventListener("blur", onBlur, true);
  }
  function onClick(e) {
    if (state.pickerCleanup) return;
    if (state.inlineEditActive) return;
    const target = e.target;
    if (target.localName === "css-studio-panel" || target.closest && target.closest("css-studio-panel")) return;
    const me = e;
    const el = getPageElementAtPoint(me.clientX, me.clientY);
    if (!el) return;
    if (state.selectedId) {
      const selEl = getEl2(state.selectedId);
      if (selEl && (selEl === el || selEl.contains(el))) {
        e.preventDefault();
      }
    }
  }
  function onDblClick(e) {
    if (state.pickerCleanup || state.inlineEditActive) return;
    const target = e.target;
    if (target.localName === "css-studio-panel" || target.closest && target.closest("css-studio-panel")) return;
    if (target.closest?.("[data-cs-visual-control]")) return;
    const me = e;
    const el = getPageElementAtPoint(me.clientX, me.clientY);
    if (!el) return;
    if (!hasTextContent(el)) return;
    e.preventDefault();
    e.stopPropagation();
    beginEdit(el);
  }
  document.addEventListener("click", onClick, true);
  document.addEventListener("dblclick", onDblClick, true);
  state.inlineEditCleanup = () => {
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("dblclick", onDblClick, true);
    state.inlineEditCleanup = null;
    state.inlineEditActive = false;
  };
}
function stopInlineEdit() {
  if (state.inlineEditCleanup) state.inlineEditCleanup();
}
function observeBody(onDirty) {
  if (state._bodyObserver) state._bodyObserver.disconnect();
  if (state._bodyDirtyTimer) {
    clearTimeout(state._bodyDirtyTimer);
    state._bodyDirtyTimer = null;
  }
  state._bodyObserver = new MutationObserver(() => {
    if (state.reorderActive) return;
    if (!onDirty) return;
    if (state._bodyDirtyTimer) clearTimeout(state._bodyDirtyTimer);
    state._bodyDirtyTimer = setTimeout(() => {
      state._bodyDirtyTimer = null;
      state.previewEls.forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      state.previewEls.clear();
      state.localInsertedEls.forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      state.localInsertedEls.clear();
      onDirty();
    }, 500);
  });
  if (document.body) {
    state._bodyObserver.observe(document.body, { childList: true, subtree: true });
  }
}
function removeElement(id3) {
  const el = getEl2(id3);
  if (!el || !el.parentNode) return false;
  el.parentNode.removeChild(el);
  state.elements.delete(id3);
  return true;
}
function detachElement(id3) {
  const el = getEl2(id3);
  if (!el || !el.parentNode) return null;
  if (state._bodyObserver) state._bodyObserver.disconnect();
  el.parentNode.removeChild(el);
  state.elements.delete(id3);
  if (state._bodyObserver && document.body) {
    state._bodyObserver.observe(document.body, { childList: true, subtree: true });
  }
  return el;
}
function getNextSiblingId(id3) {
  const el = getEl2(id3);
  if (!el) return null;
  let sib = el.nextElementSibling;
  while (sib && isOverlay(sib)) sib = sib.nextElementSibling;
  return sib ? getId(sib) : null;
}
function reinsertElement(element, parentId, beforeSiblingId) {
  const parent = getEl2(parentId);
  if (!parent) return null;
  if (state._bodyObserver) state._bodyObserver.disconnect();
  const before = beforeSiblingId !== null ? getEl2(beforeSiblingId) ?? null : null;
  if (before && before.parentNode === parent) {
    parent.insertBefore(element, before);
  } else {
    parent.appendChild(element);
  }
  if (state._bodyObserver && document.body) {
    state._bodyObserver.observe(document.body, { childList: true, subtree: true });
  }
  return getId(element);
}
function replaceTag(id3, newTag) {
  const el = getEl2(id3);
  if (!el || !el.parentNode) return null;
  const newEl = document.createElement(newTag);
  for (let i = 0; i < el.attributes.length; i++) {
    newEl.setAttribute(el.attributes[i].name, el.attributes[i].value);
  }
  ;
  newEl.style.cssText = el.style.cssText;
  while (el.firstChild) newEl.appendChild(el.firstChild);
  el.parentNode.replaceChild(newEl, el);
  state.elements.delete(id3);
  return getId(newEl);
}
function findInsertionSibling(parentId, rect) {
  const parent = getEl2(parentId);
  if (!parent) return null;
  const children = Array.from(parent.children).filter((c) => !isOverlay(c));
  if (children.length === 0) return null;
  const style2 = getComputedStyle(parent);
  const isFlexRow = style2.display.includes("flex") && (style2.flexDirection === "row" || style2.flexDirection === "row-reverse");
  const centerX = rect.x + rect.w / 2;
  const centerY = rect.y + rect.h / 2;
  for (const child of children) {
    const cr = child.getBoundingClientRect();
    const childCenter = isFlexRow ? cr.left + cr.width / 2 : cr.top + cr.height / 2;
    const drawnCenter = isFlexRow ? centerX : centerY;
    if (childCenter > drawnCenter) return getId(child);
  }
  return null;
}
function addChildElement(parentId, tag, beforeId) {
  const parent = getEl2(parentId);
  if (!parent) return null;
  if (state._bodyObserver) state._bodyObserver.disconnect();
  const newEl = document.createElement(tag);
  newEl.style.width = "100px";
  newEl.style.height = "100px";
  const before = beforeId != null ? getEl2(beforeId) ?? null : null;
  if (before && before.parentNode === parent) {
    parent.insertBefore(newEl, before);
  } else {
    parent.appendChild(newEl);
  }
  state.localInsertedEls.add(newEl);
  if (state._bodyObserver && document.body) {
    state._bodyObserver.observe(document.body, { childList: true, subtree: true });
  }
  return getId(newEl);
}
function addSiblingElement(siblingId, tag) {
  const sibling = getEl2(siblingId);
  if (!sibling || !sibling.parentNode) return null;
  if (state._bodyObserver) state._bodyObserver.disconnect();
  const newEl = document.createElement(tag);
  newEl.style.width = "100px";
  newEl.style.height = "100px";
  sibling.parentNode.insertBefore(newEl, sibling.nextSibling);
  state.localInsertedEls.add(newEl);
  if (state._bodyObserver && document.body) {
    state._bodyObserver.observe(document.body, { childList: true, subtree: true });
  }
  return getId(newEl);
}
function duplicateElement(id3) {
  const el = getEl2(id3);
  if (!el || !el.parentNode) return null;
  if (state._bodyObserver) state._bodyObserver.disconnect();
  const clone = el.cloneNode(true);
  el.parentNode.insertBefore(clone, el.nextSibling);
  state.localInsertedEls.add(clone);
  if (state._bodyObserver && document.body) {
    state._bodyObserver.observe(document.body, { childList: true, subtree: true });
  }
  return getId(clone);
}
function moveElement(id3, newParentId, beforeSiblingId) {
  const el = getEl2(id3);
  const parent = getEl2(newParentId);
  if (!el || !parent) return false;
  if (el.contains(parent)) return false;
  const before = beforeSiblingId !== null ? getEl2(beforeSiblingId) ?? null : null;
  if (state._bodyObserver) state._bodyObserver.disconnect();
  parent.insertBefore(el, before);
  if (state._bodyObserver && document.body) {
    state._bodyObserver.observe(document.body, { childList: true, subtree: true });
  }
  return true;
}
function getParentId(id3) {
  const el = getEl2(id3);
  if (!el || !el.parentElement) return null;
  if (isOverlay(el.parentElement)) return null;
  return getId(el.parentElement);
}
function getSiblingIds(parentId) {
  const parent = getEl2(parentId);
  if (!parent) return [];
  const ids = [];
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (!isOverlay(child)) ids.push(getId(child));
  }
  return ids;
}
function getFlexInfo(id3) {
  const el = getEl2(id3);
  if (!el) return null;
  const style2 = getComputedStyle(el);
  const display = style2.display;
  const isFlex = display === "flex" || display === "inline-flex";
  return { isFlex, direction: isFlex ? style2.flexDirection : "" };
}
function getChildRectsAndIds(parentId) {
  const parent = getEl2(parentId);
  if (!parent) return [];
  const result = [];
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (!isOverlay(child)) {
      result.push({ id: getId(child), rect: child.getBoundingClientRect() });
    }
  }
  return result;
}
function showReorderLine(rect) {
  if (!state.reorderLineEl) {
    state.reorderLineEl = document.createElement("div");
    state.reorderLineEl.style.cssText = "position:fixed;pointer-events:none;z-index:2147483641;background:rgba(111,168,220,0.7);border-radius:1px;";
    document.documentElement.appendChild(state.reorderLineEl);
  }
  const s = state.reorderLineEl.style;
  s.display = "block";
  s.left = rect.x + "px";
  s.top = rect.y + "px";
  s.width = rect.w + "px";
  s.height = rect.h + "px";
}
function hideReorderLine() {
  if (state.reorderLineEl) state.reorderLineEl.style.display = "none";
}
function showReorderGhost(id3) {
  const el = getEl2(id3);
  if (!el) return;
  const r = el.getBoundingClientRect();
  if (!state.reorderGhostEl) {
    state.reorderGhostEl = document.createElement("div");
    state.reorderGhostEl.style.cssText = "position:fixed;pointer-events:none;z-index:2147483638;background:rgba(111,168,220,0.15);border-radius:4px;";
    document.documentElement.appendChild(state.reorderGhostEl);
  }
  const s = state.reorderGhostEl.style;
  s.display = "block";
  s.left = r.left + "px";
  s.top = r.top + "px";
  s.width = r.width + "px";
  s.height = r.height + "px";
}
function hideReorderGhost() {
  if (state.reorderGhostEl) state.reorderGhostEl.style.display = "none";
}
function startDragTransform(id3) {
  const el = getEl2(id3);
  if (!el) return;
  state.reorderActive = true;
  deactivateControls();
  el.style.position = "relative";
  el.style.zIndex = "2147483642";
  el.style.pointerEvents = "none";
  el.style.opacity = "0.9";
  el.style.transition = "none";
}
var _savedAbsTransform = null;
function updateDragTransform(id3, dx, dy) {
  const el = getEl2(id3);
  if (!el) return;
  const base = _savedAbsTransform;
  el.style.transform = base ? `translate(${dx}px, ${dy}px) ${base}` : `translate(${dx}px, ${dy}px)`;
}
function clearDragTransform(id3) {
  const el = getEl2(id3);
  if (!el) return;
  el.style.position = "";
  el.style.zIndex = "";
  el.style.pointerEvents = "";
  el.style.opacity = "";
  el.style.transform = "";
  el.style.transition = "";
  state.reorderActive = false;
}
function getAbsolutePositionInfo(id3) {
  const el = getEl2(id3);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const isAbsolute = cs.position === "absolute";
  return {
    isAbsolute,
    useBottom: el.style.bottom !== "",
    useRight: el.style.right !== "",
    computedTop: parseFloat(cs.top) || 0,
    computedLeft: parseFloat(cs.left) || 0,
    computedBottom: parseFloat(cs.bottom) || 0,
    computedRight: parseFloat(cs.right) || 0
  };
}
function getElementRect(id3) {
  const el = getEl2(id3);
  if (!el) return null;
  return el.getBoundingClientRect();
}
function getElementQuadById(id3) {
  const el = getEl2(id3);
  if (!el) return null;
  return getElementQuad(el);
}
function startAbsDragTransform(id3) {
  const el = getEl2(id3);
  if (!el) return;
  state.reorderActive = true;
  suspendControls();
  _savedAbsTransform = el.style.transform || null;
  el.style.zIndex = "2147483642";
  el.style.pointerEvents = "none";
  el.style.opacity = "0.9";
  el.style.transition = "none";
}
function clearAbsDragTransform(id3) {
  const el = getEl2(id3);
  if (!el) return;
  el.style.zIndex = "";
  el.style.pointerEvents = "";
  el.style.opacity = "";
  el.style.transform = _savedAbsTransform || "";
  el.style.transition = "";
  _savedAbsTransform = null;
  state.reorderActive = false;
  resumeControls();
}
function syncThemeToPage(vars) {
  state.theme = vars;
  if (state.promptIconEl) {
    state.promptIconEl.style.background = vars.layer || "#1e1e2e";
    state.promptIconEl.style.borderColor = vars.border || "#313244";
    state.promptIconEl.style.color = vars.white || "#cdd6f4";
  }
}
function showPromptIcon(onClick) {
  if (state.promptIconEl) return;
  state._promptIconCallback = onClick ?? null;
  const t = state.theme || {};
  const bg = t.layer || "#1e1e2e";
  const border = t.border || "#313244";
  const fg = t.white || "#cdd6f4";
  const btn = document.createElement("button");
  btn.style.cssText = `position:fixed;pointer-events:auto;z-index:1;width:28px;height:28px;border-radius:6px;border:1px solid ${border};background:${bg};color:${fg};cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);`;
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M12 8v6"/><path d="M9 11h6"/></svg>';
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.selectedId !== null && state._promptIconCallback) {
      state._promptIconCallback(state.selectedId);
    }
  });
  const appendTarget = state.overlayRoot || document.documentElement;
  appendTarget.appendChild(btn);
  state.promptIconEl = btn;
}
function hidePromptIcon() {
  cleanupPrompt();
}
function startContextMenuListener(onMenu) {
  if (state.contextMenuCleanup) return;
  function onContextMenu(e) {
    if (state.selectedId === null) return;
    const el = getPageElementAtPoint(e.clientX, e.clientY);
    if (!el) return;
    const selEl = getEl2(state.selectedId);
    if (!selEl) return;
    if (selEl !== el && !selEl.contains(el)) return;
    e.preventDefault();
    if (onMenu) onMenu({ id: state.selectedId, x: e.clientX, y: e.clientY });
  }
  document.addEventListener("contextmenu", onContextMenu, true);
  state.contextMenuCleanup = () => {
    document.removeEventListener("contextmenu", onContextMenu, true);
    state.contextMenuCleanup = null;
  };
}
function stopContextMenuListener() {
  if (state.contextMenuCleanup) state.contextMenuCleanup();
}
var _idCounter = 0;
function nextId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `kf-${++_idCounter}-${Date.now()}`;
  }
}
function parseKeyframeOffsets(keyText) {
  return keyText.split(",").map((part) => {
    const t = part.trim().toLowerCase();
    if (t === "from") return 0;
    if (t === "to") return 1;
    return parseFloat(t) / 100;
  }).filter((n) => !isNaN(n));
}
function fetchKeyframes() {
  const result = [];
  try {
    const sheets = document.styleSheets;
    for (let s = 0; s < sheets.length; s++) {
      try {
        const rules = sheets[s].cssRules;
        for (let r = 0; r < rules.length; r++) {
          const rule = rules[r];
          if (!(rule instanceof CSSKeyframesRule)) continue;
          const stops = [];
          const propSet = /* @__PURE__ */ new Set();
          for (let k = 0; k < rule.cssRules.length; k++) {
            const kf = rule.cssRules[k];
            const properties = {};
            for (let p = 0; p < kf.style.length; p++) {
              const prop = kf.style[p];
              properties[prop] = kf.style.getPropertyValue(prop);
              propSet.add(prop);
            }
            const offsets = parseKeyframeOffsets(kf.keyText);
            for (const offset of offsets) {
              stops.push({
                id: nextId(),
                offset,
                properties: { ...properties },
                easing: kf.style.getPropertyValue("animation-timing-function") || void 0,
                isEdited: false
              });
            }
          }
          stops.sort((a, b) => a.offset - b.offset);
          result.push({
            name: rule.name,
            stops,
            sourceHref: sheets[s].href,
            propertyNames: Array.from(propSet)
          });
        }
      } catch {
      }
    }
  } catch {
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}
function fetchElementAnimations(id3) {
  const el = getEl2(id3);
  if (!el) return [];
  const cs = getComputedStyle(el);
  const names = cs.animationName.split(",").map((s) => s.trim());
  if (names.length === 0 || names.length === 1 && (!names[0] || names[0] === "none")) return [];
  const durations = cs.animationDuration.split(",").map((s) => s.trim());
  const delays = (cs.animationDelay || "").split(",").map((s) => s.trim());
  const timingFns = cs.getPropertyValue("animation-timing-function").split(",").map((s) => s.trim());
  const fillModes = cs.getPropertyValue("animation-fill-mode").split(",").map((s) => s.trim());
  const directions = cs.getPropertyValue("animation-direction").split(",").map((s) => s.trim());
  const iterations = cs.getPropertyValue("animation-iteration-count").split(",").map((s) => s.trim());
  const timelines = cs.getPropertyValue("animation-timeline").split(",").map((s) => s.trim());
  const rangeStarts = cs.getPropertyValue("animation-range-start").split(",").map((s) => s.trim());
  const rangeEnds = cs.getPropertyValue("animation-range-end").split(",").map((s) => s.trim());
  const result = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (!name || name === "none") continue;
    result.push({
      name,
      duration: parseCssTime(durations[i % durations.length] || "0s"),
      delay: parseCssTime(delays[i % delays.length] || "0s"),
      timingFunction: timingFns[i % timingFns.length] || "ease",
      timeline: timelines[i % timelines.length] || "auto",
      rangeStart: rangeStarts[i % rangeStarts.length] || "normal",
      rangeEnd: rangeEnds[i % rangeEnds.length] || "normal",
      fillMode: fillModes[i % fillModes.length] || "none",
      direction: directions[i % directions.length] || "normal",
      iterationCount: iterations[i % iterations.length] || "1"
    });
  }
  return result;
}
var hasScrollTimelineApi = typeof ScrollTimeline !== "undefined";
function findScrollContainer(el, scroller) {
  if (scroller === "self") return el;
  if (scroller === "root") return document.scrollingElement || document.documentElement;
  let parent = el.parentElement;
  while (parent) {
    const style2 = getComputedStyle(parent);
    const overflowY = style2.overflowY;
    const overflowX = style2.overflowX;
    const isScrollable = (overflowY === "auto" || overflowY === "scroll" || overflowX === "auto" || overflowX === "scroll") && (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth);
    if (isScrollable) return parent;
    parent = parent.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}
function parseCssTime(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return 0;
  if (val.endsWith("ms")) return num / 1e3;
  return num;
}
function previewKeyframes(id3, keyframes2, options) {
  const el = getEl2(id3);
  if (!el) return null;
  cancelPreview();
  state.previewAnimation = el.animate(keyframes2, options);
  return state.previewAnimation;
}
function cancelPreview() {
  if (state.previewAnimation) {
    state.previewAnimation.cancel();
    state.previewAnimation = null;
  }
}
function destroyBridge() {
  cancelPreview();
  cleanupOverlays();
  stopContextMenuListener();
  if (state._bodyObserver) {
    state._bodyObserver.disconnect();
    state._bodyObserver = null;
  }
  if (state._bodyDirtyTimer) {
    clearTimeout(state._bodyDirtyTimer);
    state._bodyDirtyTimer = null;
  }
  if (state._mutationTimer) {
    clearTimeout(state._mutationTimer);
    state._mutationTimer = null;
  }
  state.elements.clear();
  state.previewEls.clear();
  state.localInsertedEls.clear();
  state.nextId = 1;
  state.selectedId = null;
  state.inlineEditActive = false;
  state._promptIconCallback = null;
}

