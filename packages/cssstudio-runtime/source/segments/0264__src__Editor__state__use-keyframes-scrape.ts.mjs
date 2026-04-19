// src/Editor/state/use-keyframes-scrape.ts
import { useEffect as useEffect7, useRef as useRef5 } from "react";
function useKeyframesScrape() {
  const setKeyframesRules = useStore2((s) => s.setKeyframesRules);
  const selectKeyframesRule = useStore2((s) => s.selectKeyframesRule);
  const selectedNodeId = useStore2((s) => s.selectedNodeId);
  const debounceRef = useRef5(null);
  function scrape() {
    const { creatingAnimation, keyframesRules: existing, selectedKeyframesName } = useStore2.getState();
    if (creatingAnimation) return;
    const scraped = fetchKeyframes();
    const scrapedNames = new Set(scraped.map((r) => r.name));
    const userRules = existing.filter((r) => r.userCreated && !scrapedNames.has(r.name));
    if (userRules.length === 0 && scraped.length === existing.length && scraped.every((r, i) => existing[i]?.name === r.name)) {
      return;
    }
    const merged = [...scraped, ...userRules];
    setKeyframesRules(merged);
    if (!selectedKeyframesName && merged.length > 0) {
      selectKeyframesRule(merged[0].name);
    } else if (selectedKeyframesName && !merged.find((r) => r.name === selectedKeyframesName)) {
      selectKeyframesRule(merged.length > 0 ? merged[0].name : null);
    }
  }
  function debouncedScrape() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(scrape, 500);
  }
  useEffect7(() => {
    if (!selectedNodeId) return;
    const infos = fetchElementAnimations(selectedNodeId);
    const state2 = useStore2.getState();
    if (infos.length === 0) {
      if (state2.animationEntries.length > 0) {
        state2.setAnimationEntries([]);
      }
      return;
    }
    const entries = infos.map((info) => {
      const trigger = classifyTrigger(info.timeline, info.rangeStart, info.rangeEnd);
      const parsed = parseTimelineValue(info.timeline);
      return {
        name: info.name,
        trigger,
        timeline: info.timeline,
        rangeStart: info.rangeStart,
        rangeEnd: info.rangeEnd,
        duration: info.duration > 0 ? `${info.duration}s` : "auto",
        easing: info.timingFunction || "ease",
        fillMode: info.fillMode,
        direction: info.direction,
        iterationCount: info.iterationCount,
        delay: info.delay > 0 ? `${info.delay}s` : "0s",
        viewInsetStart: parsed.insetStart ?? "auto",
        viewInsetEnd: parsed.insetEnd ?? "auto",
        scroller: parsed.scroller ?? "nearest",
        axis: parsed.axis ?? "block"
      };
    });
    const existing = state2.animationEntries;
    const changed = entries.length !== existing.length || entries.some((e, i) => e.name !== existing[i]?.name || e.trigger !== existing[i]?.trigger || e.timeline !== existing[i]?.timeline);
    if (changed) {
      state2.setAnimationEntries(entries);
    }
    const firstName = infos[0].name;
    if (state2.keyframesRules.some((r) => r.name === firstName)) {
      if (state2.selectedKeyframesName !== firstName) {
        state2.selectKeyframesRule(firstName);
      }
      if (infos[0].duration > 0 && state2.animDuration !== infos[0].duration) {
        state2.setAnimDuration(infos[0].duration);
      }
    }
    const first = entries[0];
    if (first.scroller !== state2.animScrollScroller) state2.setAnimScrollScroller(first.scroller);
    if (first.axis !== state2.animScrollAxis) state2.setAnimScrollAxis(first.axis);
    const firstParsed = parseTimelineValue(first.timeline);
    if (firstParsed.type !== state2.animTimeline) state2.setAnimTimeline(firstParsed.type);
    if (firstParsed.type === "view") {
      if (first.viewInsetStart !== state2.animViewInsetStart) state2.setAnimViewInsetStart(first.viewInsetStart);
      if (first.viewInsetEnd !== state2.animViewInsetEnd) state2.setAnimViewInsetEnd(first.viewInsetEnd);
    }
    if (first.rangeStart !== "normal" && first.rangeStart !== state2.animRangeStart) state2.setAnimRangeStart(first.rangeStart);
    if (first.rangeEnd !== "normal" && first.rangeEnd !== state2.animRangeEnd) state2.setAnimRangeEnd(first.rangeEnd);
  }, [selectedNodeId]);
  useEffect7(() => {
    scrape();
    const observer2 = new MutationObserver((mutations) => {
      for (const m2 of mutations) {
        for (let i = 0; i < m2.addedNodes.length; i++) {
          const node = m2.addedNodes[i];
          if (node instanceof HTMLStyleElement || node instanceof HTMLLinkElement && node.rel === "stylesheet") {
            debouncedScrape();
            return;
          }
        }
        for (let i = 0; i < m2.removedNodes.length; i++) {
          const node = m2.removedNodes[i];
          if (node instanceof HTMLStyleElement || node instanceof HTMLLinkElement && node.rel === "stylesheet") {
            debouncedScrape();
            return;
          }
        }
      }
    });
    observer2.observe(document.head, { childList: true, subtree: true });
    const interval = setInterval(() => {
      debouncedScrape();
    }, 3e3);
    return () => {
      observer2.disconnect();
      clearInterval(interval);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);
}

