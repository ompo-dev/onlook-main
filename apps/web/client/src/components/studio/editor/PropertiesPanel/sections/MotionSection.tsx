import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../../state/use-store';
import {
  NAMED_EASINGS,
  parseTransitions,
  serializeTimingFunction,
  serializeLonghand,
  extractBezier,
  type TransitionEntry,
} from '../../utils/parse-transition';
import { defaultSpring, springToCss, type SpringConfig } from '../../utils/spring';
import {
  TRIGGER_LABELS,
  AXIS_OPTIONS,
  SCROLLER_OPTIONS,
  RANGE_NAME_OPTIONS,
  triggerDefaults,
  type AnimationEntry,
} from '../../state/types';
import { Plus, X } from 'lucide-react';
import { ContextMenu } from '../../ContextMenu';
import { NumberInput } from '../inputs/NumberInput';
import { SelectInput } from '../inputs/SelectInput';
import { TextInput } from '../inputs/TextInput';
import { EasingCurve } from '../inputs/EasingCurve';
import { SpringCurve } from '../inputs/SpringCurve';
import { EasingPopover } from '../inputs/EasingPopover/EasingPopover';
import { MotionCard } from './MotionCard';
import { useFilter, matchesFilter } from '../filter-utils';
import transStyles from './TransitionSection.module.css';
import animStyles from './AnimationSection.module.css';
import cardStyles from './MotionCard.module.css';
import inputStyles from '../inputs/inputs.module.css';

const MOTION_LABELS: Record<string, string> = {
  transition: 'Transition',
  ...TRIGGER_LABELS,
};

const FILL_OPTIONS = ['none', 'forwards', 'backwards', 'both'];
const DIRECTION_OPTIONS = ['normal', 'reverse', 'alternate', 'alternate-reverse'];
const DURATION_UNITS = [
  { unit: 's', min: 0, max: 20, step: 0.1 },
  { unit: 'ms', min: 0, max: 20000, step: 100 },
];
const DELAY_UNITS = [
  { unit: 's', min: -10, max: 10, step: 0.1 },
  { unit: 'ms', min: -10000, max: 10000, step: 100 },
];

const TimelineIcon = (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 5h12" />
    <path d="M4 12h10" />
    <path d="M12 19h8" />
  </svg>
);

function extractBezier2(
  timingFunction: string,
): [number, number, number, number] | null {
  const named = NAMED_EASINGS[timingFunction];
  if (named) return named;
  const match = timingFunction.match(
    /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/,
  );
  if (match) {
    return [
      parseFloat(match[1]),
      parseFloat(match[2]),
      parseFloat(match[3]),
      parseFloat(match[4]),
    ];
  }
  return null;
}

function matchesNamedEasing2(bezier: [number, number, number, number]): string {
  for (const [name, values] of Object.entries(NAMED_EASINGS)) {
    if (
      bezier[0] === values[0] &&
      bezier[1] === values[1] &&
      bezier[2] === values[2] &&
      bezier[3] === values[3]
    )
      return name;
  }
  return 'custom';
}

function getEasingLabel(
  bezier: [number, number, number, number] | null | undefined,
  timingFunction: string,
  springConfig: SpringConfig | null,
): string {
  if (springConfig) return 'spring';
  if (bezier) return matchesNamedEasing2(bezier);
  return timingFunction;
}

function hasNonDefaultSecondary(entry: AnimationEntry): boolean {
  const defaults = triggerDefaults(entry.trigger);
  return (
    entry.fillMode !== defaults.fillMode ||
    entry.iterationCount !== defaults.iterationCount ||
    entry.direction !== defaults.direction ||
    entry.axis !== defaults.axis ||
    entry.scroller !== defaults.scroller ||
    entry.rangeStart !== defaults.rangeStart ||
    entry.rangeEnd !== defaults.rangeEnd ||
    entry.viewInsetStart !== defaults.viewInsetStart ||
    entry.viewInsetEnd !== defaults.viewInsetEnd
  );
}

interface MotionSectionProps {
  getValue: (prop: string) => string;
  onChange: (prop: string, value: string) => void;
  onFocus?: () => void;
}

