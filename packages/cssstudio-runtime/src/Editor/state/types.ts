export const AXIS_OPTIONS = ['block', 'inline', 'x', 'y'] as const;
export const SCROLLER_OPTIONS = ['nearest', 'root', 'self'] as const;
export const RANGE_NAME_OPTIONS = [
  'normal',
  'cover',
  'contain',
  'entry',
  'exit',
  'entry-crossing',
  'exit-crossing',
] as const;

export const TRIGGER_LABELS: Record<string, string> = {
  duration: 'Animation',
  scroll: 'Scroll',
  'scroll-enter': 'Scroll Enter',
  'scroll-exit': 'Scroll Exit',
};

export type TimelineType = 'auto' | 'scroll' | 'view';
export type TriggerType = 'duration' | 'scroll' | 'scroll-enter' | 'scroll-exit';

export interface AnimationEntry {
    name: string;
    trigger: TriggerType;
    timeline: string;
    rangeStart: string;
    rangeEnd: string;
    duration: string;
    easing: string;
    fillMode: string;
    direction: string;
    iterationCount: string;
    delay: string;
    viewInsetStart: string;
    viewInsetEnd: string;
    scroller: string;
    axis: string;
}

export function buildTimelineValue(config: { type: TimelineType; scroller?: string; scrollAxis?: string; viewAxis?: string }): string {
    if (config.type === 'scroll') {
        const parts: string[] = [];
        if (config.scroller && config.scroller !== 'nearest') parts.push(config.scroller);
        if (config.scrollAxis && config.scrollAxis !== 'block') parts.push(config.scrollAxis);
        return parts.length ? `scroll(${parts.join(' ')})` : 'scroll()';
    }
    if (config.type === 'view') {
        if (config.viewAxis && config.viewAxis !== 'block') return `view(${config.viewAxis})`;
        return 'view()';
    }
    return 'auto';
}

export function parseTimelineValue(raw: string): { type: TimelineType; scroller?: string; axis?: string; insetStart?: string; insetEnd?: string } {
    const trimmed = raw.trim();
    const SCROLLER_VALUES = new Set(SCROLLER_OPTIONS);
    const AXIS_VALUES = new Set(AXIS_OPTIONS);

    if (trimmed.startsWith('scroll(')) {
        const inner = trimmed.slice(7, -1).trim();
        const tokens = inner.split(/\s+/).filter(Boolean);
        let scroller = 'nearest';
        let axis = 'block';
        for (const t of tokens) {
            if (SCROLLER_VALUES.has(t as any)) scroller = t;
            else if (AXIS_VALUES.has(t as any)) axis = t;
        }
        return { type: 'scroll', scroller, axis };
    }
    if (trimmed.startsWith('view(')) {
        const inner = trimmed.slice(5, -1).trim();
        const tokens = inner.split(/\s+/).filter(Boolean);
        let axis = 'block';
        const insets: string[] = [];
        for (const t of tokens) {
            if (AXIS_VALUES.has(t as any)) axis = t;
            else insets.push(t);
        }
        return { type: 'view', axis, insetStart: insets[0] ?? 'auto', insetEnd: insets[1] ?? insets[0] ?? 'auto' };
    }
    return { type: 'auto' };
}

export function classifyTrigger(timeline: string, rangeStart: string, rangeEnd: string): TriggerType {
    const parsed = parseTimelineValue(timeline);
    if (parsed.type === 'scroll') return 'scroll';
    if (parsed.type === 'view') {
        const rsName = rangeStart.split(/\s+/)[0];
        const reName = rangeEnd.split(/\s+/)[0];
        if (rsName === 'entry' && (reName === 'entry' || reName === 'normal')) return 'scroll-enter';
        if (rsName === 'exit' && (reName === 'exit' || reName === 'normal')) return 'scroll-exit';
        return 'scroll';
    }
    return 'duration';
}

export function triggerDefaults(trigger: TriggerType): AnimationEntry {
    const base: AnimationEntry = {
        name: 'none',
        trigger,
        timeline: 'auto',
        rangeStart: 'normal',
        rangeEnd: 'normal',
        duration: '1s',
        easing: 'ease',
        fillMode: 'both',
        direction: 'normal',
        iterationCount: '1',
        delay: '0s',
        viewInsetStart: 'auto',
        viewInsetEnd: 'auto',
        scroller: 'nearest',
        axis: 'block',
    };
    switch (trigger) {
        case 'scroll':
            return { ...base, timeline: 'scroll()', duration: 'auto' };
        case 'scroll-enter':
            return { ...base, timeline: 'view()', rangeStart: 'entry 0%', rangeEnd: 'entry 100%', duration: 'auto', easing: 'linear' };
        case 'scroll-exit':
            return { ...base, timeline: 'view()', rangeStart: 'exit 0%', rangeEnd: 'exit 100%', duration: 'auto', easing: 'linear' };
        default:
            return base;
    }
}

export function buildAnimationProperties(entries: AnimationEntry[]): Record<string, string> {
    if (entries.length === 0) return {};
    const names: string[] = [], durations: string[] = [], timingFns: string[] = [];
    const delays: string[] = [], fills: string[] = [], directions: string[] = [];
    const iterations: string[] = [], timelines: string[] = [];
    const rangeStarts: string[] = [], rangeEnds: string[] = [], insets: string[] = [];
    let hasRange = false, hasInset = false;

    for (const e of entries) {
        names.push(e.name);
        durations.push(e.duration);
        timingFns.push(e.easing || 'ease');
        delays.push(e.delay);
        fills.push(e.fillMode);
        directions.push(e.direction);
        iterations.push(e.iterationCount);
        timelines.push(e.timeline);
        if (e.rangeStart !== 'normal' || e.rangeEnd !== 'normal') hasRange = true;
        rangeStarts.push(e.rangeStart);
        rangeEnds.push(e.rangeEnd);
        if (e.viewInsetStart !== 'auto' || e.viewInsetEnd !== 'auto') {
            hasInset = true;
            insets.push(`${e.viewInsetStart} ${e.viewInsetEnd}`);
        } else {
            insets.push('auto');
        }
    }

    const result: Record<string, string> = {
        'animation-name': names.join(', '),
        'animation-duration': durations.join(', '),
        'animation-timing-function': timingFns.join(', '),
        'animation-delay': delays.join(', '),
        'animation-fill-mode': fills.join(', '),
        'animation-direction': directions.join(', '),
        'animation-iteration-count': iterations.join(', '),
        'animation-timeline': timelines.join(', '),
    };
    if (hasRange) {
        result['animation-range-start'] = rangeStarts.join(', ');
        result['animation-range-end'] = rangeEnds.join(', ');
    }
    if (hasInset) result['view-timeline-inset'] = insets.join(', ');
    return result;
}
