// src/Editor/state/use-anim-preview.ts
function useAnimPreview() {
  const animRef = useRef35(null);
  const prevDurationRef = useRef35(null);
  const scrollListenerRef = useRef35(null);
  const playbackOrigin = useStore2((s) => s.animPlaybackOrigin);
  const currentTime = useStore2((s) => s.animCurrentTime);
  const duration = useStore2((s) => s.animDuration);
  const scrubTo = useStore2((s) => s.animScrubTo);
  const stopPlaying = useStore2((s) => s.animStopPlaying);
  const selectedNodeId = useStore2((s) => s.selectedNodeId);
  const selectedNodeIds = useStore2((s) => s.selectedNodeIds);
  const selectedKeyframesName = useStore2((s) => s.selectedKeyframesName);
  const animValueAnimations = useStore2((s) => s.animValueAnimations);
  const timelineOpen = useStore2((s) => s.panels.timeline.open);
  const animTimeline = useStore2((s) => s.animTimeline);
  const scrollScroller = useStore2((s) => s.animScrollScroller);
  const scrollAxis = useStore2((s) => s.animScrollAxis);
  const viewAxis = useStore2((s) => s.animViewAxis);
  const viewInsetStart = useStore2((s) => s.animViewInsetStart);
  const viewInsetEnd = useStore2((s) => s.animViewInsetEnd);
  const rangeStart = useStore2((s) => s.animRangeStart);
  const rangeEnd = useStore2((s) => s.animRangeEnd);
  const animDirection = useStore2((s) => {
    const idx = s.selectedAnimationIndex;
    if (idx === null) return "normal";
    return s.animationEntries[idx]?.direction ?? "normal";
  });
  const animFill = useStore2((s) => {
    const idx = s.selectedAnimationIndex;
    if (idx === null) return "both";
    return s.animationEntries[idx]?.fillMode ?? "both";
  });
  const animIterations = useStore2((s) => {
    const idx = s.selectedAnimationIndex;
    if (idx === null) return 1;
    const v = s.animationEntries[idx]?.iterationCount;
    if (!v || v === "infinite") return 1;
    return parseFloat(v) || 1;
  });
  function cleanupScrollListener() {
    if (scrollListenerRef.current) {
      scrollListenerRef.current.el.removeEventListener("scroll", scrollListenerRef.current.handler);
      scrollListenerRef.current = null;
    }
  }
  function cancelAll() {
    if (animRef.current) {
      try {
        animRef.current.cancel();
      } catch {
      }
      animRef.current = null;
    }
    cancelPreview();
  }
  useEffect35(() => {
    if (!playbackOrigin || animTimeline !== "auto") return;
    let rafId;
    const totalDurationS = duration * animIterations;
    const onFrame = () => {
      const deltaMs = performance.now() - playbackOrigin.startedAt;
      const newOffset = playbackOrigin.originTime + deltaMs / (totalDurationS * 1e3);
      if (newOffset >= 1) {
        scrubTo(1);
        stopPlaying();
        return;
      }
      scrubTo(newOffset);
      rafId = requestAnimationFrame(onFrame);
    };
    rafId = requestAnimationFrame(onFrame);
    return () => cancelAnimationFrame(rafId);
  }, [playbackOrigin, duration, animIterations, scrubTo, stopPlaying, animTimeline]);
  useEffect35(() => {
    cleanupScrollListener();
    if (!timelineOpen || !selectedNodeId || selectedNodeIds.length > 1 || !selectedKeyframesName || animValueAnimations.length === 0) {
      cancelAll();
      return;
    }
    const sortedAnims = animValueAnimations.map((anim2) => ({
      anim: anim2,
      sorted: sortKeyframesByOffset(anim2.keyframes)
    }));
    const offsetSet = /* @__PURE__ */ new Set();
    for (const { sorted } of sortedAnims) {
      for (const kf of sorted) offsetSet.add(kf.offset);
    }
    const offsets = Array.from(offsetSet).sort((a, b) => a - b);
    const wapiKeyframes = offsets.map((offset) => {
      const frame2 = { offset };
      for (const { anim: anim2, sorted } of sortedAnims) {
        const match = sorted.find((kf) => kf.offset === offset);
        if (match) {
          const val = match.properties[anim2.propertyName];
          if (val) {
            frame2[toCamelCase(anim2.propertyName)] = val;
          }
          if (match.easing && !frame2.easing) {
            frame2.easing = match.easing;
          }
        }
      }
      return frame2;
    });
    if (wapiKeyframes.length === 0) {
      cancelAll();
      return;
    }
    if (animTimeline !== "auto" && hasScrollTimelineApi) {
      const el = getElement(selectedNodeId);
      if (!el) return;
      const scrollSource = animTimeline === "scroll" ? findScrollContainer(el, scrollScroller) : findScrollContainer(el, "nearest");
      let timeline;
      try {
        if (animTimeline === "scroll") {
          if (scrollSource) {
            timeline = new ScrollTimeline({ source: scrollSource, axis: scrollAxis });
          }
        } else if (animTimeline === "view") {
          const hasInset = viewInsetStart !== "auto" || viewInsetEnd !== "auto";
          timeline = new ViewTimeline({
            subject: el,
            axis: viewAxis,
            ...hasInset ? { inset: `${viewInsetStart} ${viewInsetEnd}` } : {}
          });
        }
      } catch {
      }
      if (!timeline) {
        cancelAll();
        return;
      }
      cancelAll();
      const options = {
        timeline,
        duration: "auto",
        fill: "both"
      };
      if (rangeStart !== "normal") options.rangeStart = normalizeRange(rangeStart);
      if (rangeEnd !== "normal") options.rangeEnd = normalizeRange(rangeEnd);
      try {
        const anim2 = el.animate(wapiKeyframes, options);
        animRef.current = anim2;
        if (scrollSource) {
          let rafPending = false;
          const handler = () => {
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(() => {
              rafPending = false;
              try {
                const ct = anim2.currentTime;
                if (ct !== null && typeof ct === "object" && "value" in ct) {
                  scrubTo(Math.max(0, Math.min(1, ct.to("percent").value / 100)));
                } else if (typeof ct === "number") {
                  scrubTo(Math.max(0, Math.min(1, ct / 100)));
                }
              } catch {
              }
            });
          };
          const scrollTarget = scrollSource === document.documentElement || scrollSource === document.body ? window : scrollSource;
          scrollTarget.addEventListener("scroll", handler, { passive: true });
          scrollListenerRef.current = { el: scrollTarget, handler };
        }
      } catch {
        cancelAll();
      }
      return () => {
        cleanupScrollListener();
        cancelAll();
      };
    }
    const durationMs = duration * 1e3;
    const totalMs = durationMs * animIterations;
    const anim = previewKeyframes(selectedNodeId, wapiKeyframes, {
      duration: durationMs,
      fill: animFill,
      direction: animDirection,
      iterations: animIterations
    });
    if (anim) {
      anim.pause();
      anim.currentTime = currentTime * totalMs;
      animRef.current = anim;
    }
    return () => {
      cleanupScrollListener();
      cancelAll();
    };
  }, [
    timelineOpen,
    selectedNodeId,
    selectedNodeIds.length,
    selectedKeyframesName,
    animValueAnimations,
    duration,
    animTimeline,
    scrollScroller,
    scrollAxis,
    viewAxis,
    viewInsetStart,
    viewInsetEnd,
    rangeStart,
    rangeEnd,
    animDirection,
    animFill,
    animIterations
  ]);
  useEffect35(() => {
    if (!animRef.current) return;
    if (animTimeline !== "auto") return;
    animRef.current.currentTime = currentTime * duration * animIterations * 1e3;
  }, [currentTime, duration, animIterations, animTimeline]);
  useEffect35(() => {
    if (!selectedNodeId || prevDurationRef.current === null) {
      prevDurationRef.current = duration;
      return;
    }
    if (duration === prevDurationRef.current) return;
    prevDurationRef.current = duration;
    setStyleProperty(selectedNodeId, "animation-duration", duration + "s");
    const styles = { ...useStore2.getState().computedStyles };
    styles["animation-duration"] = duration + "s";
    useStore2.getState().setComputedStyles(styles);
  }, [duration, selectedNodeId]);
  const prevTimelineRef = useRef35(null);
  useEffect35(() => {
    if (!selectedNodeId) return;
    const css2 = buildTimelineValue({ type: animTimeline, scroller: scrollScroller, scrollAxis, viewAxis });
    if (prevTimelineRef.current === null) {
      prevTimelineRef.current = css2;
      return;
    }
    if (css2 === prevTimelineRef.current) return;
    prevTimelineRef.current = css2;
    setStyleProperty(selectedNodeId, "animation-timeline", css2);
    if (animTimeline !== "auto") {
      setStyleProperty(selectedNodeId, "animation-duration", "auto");
    }
  }, [selectedNodeId, animTimeline, scrollScroller, scrollAxis, viewAxis]);
}
function toCamelCase(prop) {
  return prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
function normalizeRange(value) {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1 && parts[0] !== "normal") {
    return `${parts[0]} 0%`;
  }
  return value;
}