export function MotionSection({ getValue, onChange, onFocus }: MotionSectionProps) {
  const filter = useFilter();
  const f = (name: string) => matchesFilter(name, filter);

  const transitions = useMemo(() => {
    const parsed = parseTransitions(getValue);
    if (
      parsed.length === 1 &&
      (parsed[0].property === 'none' ||
        (parsed[0].property === 'all' && parsed[0].duration === '0s'))
    ) {
      return [];
    }
    return parsed;
  }, [getValue]);

  const [springConfigs, setSpringConfigs] = useState<Record<number, SpringConfig>>({});

  const updateTransitionProperty = useCallback(
    (index: number, newProp: string) => {
      const props = transitions.map((t, i) => (i === index ? newProp : t.property));
      onChange('transition-property', serializeLonghand(props));
    },
    [transitions, onChange],
  );

  const updateTransitionTiming = useCallback(
    (index: number, newTiming: string) => {
      const timings = transitions.map((t, i) =>
        i === index
          ? newTiming
          : t.bezier
            ? serializeTimingFunction(t.bezier)
            : t.timingFunction,
      );
      onChange('transition-timing-function', serializeLonghand(timings));
    },
    [transitions, onChange],
  );

  const updateTransitionDuration = useCallback(
    (index: number, value: string) => {
      const durations = transitions.map((t, i) => (i === index ? value : t.duration));
      onChange('transition-duration', serializeLonghand(durations));
    },
    [transitions, onChange],
  );

  const updateTransitionDelay = useCallback(
    (index: number, value: string) => {
      const delays = transitions.map((t, i) => (i === index ? value : t.delay));
      onChange('transition-delay', serializeLonghand(delays));
    },
    [transitions, onChange],
  );

  const addTransition = useCallback(() => {
    const props = transitions.map((t) => t.property).concat('all');
    const durations = transitions.map((t) => t.duration).concat('0.15s');
    const timings = transitions
      .map((t) => (t.bezier ? serializeTimingFunction(t.bezier) : t.timingFunction))
      .concat('ease');
    const delays = transitions.map((t) => t.delay).concat('0s');
    onChange('transition-property', serializeLonghand(props));
    onChange('transition-duration', serializeLonghand(durations));
    onChange('transition-timing-function', serializeLonghand(timings));
    onChange('transition-delay', serializeLonghand(delays));
  }, [transitions, onChange]);

  const removeTransition = useCallback(
    (index: number) => {
      if (transitions.length <= 1) {
        onChange('transition-property', 'none');
        onChange('transition-duration', '0s');
        onChange('transition-timing-function', 'ease');
        onChange('transition-delay', '0s');
        return;
      }
      const without = <T,>(arr: T[]) => arr.filter((_, i) => i !== index);
      const props = without(transitions.map((t) => t.property));
      const durations = without(transitions.map((t) => t.duration));
      const timings = without(
        transitions.map((t) =>
          t.bezier ? serializeTimingFunction(t.bezier) : t.timingFunction,
        ),
      );
      const delays = without(transitions.map((t) => t.delay));
      onChange('transition-property', serializeLonghand(props));
      onChange('transition-duration', serializeLonghand(durations));
      onChange('transition-timing-function', serializeLonghand(timings));
      onChange('transition-delay', serializeLonghand(delays));
      setSpringConfigs((prev) => {
        const next: Record<number, SpringConfig> = {};
        for (const [k, v] of Object.entries(prev)) {
          const ki = Number(k);
          if (ki < index) next[ki] = v;
          else if (ki > index) next[ki - 1] = v;
        }
        return next;
      });
    },
    [transitions, onChange],
  );

  const entries = useStore((s) => (s as any).animationEntries as AnimationEntry[]);
  const selectedIndex = useStore((s) => (s as any).selectedAnimationIndex as number | null);
  const rules = useStore((s) => (s as any).keyframesRules as Array<{ name: string }>);
  const addEntry = useStore((s) => (s as any).addAnimationEntry as (type: string) => void);
  const removeEntry = useStore((s) => (s as any).removeAnimationEntry as (index: number) => void);
  const updateEntry = useStore(
    (s) =>
      (s as any).updateAnimationEntry as (index: number, updates: Partial<AnimationEntry>) => void,
  );
  const selectEntry = useStore((s) => (s as any).selectAnimationEntry as (index: number) => void);
  const closeEntry = useStore((s) => (s as any).closeAnimationEntry as () => void);
  const setWriter = useStore(
    (s) =>
      (s as any).setAnimCssWriter as (
        fn: ((prop: string, val: string) => void) | null,
      ) => void,
  );
  const setScrollPreview = useStore(
    (s) => (s as any).setScrollPreviewActive as (active: boolean) => void,
  );

  useEffect(() => {
    if (selectedIndex === null) {
      setScrollPreview(false);
      return;
    }
    const entry = entries[selectedIndex];
    setScrollPreview(!!entry && entry.trigger !== 'duration');
    return () => setScrollPreview(false);
  }, [selectedIndex, entries, setScrollPreview]);

  useEffect(() => {
    setWriter(onChange);
    return () => setWriter(null);
  }, [onChange, setWriter]);

  const timelineOpen = useStore((s) => (s as any).panels?.timeline?.open as boolean | undefined);
  useEffect(() => {
    if (!timelineOpen && (useStore as any).getState().selectedAnimationIndex !== null) {
      closeEntry();
    }
  }, [timelineOpen, closeEntry]);

  useEffect(() => {
    return () => {
      const state = (useStore as any).getState();
      if (state.selectedAnimationIndex !== null) {
        closeEntry();
      }
    };
  }, [closeEntry]);

  const handleNameChange = useCallback(
    (index: number, name: string) => {
      updateEntry(index, { name });
      const state = (useStore as any).getState();
      if (name !== 'none' && state.keyframesRules.some((r: any) => r.name === name)) {
        state.selectKeyframesRule(name);
      }
    },
    [updateEntry],
  );

  const handleUpdate = useCallback(
    (index: number, updates: Partial<AnimationEntry>) => {
      updateEntry(index, updates);
    },
    [updateEntry],
  );

  const [addMenuPos, setAddMenuPos] = useState<{ x: number; y: number } | null>(null);
  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setAddMenuPos({ x: rect.left + rect.width / 2 - 70, y: rect.bottom + 4 });
  }, []);

  const handleAdd = useCallback(
    (type: string) => {
      setAddMenuPos(null);
      if (type === 'transition') {
        addTransition();
      } else {
        addEntry(type);
      }
    },
    [addTransition, addEntry],
  );

  if (
    filter &&
    !(
      f('Motion') ||
      f('Transition') ||
      f('Animation') ||
      f('Easing') ||
      f('Duration') ||
      f('Delay')
    )
  ) {
    return null;
  }

  const ruleNames = rules.map((r) => r.name);

  return (
    <>
      <div className={transStyles.motionList}>
        {transitions.map((t, i) => (
          <TransitionCard
            key={`t-${t.property}-${i}`}
            transition={t}
            springConfig={springConfigs[i] ?? null}
            onPropertyChange={(v) => updateTransitionProperty(i, v)}
            onTimingChange={(v) => updateTransitionTiming(i, v)}
            onDurationChange={(v) => updateTransitionDuration(i, v)}
            onDelayChange={(v) => updateTransitionDelay(i, v)}
            onRemove={() => removeTransition(i)}
            onSpringConfigChange={(c) => setSpringConfigs((prev) => ({ ...prev, [i]: c }))}
            onClearSpringConfig={() =>
              setSpringConfigs((prev) => {
                const next = { ...prev };
                delete next[i];
                return next;
              })
            }
            onFocus={onFocus}
          />
        ))}
        {entries.map((entry, i) => (
          <AnimationCard
            key={`a-${i}`}
            entry={entry}
            index={i}
            selected={selectedIndex === i}
            ruleNames={ruleNames}
            onNameChange={(name) => handleNameChange(i, name)}
            onUpdate={(updates) => handleUpdate(i, updates)}
            onEditKeyframes={() => selectEntry(i)}
            onRemove={() => removeEntry(i)}
            onFocus={onFocus}
          />
        ))}
        <button className={transStyles.addMotionBtn} onClick={handleAddClick} title="Add motion">
          <Plus size={10} />
          Add
        </button>
      </div>
      {addMenuPos && (
        <ContextMenu
          x={addMenuPos.x}
          y={addMenuPos.y}
          items={[
            { label: MOTION_LABELS['transition'], onClick: () => handleAdd('transition') },
            { label: MOTION_LABELS['duration'], onClick: () => handleAdd('duration') },
            { separator: true },
            { label: MOTION_LABELS['scroll'], onClick: () => handleAdd('scroll') },
            { label: MOTION_LABELS['scroll-enter'], onClick: () => handleAdd('scroll-enter') },
            { label: MOTION_LABELS['scroll-exit'], onClick: () => handleAdd('scroll-exit') },
          ]}
          onClose={() => setAddMenuPos(null)}
          animate={true}
          transformOrigin="top center"
        />
      )}
    </>
  );
}

