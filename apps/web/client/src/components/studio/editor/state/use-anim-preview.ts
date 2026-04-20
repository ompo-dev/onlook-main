import { useEffect, useRef } from 'react';
import { useStore } from './use-store';
import { previewKeyframes, cancelPreview, getElement, setStyleProperty, hasScrollTimelineApi, findScrollContainer } from './dom-bridge';
import { buildTimelineValue } from './types';
import { sortKeyframesByOffset } from '../utils/sort-keyframes';

function toCamelCase(prop: string): string {
    return prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function normalizeRange(value: string): string {
    const parts = value.trim().split(/\s+/);
    if (parts.length === 1 && parts[0] !== 'normal') {
        return `${parts[0]} 0%`;
    }
    return value;
}

export function useAnimPreview() {
    const animRef = useRef<Animation | null>(null);
    const prevDurationRef = useRef<number | null>(null);
    const scrollListenerRef = useRef<{ el: EventTarget; handler: () => void } | null>(null);

    const playbackOrigin = useStore((s) => s.animPlaybackOrigin);
    const currentTime = useStore((s) => s.animCurrentTime);
    const duration = useStore((s) => s.animDuration);
    const scrubTo = useStore((s) => s.animScrubTo);
    const stopPlaying = useStore((s) => s.animStopPlaying);
    const selectedNodeId = useStore((s) => s.selectedNodeId);
    const selectedNodeIds = useStore((s) => s.selectedNodeIds);
    const selectedKeyframesName = useStore((s) => s.selectedKeyframesName);
    const animValueAnimations = useStore((s) => s.animValueAnimations);
    const timelineOpen = useStore((s) => s.panels.timeline.open);
    const animTimeline = useStore((s) => s.animTimeline);
    const scrollScroller = useStore((s) => s.animScrollScroller);
    const scrollAxis = useStore((s) => s.animScrollAxis);
    const viewAxis = useStore((s) => s.animViewAxis);
    const viewInsetStart = useStore((s) => s.animViewInsetStart);
    const viewInsetEnd = useStore((s) => s.animViewInsetEnd);
    const rangeStart = useStore((s) => s.animRangeStart);
    const rangeEnd = useStore((s) => s.animRangeEnd);
    const animDirection = useStore((s) => {
        const idx = s.selectedAnimationIndex;
        if (idx === null) return 'normal';
        return s.animationEntries[idx]?.direction ?? 'normal';
    });
    const animFill = useStore((s) => {
        const idx = s.selectedAnimationIndex;
        if (idx === null) return 'both';
        return s.animationEntries[idx]?.fillMode ?? 'both';
    });
    const animIterations = useStore((s) => {
        const idx = s.selectedAnimationIndex;
        if (idx === null) return 1;
        const v = s.animationEntries[idx]?.iterationCount;
        if (!v || v === 'infinite') return 1;
        return parseFloat(v) || 1;
    });

    function cleanupScrollListener() {
        if (scrollListenerRef.current) {
            scrollListenerRef.current.el.removeEventListener('scroll', scrollListenerRef.current.handler);
            scrollListenerRef.current = null;
        }
    }

    function cancelAll() {
        if (animRef.current) {
            try { animRef.current.cancel(); } catch { }
            animRef.current = null;
        }
        cancelPreview();
    }

    useEffect(() => {
        if (!playbackOrigin || animTimeline !== 'auto') return;
        let rafId: number;
        const totalDurationS = duration * animIterations;
        const onFrame = () => {
            const deltaMs = performance.now() - playbackOrigin.startedAt;
            const newOffset = playbackOrigin.originTime + deltaMs / (totalDurationS * 1000);
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

    useEffect(() => {
        cleanupScrollListener();
        if (
            !timelineOpen ||
            !selectedNodeId ||
            selectedNodeIds.length > 1 ||
            !selectedKeyframesName ||
            animValueAnimations.length === 0
        ) {
            cancelAll();
            return;
        }

        const sortedAnims = animValueAnimations.map((anim) => ({
            anim,
            sorted: sortKeyframesByOffset(anim.keyframes),
        }));

        const offsetSet = new Set<number>();
        for (const { sorted } of sortedAnims) {
            for (const kf of sorted) offsetSet.add(kf.offset);
        }
        const offsets = Array.from(offsetSet).sort((a, b) => a - b);

        const wapiKeyframes = offsets.map((offset) => {
            const frame: Record<string, any> = { offset };
            for (const { anim, sorted } of sortedAnims) {
                const match = sorted.find((kf) => kf.offset === offset);
                if (match) {
                    const val = match.properties[anim.propertyName];
                    if (val) {
                        frame[toCamelCase(anim.propertyName)] = val;
                    }
                    if (match.easing && !frame.easing) {
                        frame.easing = match.easing;
                    }
                }
            }
            return frame;
        });

        if (wapiKeyframes.length === 0) {
            cancelAll();
            return;
        }

        if (animTimeline !== 'auto' && hasScrollTimelineApi) {
            const el = getElement(selectedNodeId);
            if (!el) return;
            const scrollSource =
                animTimeline === 'scroll'
                    ? findScrollContainer(el, scrollScroller)
                    : findScrollContainer(el, 'nearest');
            let timeline: any;
            try {
                if (animTimeline === 'scroll') {
                    if (scrollSource) {
                        timeline = new (window as any).ScrollTimeline({ source: scrollSource, axis: scrollAxis });
                    }
                } else if (animTimeline === 'view') {
                    const hasInset = viewInsetStart !== 'auto' || viewInsetEnd !== 'auto';
                    timeline = new (window as any).ViewTimeline({
                        subject: el,
                        axis: viewAxis,
                        ...(hasInset ? { inset: `${viewInsetStart} ${viewInsetEnd}` } : {}),
                    });
                }
            } catch { }

            if (!timeline) {
                cancelAll();
                return;
            }

            cancelAll();
            const options: any = { timeline, duration: 'auto', fill: 'both' };
            if (rangeStart !== 'normal') options.rangeStart = normalizeRange(rangeStart);
            if (rangeEnd !== 'normal') options.rangeEnd = normalizeRange(rangeEnd);
            try {
                const anim = el.animate(wapiKeyframes, options);
                animRef.current = anim;
                if (scrollSource) {
                    let rafPending = false;
                    const handler = () => {
                        if (rafPending) return;
                        rafPending = true;
                        requestAnimationFrame(() => {
                            rafPending = false;
                            try {
                                const ct = anim.currentTime;
                                if (ct !== null && typeof ct === 'object' && 'value' in (ct as any)) {
                                    scrubTo(Math.max(0, Math.min(1, (ct as any).to('percent').value / 100)));
                                } else if (typeof ct === 'number') {
                                    scrubTo(Math.max(0, Math.min(1, ct / 100)));
                                }
                            } catch { }
                        });
                    };
                    const scrollTarget =
                        scrollSource === document.documentElement || scrollSource === document.body
                            ? window
                            : scrollSource;
                    scrollTarget.addEventListener('scroll', handler, { passive: true });
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

        const durationMs = duration * 1000;
        const totalMs = durationMs * animIterations;
        const anim = previewKeyframes(selectedNodeId, wapiKeyframes, {
            duration: durationMs,
            fill: animFill as FillMode,
            direction: animDirection as PlaybackDirection,
            iterations: animIterations,
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
        animIterations,
    ]);

    useEffect(() => {
        if (!animRef.current) return;
        if (animTimeline !== 'auto') return;
        animRef.current.currentTime = currentTime * duration * animIterations * 1000;
    }, [currentTime, duration, animIterations, animTimeline]);

    useEffect(() => {
        if (!selectedNodeId || prevDurationRef.current === null) {
            prevDurationRef.current = duration;
            return;
        }
        if (duration === prevDurationRef.current) return;
        prevDurationRef.current = duration;
        setStyleProperty(selectedNodeId, 'animation-duration', duration + 's');
        const styles = { ...useStore.getState().computedStyles };
        styles['animation-duration'] = duration + 's';
        useStore.getState().setComputedStyles(styles);
    }, [duration, selectedNodeId]);

    const prevTimelineRef = useRef<string | null>(null);
    useEffect(() => {
        if (!selectedNodeId) return;
        const css = buildTimelineValue({ type: animTimeline, scroller: scrollScroller, scrollAxis, viewAxis });
        if (prevTimelineRef.current === null) {
            prevTimelineRef.current = css;
            return;
        }
        if (css === prevTimelineRef.current) return;
        prevTimelineRef.current = css;
        setStyleProperty(selectedNodeId, 'animation-timeline', css);
        if (animTimeline !== 'auto') {
            setStyleProperty(selectedNodeId, 'animation-duration', 'auto');
        }
    }, [selectedNodeId, animTimeline, scrollScroller, scrollAxis, viewAxis]);
}
