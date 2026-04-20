import { useState, useCallback, useEffect, useRef } from 'react';
import { animate } from 'framer-motion';
import { NAMED_EASINGS, serializeTimingFunction } from '../../../utils/parse-transition';
import { defaultSpring, springToCss, type SpringConfig } from '../../../utils/spring';
import { PopoverPanel } from '../PopoverPanel';
import { BezierCurveEditor } from '../BezierCurveEditor';
import { SpringCurve } from '../SpringCurve';
import { SelectInput } from '../SelectInput';
import { NumberInput } from '../NumberInput';
import { EasingInput } from './EasingInput';
import styles from './EasingPopover.module.css';

const EASING_OPTIONS = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'custom'];
const DEFAULT_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

function matchesNamedEasing(bezier: [number, number, number, number]): string {
  for (const [name, values] of Object.entries(NAMED_EASINGS)) {
    if (
      bezier[0] === values[0] &&
      bezier[1] === values[1] &&
      bezier[2] === values[2] &&
      bezier[3] === values[3]
    ) {
      return name;
    }
  }
  return 'custom';
}

interface EasingPopoverProps {
  anchorRect: DOMRect;
  bezier?: [number, number, number, number];
  timingFunction?: string;
  springConfig?: SpringConfig;
  onTimingChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onSpringConfigChange: (config: SpringConfig) => void;
  onClearSpring?: () => void;
  onClose: () => void;
}

export function EasingPopover({
  anchorRect,
  bezier,
  timingFunction,
  springConfig,
  onTimingChange,
  onDurationChange,
  onSpringConfigChange,
  onClearSpring,
  onClose,
}: EasingPopoverProps) {
  const [type, setType] = useState<'easing' | 'spring'>(springConfig ? 'spring' : 'easing');
  const [localBezier, setLocalBezier] = useState<[number, number, number, number]>(
    bezier ?? NAMED_EASINGS['ease'] ?? DEFAULT_EASE,
  );
  const [localSpring, setLocalSpring] = useState<SpringConfig>(
    springConfig ?? { ...defaultSpring },
  );

  const handlePresetChange = useCallback(
    (value: string) => {
      const preset = NAMED_EASINGS[value];
      if (preset) {
        setLocalBezier(preset);
        onTimingChange(serializeTimingFunction(preset));
      }
    },
    [onTimingChange],
  );

  const handleCurveChange = useCallback(
    (newCurve: [number, number, number, number]) => {
      setLocalBezier(newCurve);
      onTimingChange(serializeTimingFunction(newCurve));
    },
    [onTimingChange],
  );

  const updateSpring = useCallback(
    (updates: Partial<SpringConfig>) => {
      const newConfig = { ...localSpring, ...updates };
      setLocalSpring(newConfig);
      onSpringConfigChange(newConfig);
      const css = springToCss(newConfig);
      onTimingChange(css.timingFunction);
      onDurationChange(css.duration);
    },
    [localSpring, onTimingChange, onDurationChange, onSpringConfigChange],
  );

  const handleTypeChange = useCallback(
    (newType: 'easing' | 'spring') => {
      setType(newType);
      if (newType === 'easing') {
        onTimingChange(serializeTimingFunction(localBezier));
        onClearSpring?.();
      } else {
        const css = springToCss(localSpring);
        onTimingChange(css.timingFunction);
        onDurationChange(css.duration);
        onSpringConfigChange(localSpring);
      }
    },
    [
      localBezier,
      localSpring,
      onTimingChange,
      onDurationChange,
      onSpringConfigChange,
      onClearSpring,
    ],
  );

  const springMode = localSpring.type || 'time';
  const selectedPreset = matchesNamedEasing(localBezier);

  return (
    <PopoverPanel
      title="Easing"
      anchorRect={anchorRect}
      popoverHeight={460}
      popoverWidth={300}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3 p-3">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--cs-feint)] p-1">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
              type === 'easing'
                ? 'bg-[var(--cs-feint-solid)] text-[var(--cs-foreground)]'
                : 'text-[var(--cs-secondary-text)] hover:bg-[var(--cs-feint)] hover:text-[var(--cs-foreground)]'
            }`}
            onClick={() => handleTypeChange('easing')}
          >
            Ease
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
              type === 'spring'
                ? 'bg-[var(--cs-feint-solid)] text-[var(--cs-foreground)]'
                : 'text-[var(--cs-secondary-text)] hover:bg-[var(--cs-feint)] hover:text-[var(--cs-foreground)]'
            }`}
            onClick={() => handleTypeChange('spring')}
          >
            Spring
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--cs-border)] bg-[color:color-mix(in_srgb,var(--cs-layer)_86%,black)] p-3">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--cs-secondary-text)]">
            Curve
          </div>
          <div className="aspect-square w-full">
            {type === 'spring' ? (
              <svg width="100%" viewBox="0 0 220 220" style={{ display: 'block' }}>
                <SpringCurve
                  spring={localSpring}
                  width={220}
                  height={220}
                  color="var(--cs-accent)"
                  axisColor="rgba(255, 255, 255, 0.15)"
                  pathWidth={2}
                />
              </svg>
            ) : (
              <BezierCurveEditor
                curve={localBezier}
                onChange={handleCurveChange}
                color="var(--cs-accent)"
                axisColor="rgba(255, 255, 255, 0.15)"
              />
            )}
          </div>
        </div>

        <EasingPreview type={type} bezier={localBezier} spring={localSpring} />

        <div className="flex flex-col gap-2">
          {type === 'easing' ? (
            <>
              <div className="rounded-lg border border-[var(--cs-border)] bg-[var(--cs-layer)]/70 p-2">
                <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--cs-secondary-text)]">
                  Preset
                </div>
                <SelectInput
                  bare
                  value={selectedPreset}
                  options={EASING_OPTIONS}
                  onChange={handlePresetChange}
                />
              </div>
              <div className="rounded-lg border border-[var(--cs-border)] bg-[var(--cs-layer)]/70 p-2">
                <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--cs-secondary-text)]">
                  Cubic Bezier
                </div>
                <EasingInput value={localBezier} onChange={handleCurveChange} />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--cs-feint)] p-1">
                <button
                  type="button"
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
                    springMode === 'time'
                      ? 'bg-[var(--cs-feint-solid)] text-[var(--cs-foreground)]'
                      : 'text-[var(--cs-secondary-text)] hover:bg-[var(--cs-feint)] hover:text-[var(--cs-foreground)]'
                  }`}
                  onClick={() => updateSpring({ type: 'time' })}
                >
                  Time
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
                    springMode === 'physics'
                      ? 'bg-[var(--cs-feint-solid)] text-[var(--cs-foreground)]'
                      : 'text-[var(--cs-secondary-text)] hover:bg-[var(--cs-feint)] hover:text-[var(--cs-foreground)]'
                  }`}
                  onClick={() => updateSpring({ type: 'physics' })}
                >
                  Physics
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {springMode === 'time' ? (
                  <>
                    <SpringSlider
                      label="Duration"
                      value={localSpring.duration ?? defaultSpring.duration}
                      min={0.1}
                      max={2}
                      step={0.05}
                      suffix="s"
                      onChange={(v) => updateSpring({ duration: v })}
                    />
                    <SpringSlider
                      label="Bounce"
                      value={localSpring.bounce ?? defaultSpring.bounce}
                      min={0}
                      max={1}
                      step={0.05}
                      onChange={(v) => updateSpring({ bounce: v })}
                    />
                  </>
                ) : (
                  <>
                    <SpringSlider
                      label="Stiffness"
                      value={localSpring.stiffness ?? defaultSpring.stiffness}
                      min={1}
                      max={2000}
                      step={10}
                      onChange={(v) => updateSpring({ stiffness: v })}
                    />
                    <SpringSlider
                      label="Damping"
                      value={localSpring.damping ?? defaultSpring.damping}
                      min={1}
                      max={500}
                      step={5}
                      onChange={(v) => updateSpring({ damping: v })}
                    />
                    <SpringSlider
                      label="Mass"
                      value={localSpring.mass ?? defaultSpring.mass}
                      min={0.1}
                      max={10}
                      step={0.1}
                      onChange={(v) => updateSpring({ mass: v })}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </PopoverPanel>
  );
}