interface TransitionCardProps {
  transition: TransitionEntry;
  springConfig: SpringConfig | null;
  onPropertyChange: (v: string) => void;
  onTimingChange: (v: string) => void;
  onDurationChange: (v: string) => void;
  onDelayChange: (v: string) => void;
  onRemove: () => void;
  onSpringConfigChange: (c: SpringConfig) => void;
  onClearSpringConfig: () => void;
  onFocus?: () => void;
}

function TransitionCard({
  transition,
  springConfig,
  onPropertyChange,
  onTimingChange,
  onDurationChange,
  onDelayChange,
  onRemove,
  onSpringConfigChange,
  onClearSpringConfig,
  onFocus,
}: TransitionCardProps) {
  const { property, duration, timingFunction, delay, bezier } = transition;
  const [popoverOpen, setPopoverOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const anchorRectRef = useRef<DOMRect | null>(null);
  const easingLabel = getEasingLabel(bezier, timingFunction, springConfig);

  const handleTriggerClick = useCallback(() => {
    if (triggerRef.current) {
      anchorRectRef.current = triggerRef.current.getBoundingClientRect();
    }
    setPopoverOpen((prev) => !prev);
    onFocus?.();
  }, [onFocus]);

  const handleClose = useCallback(() => {
    setPopoverOpen(false);
  }, []);

  const commitName = useCallback(() => {
    const input = nameRef.current;
    if (!input) return;
    const trimmed = input.value.trim();
    if (trimmed && trimmed !== property) {
      onPropertyChange(trimmed);
    } else {
      input.value = property;
    }
  }, [property, onPropertyChange]);

  return (
    <MotionCard
      headerLabel="Transition"
      headerContent={
        <input
          key={property}
          ref={nameRef}
          className={transStyles.propertyInput}
          defaultValue={property}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              e.currentTarget.value = property;
              e.currentTarget.blur();
            }
          }}
        />
      }
      headerActions={
        <button className={cardStyles.iconBtn} onClick={onRemove} title="Remove transition">
          <X size={10} />
        </button>
      }
    >
      <div className={transStyles.easingRow}>
        <span className={transStyles.easingLabel}>Easing</span>
        <button
          ref={triggerRef}
          className={transStyles.easingTrigger}
          onClick={handleTriggerClick}
          title="Edit easing"
        >
          <svg className={transStyles.easingPreview} viewBox="0 0 32 32">
            {springConfig ? (
              <SpringCurve
                spring={springConfig}
                width={32}
                height={32}
                left={2}
                top={2}
                right={30}
                bottom={30}
                color="var(--cs-accent)"
                pathWidth={1.5}
              />
            ) : bezier ? (
              <EasingCurve
                curve={bezier}
                width={32}
                height={32}
                left={2}
                top={2}
                right={30}
                bottom={30}
                color="var(--cs-accent)"
                pathWidth={1.5}
              />
            ) : null}
          </svg>
          <span className={transStyles.easingName}>{easingLabel}</span>
        </button>
      </div>
      {popoverOpen && anchorRectRef.current && (
        <EasingPopover
          anchorRect={anchorRectRef.current}
          bezier={bezier ?? undefined}
          timingFunction={timingFunction}
          springConfig={springConfig ?? undefined}
          onTimingChange={onTimingChange}
          onDurationChange={onDurationChange}
          onSpringConfigChange={onSpringConfigChange}
          onClearSpring={onClearSpringConfig}
          onClose={handleClose}
        />
      )}
      <NumberInput
        label="transition-duration"
        displayName="Duration"
        value={duration}
        step={0.05}
        min={0}
        max={10}
        unit="s"
        onChange={onDurationChange}
        onFocus={onFocus}
      />
      <NumberInput
        label="transition-delay"
        displayName="Delay"
        value={delay}
        step={0.05}
        min={0}
        max={10}
        unit="s"
        onChange={onDelayChange}
        onFocus={onFocus}
      />
    </MotionCard>
  );
}

