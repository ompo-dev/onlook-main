// src/Editor/AnimationsPanel/index.tsx
import { jsx as jsx73, jsxs as jsxs57 } from "react/jsx-runtime";
var LABEL_WIDTH = 120;
var TRACK_PADDING = 16;
function AnimationsPanel() {
  useAnimPreview();
  const timelineRef = useRef40(null);
  const [trackWidth, setTrackWidth] = useState33(0);
  const { renameProperty, deleteProperty, addProperty } = useAnimationEdits();
  const rules = useStore2((s) => s.keyframesRules);
  const animations2 = useStore2((s) => s.animValueAnimations);
  const currentTime = useStore2((s) => s.animCurrentTime);
  const deselectKeyframes = useStore2((s) => s.deselectAnimKeyframes);
  const scrubTo = useStore2((s) => s.animScrubTo);
  const stopPlaying = useStore2((s) => s.animStopPlaying);
  const [editingLabel, setEditingLabel] = useState33(null);
  const [addingProperty, setAddingProperty] = useState33(false);
  const hasRules = rules.length > 0;
  const measure = useCallback42(() => {
    const el = timelineRef.current;
    if (!el) return;
    setTrackWidth(Math.max(0, el.clientWidth - LABEL_WIDTH - TRACK_PADDING));
  }, []);
  useLayoutEffect5(() => {
    if (hasRules) measure();
  }, [hasRules, measure]);
  useEffect40(() => {
    if (!hasRules) return;
    const el = timelineRef.current;
    if (!el) return;
    const observer2 = new ResizeObserver(measure);
    observer2.observe(el);
    return () => observer2.disconnect();
  }, [hasRules, measure]);
  const creating = useStore2((s) => s.creatingAnimation);
  if (rules.length === 0 && !creating) {
    return /* @__PURE__ */ jsx73("div", { className: AnimationsPanel_default.empty, children: "No @keyframes found on this page" });
  }
  const scrubberLeft = LABEL_WIDTH + currentTime * trackWidth;
  function handleScrubberDrag(e) {
    e.stopPropagation();
    stopPlaying();
    const timeline = timelineRef.current;
    if (!timeline || trackWidth <= 0) return;
    const rect = timeline.getBoundingClientRect();
    const scrub = (clientX) => {
      const offset = Math.max(0, Math.min(1, (clientX - rect.left - LABEL_WIDTH) / trackWidth));
      scrubTo(offset);
    };
    scrub(e.clientX);
    const onMove = (ev) => scrub(ev.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }
  function handleKeyDown(e) {
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      stopPlaying();
      const offsets = /* @__PURE__ */ new Set([0, 1]);
      for (const anim of animations2) {
        for (const kf of Object.values(anim.keyframes)) {
          offsets.add(kf.offset);
        }
      }
      const sorted = Array.from(offsets).sort((a, b) => a - b);
      if (e.key === "ArrowRight") {
        const next2 = sorted.find((o) => o > currentTime + 1e-3);
        if (next2 !== void 0) scrubTo(next2);
      } else {
        const prev = sorted.findLast((o) => o < currentTime - 1e-3);
        if (prev !== void 0) scrubTo(prev);
      }
    }
  }
  return /* @__PURE__ */ jsxs57("div", { className: AnimationsPanel_default.panel, tabIndex: 0, onKeyDown: handleKeyDown, children: [
    /* @__PURE__ */ jsxs57("div", { className: AnimationsPanel_default.toolbar, children: [
      /* @__PURE__ */ jsx73(CompactPlaybackControls, {}),
      /* @__PURE__ */ jsx73(DurationInput, {}),
      /* @__PURE__ */ jsx73(KeyframesDropdown, {})
    ] }),
    /* @__PURE__ */ jsxs57("div", { className: AnimationsPanel_default.timeline, ref: timelineRef, onClick: deselectKeyframes, children: [
      /* @__PURE__ */ jsx73(CompactTimeMarkers, { trackWidth, labelWidth: LABEL_WIDTH }),
      animations2.map((anim) => /* @__PURE__ */ jsxs57("div", { className: AnimationsPanel_default.propertyRow, children: [
        /* @__PURE__ */ jsxs57(
          "div",
          {
            className: AnimationsPanel_default.propertyLabel,
            title: anim.propertyName,
            onDoubleClick: () => setEditingLabel(anim.id),
            children: [
              editingLabel === anim.id ? /* @__PURE__ */ jsx73(
                EditableInput,
                {
                  initialValue: anim.propertyName,
                  className: AnimationsPanel_default.propertyLabelInput,
                  onCommit: (name) => {
                    if (name && name !== anim.propertyName) {
                      renameProperty(anim.id, name);
                    }
                    setEditingLabel(null);
                  },
                  onCancel: () => setEditingLabel(null)
                }
              ) : anim.propertyName,
              /* @__PURE__ */ jsx73(
                "button",
                {
                  className: AnimationsPanel_default.propertyDelete,
                  onClick: (e) => {
                    e.stopPropagation();
                    deleteProperty(anim.id);
                  },
                  title: "Delete property",
                  children: /* @__PURE__ */ jsx73(XIcon, { size: 10 })
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx73(CompactValueKeyframes, { animation: anim, trackWidth })
      ] }, anim.id)),
      /* @__PURE__ */ jsx73("div", { className: AnimationsPanel_default.addPropertyRow, children: addingProperty ? /* @__PURE__ */ jsx73(
        EditableInput,
        {
          placeholder: "property-name",
          className: AnimationsPanel_default.addPropertyInput,
          onCommit: (name) => {
            if (name) addProperty(name);
            setAddingProperty(false);
          },
          onCancel: () => setAddingProperty(false)
        }
      ) : /* @__PURE__ */ jsxs57(
        "button",
        {
          className: AnimationsPanel_default.addPropertyBtn,
          onClick: (e) => {
            e.stopPropagation();
            setAddingProperty(true);
          },
          children: [
            /* @__PURE__ */ jsx73(PlusIcon, { size: 10 }),
            "Add property"
          ]
        }
      ) }),
      /* @__PURE__ */ jsx73("div", { className: AnimationsPanel_default.scrubber, style: { left: scrubberLeft }, children: /* @__PURE__ */ jsx73("div", { className: AnimationsPanel_default.scrubberHead, onPointerDown: handleScrubberDrag, children: /* @__PURE__ */ jsx73("svg", { width: "9", height: "25", viewBox: "0 0 9 25", children: /* @__PURE__ */ jsx73("path", { d: "M0 0h9v20.5l-4.5 4.5L0 20.5z", fill: "var(--cs-accent)" }) }) }) })
    ] })
  ] });
}

