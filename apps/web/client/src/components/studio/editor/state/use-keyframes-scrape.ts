import { useEffect, useRef } from 'react';
import { useStore } from './use-store';
import { fetchKeyframes, fetchElementAnimations } from './dom-bridge';
import { parseTimelineValue, classifyTrigger } from './types';

export function useKeyframesScrape() {
    const setKeyframesRules = useStore((s) => s.setKeyframesRules);
    const selectKeyframesRule = useStore((s) => s.selectKeyframesRule);
    const selectedNodeId = useStore((s) => s.selectedNodeId);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function scrape() {
        const { creatingAnimation, keyframesRules: existing, selectedKeyframesName } = useStore.getState();
        if (creatingAnimation) return;
        const scraped = fetchKeyframes();
        const scrapedNames = new Set(scraped.map((r) => r.name));
        const userRules = existing.filter((r: any) => r.userCreated && !scrapedNames.has(r.name));
        if (
            userRules.length === 0 &&
            scraped.length === existing.length &&
            scraped.every((r: any, i: number) => existing[i]?.name === r.name)
        ) return;
        const merged = [...scraped, ...userRules];
        setKeyframesRules(merged);
        if (!selectedKeyframesName && merged.length > 0) {
            selectKeyframesRule(merged[0].name);
        } else if (selectedKeyframesName && !merged.find((r: any) => r.name === selectedKeyframesName)) {
            selectKeyframesRule(merged.length > 0 ? merged[0].name : null);
        }
    }

    function debouncedScrape() {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(scrape, 500);
    }

    useEffect(() => {
        if (!selectedNodeId) return;
        const infos = fetchElementAnimations(selectedNodeId);
        const state = useStore.getState();
        if (infos.length === 0) {
            if (state.animationEntries.length > 0) state.setAnimationEntries([]);
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
                duration: info.duration > 0 ? `${info.duration}s` : 'auto',
                easing: info.timingFunction || 'ease',
                fillMode: info.fillMode,
                direction: info.direction,
                iterationCount: info.iterationCount,
                delay: info.delay > 0 ? `${info.delay}s` : '0s',
                viewInsetStart: parsed.insetStart ?? 'auto',
                viewInsetEnd: parsed.insetEnd ?? 'auto',
                scroller: parsed.scroller ?? 'nearest',
                axis: parsed.axis ?? 'block',
            };
        });
        const existing = state.animationEntries;
        const changed =
            entries.length !== existing.length ||
            entries.some(
                (e, i) =>
                    e.name !== existing[i]?.name ||
                    e.trigger !== existing[i]?.trigger ||
                    e.timeline !== existing[i]?.timeline,
            );
        if (changed) state.setAnimationEntries(entries);
        const firstName = infos[0].name;
        if (state.keyframesRules.some((r: any) => r.name === firstName)) {
            if (state.selectedKeyframesName !== firstName) state.selectKeyframesRule(firstName);
            if (infos[0].duration > 0 && state.animDuration !== infos[0].duration) {
                state.setAnimDuration(infos[0].duration);
            }
        }
        const first = entries[0];
        if (first.scroller !== state.animScrollScroller) state.setAnimScrollScroller(first.scroller);
        if (first.axis !== state.animScrollAxis) state.setAnimScrollAxis(first.axis);
        const firstParsed = parseTimelineValue(first.timeline);
        if (firstParsed.type !== state.animTimeline) state.setAnimTimeline(firstParsed.type);
        if (firstParsed.type === 'view') {
            if (first.viewInsetStart !== state.animViewInsetStart) state.setAnimViewInsetStart(first.viewInsetStart);
            if (first.viewInsetEnd !== state.animViewInsetEnd) state.setAnimViewInsetEnd(first.viewInsetEnd);
        }
        if (first.rangeStart !== 'normal' && first.rangeStart !== state.animRangeStart) state.setAnimRangeStart(first.rangeStart);
        if (first.rangeEnd !== 'normal' && first.rangeEnd !== state.animRangeEnd) state.setAnimRangeEnd(first.rangeEnd);
    }, [selectedNodeId]);

    useEffect(() => {
        scrape();
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (let i = 0; i < m.addedNodes.length; i++) {
                    const node = m.addedNodes[i];
                    if (node instanceof HTMLStyleElement || (node instanceof HTMLLinkElement && node.rel === 'stylesheet')) {
                        debouncedScrape();
                        return;
                    }
                }
                for (let i = 0; i < m.removedNodes.length; i++) {
                    const node = m.removedNodes[i];
                    if (node instanceof HTMLStyleElement || (node instanceof HTMLLinkElement && node.rel === 'stylesheet')) {
                        debouncedScrape();
                        return;
                    }
                }
            }
        });
        observer.observe(document.head, { childList: true, subtree: true });
        const interval = setInterval(() => { debouncedScrape(); }, 3000);
        return () => {
            observer.disconnect();
            clearInterval(interval);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);
}