interface AnimNameSelectProps {
  value: string;
  ruleNames: string[];
  onChange: (name: string) => void;
  onFocus?: () => void;
}

function AnimNameSelect({ value, ruleNames, onChange, onFocus }: AnimNameSelectProps) {
  const allOptions = ['none', ...ruleNames.filter((n) => n !== 'none')];
  if (!allOptions.includes(value) && value && value !== 'none') {
    allOptions.unshift(value);
  }
  return (
    <SelectInput
      label=""
      value={value || 'none'}
      options={allOptions}
      onChange={onChange}
      onFocus={onFocus}
    />
  );
}

interface AnimationCardProps {
  entry: AnimationEntry;
  index: number;
  selected: boolean;
  ruleNames: string[];
  onNameChange: (name: string) => void;
  onUpdate: (updates: Partial<AnimationEntry>) => void;
  onEditKeyframes: () => void;
  onRemove: () => void;
  onFocus?: () => void;
}

function AnimationCard({
  entry,
  selected,
  ruleNames,
  onNameChange,
  onUpdate,
  onEditKeyframes,
  onRemove,
  onFocus,
}: AnimationCardProps) {
  const isDuration = entry.trigger === 'duration';
  const [easingPopoverOpen, setEasingPopoverOpen] = useState(false);
  const easingTriggerRef = useRef<HTMLButtonElement>(null);
  const easingAnchorRef = useRef<DOMRect | null>(null);
  const easing = entry.easing || 'ease';
  const bezier = extractBezier2(easing);
  const easingLabel = getEasingLabel(bezier, easing, null);

  const handleEasingTriggerClick = useCallback(() => {
    if (easingTriggerRef.current) {
      easingAnchorRef.current = easingTriggerRef.current.getBoundingClientRect();
    }
    setEasingPopoverOpen((prev) => !prev);
  }, []);

  const handleEasingChange = useCallback(
    (value: string) => {
      onUpdate({ easing: value });
    },
    [onUpdate],
  );

  return (
    <MotionCard
      selected={selected}
      hasNonDefaultSecondary={hasNonDefaultSecondary(entry)}
      headerLabel={TRIGGER_LABELS[entry.trigger]}
      headerContent={
        <AnimNameSelect
          value={entry.name}
          ruleNames={ruleNames}
          onChange={onNameChange}
          onFocus={onFocus}
        />
      }
      headerActions={
        <>
          <button
            className={cardStyles.iconBtn}
            onClick={onEditKeyframes}
            title="Edit keyframes"
          >
            {TimelineIcon}
          </button>
          <button className={cardStyles.iconBtn} onClick={onRemove} title="Remove animation">
            <X size={10} />
          </button>
        </>
      }
      secondaryContent={<AnimationSecondaryFields entry={entry} onUpdate={onUpdate} />}
    >
      <div className={transStyles.easingRow}>
        <span className={transStyles.easingLabel}>Easing</span>
        <button
          ref={easingTriggerRef}
          className={transStyles.easingTrigger}
          onClick={handleEasingTriggerClick}
          title="Edit animation easing"
        >
          <svg className={transStyles.easingPreview} viewBox="0 0 32 32">
            {bezier ? (
              <EasingCurve
                curve={bezier}
                width={32}
                height={32}
                left={2}
                top={2}
                right={30}
                bottom={30}
                color="var(--cs-accent)"
                pathWidth={1.5}
              />
            ) : null}
          </svg>
          <span className={transStyles.easingName}>{easingLabel}</span>
        </button>
      </div>
      {easingPopoverOpen && easingAnchorRef.current && (
        <EasingPopover
          anchorRect={easingAnchorRef.current}
          bezier={bezier ?? undefined}
          timingFunction={easing}
          springConfig={undefined}
          onTimingChange={handleEasingChange}
          onDurationChange={() => {}}
          onSpringConfigChange={() => {}}
          onClose={() => setEasingPopoverOpen(false)}
        />
      )}
      {isDuration && (
        <>
          <NumberInput
            label="Duration"
            value={entry.duration}
            units={DURATION_UNITS}
            onChange={(v) => onUpdate({ duration: v })}
            onFocus={onFocus}
          />
          <NumberInput
            label="Delay"
            value={entry.delay}
            units={DELAY_UNITS}
            onChange={(v) => onUpdate({ delay: v })}
            onFocus={onFocus}
          />
        </>
      )}
    </MotionCard>
  );
}