interface EasingPreviewProps {
  type: 'easing' | 'spring';
  bezier: [number, number, number, number];
  spring: SpringConfig;
}

function EasingPreview({ type, bezier, spring: springCfg }: EasingPreviewProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = useCallback(() => {
    if (!trackRef.current || !dotRef.current) return;
    if (animRef.current) {
      if ('stop' in animRef.current) animRef.current.stop();
      else if ('cancel' in animRef.current) animRef.current.cancel();
      animRef.current = null;
    }
    const travel = trackRef.current.clientWidth - dotRef.current.clientWidth;
    if (type === 'spring') {
      const cfg = { ...defaultSpring, ...springCfg };
      const springMode = cfg.type || 'time';
      const opts =
        springMode === 'physics'
          ? {
              type: 'spring' as const,
              stiffness: cfg.stiffness,
              damping: cfg.damping,
              mass: cfg.mass,
            }
          : {
              type: 'spring' as const,
              bounce: cfg.bounce,
              duration: cfg.duration,
            };
      animRef.current = animate(dotRef.current, { x: [0, travel] }, opts);
    } else {
      const easing = `cubic-bezier(${bezier.join(', ')})`;
      animRef.current = dotRef.current.animate(
        { transform: ['translateX(0)', `translateX(${travel}px)`] },
        { duration: 800, easing, fill: 'forwards' },
      );
    }
  }, [type, bezier, springCfg]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(play, 100);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [play]);

  return (
    <div
      ref={trackRef}
      className={styles.previewTrack}
      onClick={play}
      title="Click to replay"
    >
      <div ref={dotRef} className={styles.previewDot} />
    </div>
  );
}

interface SpringSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}

function SpringSlider({ label, value, min, max, step, suffix, onChange }: SpringSliderProps) {
  return (
    <div className="rounded-lg border border-[var(--cs-border)] bg-[var(--cs-layer)]/70">
      <NumberInput
        displayName={label}
        value={suffix ? `${value}${suffix}` : `${value}`}
        min={min}
        max={max}
        sliderMin={min}
        sliderMax={max}
        step={step}
        unit={suffix ?? ''}
        onChange={(nextValue) => {
          const parsed = Number.parseFloat(nextValue);
          if (!Number.isNaN(parsed)) {
            onChange(parsed);
          }
        }}
      />
    </div>
  );
}
