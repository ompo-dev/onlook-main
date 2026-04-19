// src/Editor/AnimationsPanel/CompactValueKeyframes.tsx
import { jsx as jsx70, jsxs as jsxs54 } from "react/jsx-runtime";
function snapOffset(offset) {
  return Math.round(offset * 100) / 100;
}
function CompactValueKeyframes({ animation, trackWidth }) {
  const { id: propertyId, propertyName, keyframes: keyframes2 } = animation;
  const {
    addKeyframe,
    moveKeyframe,
    deleteKeyframe,
    updateKeyframeValue: updateValue,
    updateKeyframeEasing: updateEasing,
    beginDrag,
    endDrag: endDrag2
  } = useAnimationEdits();
  const selectedKeyframes = useStore2((s) => s.animSelectedKeyframes);
  const selectKeyframe = useStore2((s) => s.selectAnimKeyframe);
  const deselectKeyframes = useStore2((s) => s.deselectAnimKeyframes);
  const [dragOrigin, setDragOrigin] = useState31(null);
  const [isDragging2, setIsDragging] = useState31(false);
  const [ghostOffset, setGhostOffset] = useState31(null);
  const [popoverAnchor, setPopoverAnchor] = useState31(null);
  const rowRef = useRef39(null);
  const markerRefs = useRef39({});
  const orderedKeyframes = sortKeyframesByOffset(keyframes2);
  const selectedKf = selectedKeyframes.find((s) => s.propertyId === propertyId);
  const selectedKfData = selectedKf ? keyframes2[selectedKf.keyframeId] : null;
  useEffect38(() => {
    if (!selectedKf) {
      setPopoverAnchor(null);
      return;
    }
    const el = markerRefs.current[selectedKf.keyframeId];
    if (el) {
      setPopoverAnchor({ keyframeId: selectedKf.keyframeId, rect: el.getBoundingClientRect() });
    }
  }, [selectedKf?.keyframeId, selectedKfData?.offset]);
  useEffect38(() => {
    if (!dragOrigin) return;
    const handleDrag = (e) => {
      const deltaOffset = (e.clientX - dragOrigin.pointerX) / trackWidth;
      const newOffset = snapOffset(Math.max(0, Math.min(1, dragOrigin.offset + deltaOffset)));
      moveKeyframe(propertyId, dragOrigin.keyframeId, newOffset);
      setIsDragging(true);
    };
    const stopDrag = () => {
      setIsDragging(false);
      setDragOrigin(null);
      endDrag2();
    };
    window.addEventListener("pointermove", handleDrag);
    window.addEventListener("pointerup", stopDrag);
    return () => {
      window.removeEventListener("pointermove", handleDrag);
      window.removeEventListener("pointerup", stopDrag);
    };
  }, [dragOrigin, trackWidth, propertyId, moveKeyframe, endDrag2]);
  useEffect38(() => {
    function onKeyDown(e) {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      let el = document.activeElement;
      while (el?.shadowRoot?.activeElement) {
        el = el.shadowRoot.activeElement;
      }
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el?.isContentEditable) return;
      const sel = useStore2.getState().animSelectedKeyframes;
      for (const s of sel) {
        if (s.propertyId === propertyId) {
          e.preventDefault();
          deleteKeyframe(s);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [propertyId, deleteKeyframe]);
  function handlePointerMove(e) {
    if (isDragging2 || dragOrigin || popoverAnchor) return;
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offset = snapOffset((e.clientX - rect.left) / trackWidth);
    if (offset < 0 || offset > 1) {
      setGhostOffset(null);
      return;
    }
    const tooClose = orderedKeyframes.some((kf) => Math.abs(kf.offset - offset) < 0.02);
    setGhostOffset(tooClose ? null : offset);
  }
  function handleClick(e) {
    e.stopPropagation();
    if (popoverAnchor) {
      handlePopoverClose();
      return;
    }
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offset = snapOffset(Math.max(0, Math.min(1, (e.clientX - rect.left) / trackWidth)));
    setGhostOffset(null);
    addKeyframe(propertyId, offset);
  }
  const handlePopoverClose = useCallback41(() => {
    setPopoverAnchor(null);
    deselectKeyframes();
  }, [deselectKeyframes]);
  const markers = [];
  let prevOffset;
  for (const kf of orderedKeyframes) {
    const isSelected = selectedKeyframes.some((s) => s.keyframeId === kf.id);
    if (prevOffset !== void 0) {
      markers.push(
        /* @__PURE__ */ jsx70(
          motion.div,
          {
            className: AnimationsPanel_default.transitionBar,
            initial: false,
            animate: {
              backgroundColor: isSelected ? "var(--cs-accent)" : "var(--cs-feint)"
            },
            transition: { duration: 0.1 },
            style: {
              width: (kf.offset - prevOffset) * trackWidth,
              transform: `translateX(${prevOffset * trackWidth}px)`
            }
          },
          `bar-${kf.id}`
        )
      );
    }
    markers.push(
      /* @__PURE__ */ jsx70(
        "div",
        {
          ref: (el) => {
            markerRefs.current[kf.id] = el;
          },
          className: AnimationsPanel_default.markerContainer,
          onClick: (e) => e.stopPropagation(),
          onPointerDown: (e) => {
            e.stopPropagation();
            selectKeyframe({ propertyId, keyframeId: kf.id });
            beginDrag();
            setDragOrigin({ keyframeId: kf.id, pointerX: e.clientX, offset: kf.offset });
          },
          style: {
            cursor: isDragging2 ? "ew-resize" : "pointer",
            transform: `translateX(${kf.offset * trackWidth}px)`
          },
          children: /* @__PURE__ */ jsx70(
            motion.div,
            {
              className: AnimationsPanel_default.valueMarker,
              initial: false,
              animate: {
                backgroundColor: isSelected ? "var(--cs-accent)" : "var(--cs-white)"
              },
              transition: { duration: 0.1 },
              whileTap: { scale: 0.9 },
              style: { rotate: 45 }
            }
          )
        },
        kf.id
      )
    );
    prevOffset = kf.offset;
  }
  return /* @__PURE__ */ jsxs54(
    "div",
    {
      ref: rowRef,
      className: AnimationsPanel_default.keyframesTrack,
      onPointerMove: handlePointerMove,
      onPointerLeave: () => setGhostOffset(null),
      onClick: handleClick,
      children: [
        markers,
        ghostOffset !== null && /* @__PURE__ */ jsx70(
          "div",
          {
            className: AnimationsPanel_default.markerContainer,
            style: { transform: `translateX(${ghostOffset * trackWidth}px)`, pointerEvents: "none" },
            children: /* @__PURE__ */ jsx70(
              "div",
              {
                className: AnimationsPanel_default.valueMarker,
                style: { rotate: "45deg", opacity: 0.3 }
              }
            )
          }
        ),
        popoverAnchor && selectedKfData && /* @__PURE__ */ jsx70(
          KeyframePopover,
          {
            propertyName,
            value: selectedKfData.properties[propertyName] ?? "",
            offset: selectedKfData.offset,
            easing: selectedKfData.easing,
            springConfig: selectedKfData.springConfig,
            anchorRect: popoverAnchor.rect,
            onChange: (v) => updateValue(propertyId, popoverAnchor.keyframeId, v),
            onEasingChange: (e, sc) => updateEasing(propertyId, popoverAnchor.keyframeId, e, sc),
            onDelete: () => {
              deleteKeyframe({ propertyId, keyframeId: popoverAnchor.keyframeId });
              setPopoverAnchor(null);
            },
            onClose: handlePopoverClose
          }
        )
      ]
    }
  );
}