interface AnimationSecondaryFieldsProps {
  entry: AnimationEntry;
  onUpdate: (updates: Partial<AnimationEntry>) => void;
}

function AnimationSecondaryFields({ entry, onUpdate }: AnimationSecondaryFieldsProps) {
  const isScroll = entry.trigger === 'scroll';
  const isView = entry.trigger === 'scroll-enter' || entry.trigger === 'scroll-exit';

  return (
    <>
      <SelectInput
        label="Fill"
        displayName="Fill"
        value={entry.fillMode}
        options={FILL_OPTIONS}
        onChange={(v) => onUpdate({ fillMode: v })}
      />
      <NumberInput
        label="Iterations"
        displayName="Iterations"
        value={entry.iterationCount}
        min={1}
        max={100}
        step={1}
        unit=""
        showSlider={false}
        onChange={(v) => onUpdate({ iterationCount: v })}
      />
      <SelectInput
        label="Direction"
        displayName="Direction"
        value={entry.direction}
        options={DIRECTION_OPTIONS}
        onChange={(v) => onUpdate({ direction: v })}
      />
      {isScroll && (
        <>
          <SelectInput
            label="Source"
            displayName="Source"
            value={entry.scroller}
            options={[...SCROLLER_OPTIONS]}
            onChange={(v) => onUpdate({ scroller: v })}
          />
          <SelectInput
            label="Axis"
            displayName="Axis"
            value={entry.axis}
            options={[...AXIS_OPTIONS]}
            onChange={(v) => onUpdate({ axis: v })}
          />
        </>
      )}
      {isView && (
        <>
          <SelectInput
            label="Axis"
            displayName="Axis"
            value={entry.axis}
            options={[...AXIS_OPTIONS]}
            onChange={(v) => onUpdate({ axis: v })}
          />
          <RangeRow
            label="Start"
            value={entry.rangeStart}
            onChange={(v) => onUpdate({ rangeStart: v })}
          />
          <RangeRow
            label="End"
            value={entry.rangeEnd}
            onChange={(v) => onUpdate({ rangeEnd: v })}
          />
          <TextInput
            label="Inset start"
            displayName="Inset start"
            value={entry.viewInsetStart}
            onChange={(v) => onUpdate({ viewInsetStart: v })}
          />
          <TextInput
            label="Inset end"
            displayName="Inset end"
            value={entry.viewInsetEnd}
            onChange={(v) => onUpdate({ viewInsetEnd: v })}
          />
        </>
      )}
    </>
  );
}

function parseRangeName(value: string): string {
  const name = value.split(/\s+/)[0];
  return RANGE_NAME_OPTIONS.includes(name) ? name : 'normal';
}

function parseRangeOffset(value: string): string {
  const parts = value.split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

interface RangeRowProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function RangeRow({ label, value, onChange }: RangeRowProps) {
  const name = parseRangeName(value);
  const offset = parseRangeOffset(value) || '0%';
  const [draft, setDraft] = useState(offset);

  useEffect(() => {
    setDraft(offset);
  }, [offset]);

  const commitOffset = () => {
    const trimmed = draft.trim() || '0%';
    const normalized = /%$/.test(trimmed) ? trimmed : `${trimmed}%`;
    setDraft(normalized);
    onChange(`${name} ${normalized}`);
  };

  return (
    <SelectInput
      label={label}
      value={name}
      options={[...RANGE_NAME_OPTIONS]}
      onChange={(v) => onChange(v === 'normal' ? 'normal' : `${v} ${offset}`)}
      endContent={
        name !== 'normal' ? (
          <input
            className={inputStyles.textInput}
            style={{ width: 50, flexShrink: 0 }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitOffset}
            onKeyDown={(e) => { if (e.key === 'Enter') commitOffset(); }}
            placeholder="0%"
          />
        ) : undefined
      }
    />
  );
}
