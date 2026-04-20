import { useState, useCallback, useEffect, useRef } from 'react';
import { PopoverPanel } from '../PopoverPanel';
import { GradientPicker } from './GradientPicker';
import { SelectInput } from '../SelectInput';
import {
  parseCssColor,
  hsvaToRgba,
  rgbaToHsva,
  hsvaToHsla,
  hslaToHsva,
  hsvaToHex,
  hexToHsva,
  hsvaToRgbString,
  formatColor,
  type HSVA,
  type ColorMode,
} from './color-utils';
import type { GradientConfig } from './gradient-utils';
import styles from './ColorPicker.module.css';

const COLOR_MODE_OPTIONS = [
  { value: 'rgba', label: 'RGB' },
  { value: 'hsla', label: 'HSL' },
  { value: 'hex', label: 'Hex' },
  { value: 'custom', label: 'Custom' },
] as const;

const supportsEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

interface ColorPickerProps {
  hsva: HSVA;
  mode: ColorMode;
  anchorRect: DOMRect;
  onChange: (hsva: HSVA) => void;
  onModeChange: (mode: ColorMode) => void;
  onCustomChange?: (raw: string) => void;
  onClose: () => void;
  supportsGradient?: boolean;
  activeTab?: 'color' | 'gradient';
  onTabChange?: (tab: 'color' | 'gradient') => void;
  gradientConfig?: GradientConfig;
  onGradientChange?: (config: GradientConfig) => void;
}

export function ColorPicker({
  hsva,
  mode,
  anchorRect,
  onChange,
  onModeChange,
  onCustomChange,
  onClose,
  supportsGradient,
  activeTab = 'color',
  onTabChange,
  gradientConfig,
  onGradientChange,
}: ColorPickerProps) {
  return (
    <PopoverPanel title="Color" anchorRect={anchorRect} popoverHeight={400} onClose={onClose}>
      {supportsGradient && onTabChange && (
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${activeTab === 'color' ? styles.active : ''}`}
            onClick={() => onTabChange('color')}
          >
            Color
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'gradient' ? styles.active : ''}`}
            onClick={() => onTabChange('gradient')}
          >
            Gradient
          </button>
        </div>
      )}
      {activeTab === 'gradient' && gradientConfig && onGradientChange ? (
        <GradientPicker config={gradientConfig} onChange={onGradientChange} />
      ) : (
        <ColorPickerCore
          hsva={hsva}
          mode={mode}
          onChange={onChange}
          onModeChange={onModeChange}
          onCustomChange={onCustomChange}
        />
      )}
    </PopoverPanel>
  );
}

interface ColorPickerCoreProps {
  hsva: HSVA;
  mode: ColorMode;
  onChange: (hsva: HSVA) => void;
  onModeChange: (mode: ColorMode) => void;
  onCustomChange?: (raw: string) => void;
}

export function ColorPickerCore({ hsva, mode, onChange, onModeChange, onCustomChange }: ColorPickerCoreProps) {
  function dragHandlers(map: (pctX: number, pctY: number) => Partial<HSVA>) {
    const handle = (e: React.PointerEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const pctX = clamp((e.clientX - rect.left) / rect.width);
      const pctY = clamp((e.clientY - rect.top) / rect.height);
      onChange({ ...hsva, ...map(pctX, pctY) });
    };
    return {
      onPointerDown: (e: React.PointerEvent) => {
        handle(e);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
        handle(e);
      },
    };
  }

  const handleEyeDropper = useCallback(async () => {
    try {
      const dropper = new (window as any).EyeDropper();
      const result = await dropper.open();
      const picked = hexToHsva(result.sRGBHex);
      onChange({ ...picked, a: hsva.a });
    } catch {
      // user cancelled
    }
  }, [hsva.a, onChange]);

  const svDrag = dragHandlers((x, y) => ({ s: x, v: 1 - y }));
  const hueDrag = dragHandlers((x) => ({ h: x * 360 }));
  const alphaDrag = dragHandlers((x) => ({ a: x }));
  const solidHex = hsvaToHex({ ...hsva, a: 1 });
  const thumbRgba = hsvaToRgba(hsva);

  return (
    <>
      <div className={styles.visualSection}>
        <div
          className={styles.svArea}
          style={{ backgroundColor: `hsl(${hsva.h}, 100%, 50%)` }}
          {...svDrag}
        >
          <div
            className={styles.thumb}
            style={{
              left: `calc(6px + (100% - 12px) * ${hsva.s})`,
              top: `calc(6px + (100% - 12px) * ${1 - hsva.v})`,
              backgroundColor: `rgb(${thumbRgba.r},${thumbRgba.g},${thumbRgba.b})`,
            }}
          />
        </div>
        <div className={`${styles.sliderTrack} ${styles.hueTrack}`} {...hueDrag}>
          <div className={styles.sliderThumb} style={{ left: `calc(6px + (100% - 12px) * ${hsva.h / 360})` }} />
        </div>
        <div className={`${styles.sliderTrack} ${styles.alphaTrack}`} {...alphaDrag}>
          <div className={styles.alphaGradient} style={{ background: `linear-gradient(to right, transparent, ${solidHex})` }} />
          <div className={styles.sliderThumb} style={{ left: `calc(6px + (100% - 12px) * ${hsva.a})` }} />
        </div>
      </div>
      <ChannelInputs hsva={hsva} mode={mode} onChange={onChange} onCustomChange={onCustomChange} />
      <div className={styles.bottomRow}>
        <div className="min-w-[110px] flex-1">
          <SelectInput
            bare
            value={mode}
            options={COLOR_MODE_OPTIONS}
            onChange={(nextMode) => onModeChange(nextMode as ColorMode)}
          />
        </div>
        {supportsEyeDropper && (
          <button className={styles.eyedropperButton} onClick={handleEyeDropper} title="Pick color from screen">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m2 22 1-1h3l9-9" />
              <path d="M3 21v-3l9-9" />
              <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3L15 6" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}

function ChannelInputs({ hsva, mode, onChange, onCustomChange }: { hsva: HSVA; mode: ColorMode; onChange: (v: HSVA) => void; onCustomChange?: (raw: string) => void }) {
  if (mode === 'custom') return <CustomInput hsva={hsva} onChange={onChange} onCustomChange={onCustomChange} />;
  if (mode === 'hex') return <HexInputs hsva={hsva} onChange={onChange} />;
  if (mode === 'hsla') return <HslaInputs hsva={hsva} onChange={onChange} />;
  return <RgbaInputs hsva={hsva} onChange={onChange} />;
}

function RgbaInputs({ hsva, onChange }: { hsva: HSVA; onChange: (v: HSVA) => void }) {
  const { r, g, b, a } = hsvaToRgba(hsva);
  const update = useCallback((channel: string, raw: string) => {
    const num = parseInt(raw) || 0;
    if (channel === 'a') {
      onChange({ ...hsva, a: clamp(num / 100) });
    } else {
      const rgba = hsvaToRgba(hsva);
      const clamped = Math.max(0, Math.min(255, num));
      const newRgba = { ...rgba, [channel]: clamped };
      onChange(rgbaToHsva(newRgba.r, newRgba.g, newRgba.b, hsva.a, hsva.h));
    }
  }, [hsva, onChange]);
  return (
    <div className={styles.channelGroup}>
      <div className={styles.channelLabels}>
        <span className={styles.channelLabel}>R</span>
        <span className={styles.channelLabel}>G</span>
        <span className={styles.channelLabel}>B</span>
        <span className={styles.channelLabel}>A</span>
      </div>
      <div className={styles.channelRow}>
        <ChannelField value={r} onCommit={(v) => update('r', v)} scrub={{ min: 0, max: 255 }} />
        <ChannelField value={g} onCommit={(v) => update('g', v)} scrub={{ min: 0, max: 255 }} />
        <ChannelField value={b} onCommit={(v) => update('b', v)} scrub={{ min: 0, max: 255 }} />
        <ChannelField value={`${Math.round(a * 100)}%`} onCommit={(v) => update('a', v.replace('%', ''))} scrub={{ min: 0, max: 100, suffix: '%' }} />
      </div>
    </div>
  );
}

function HslaInputs({ hsva, onChange }: { hsva: HSVA; onChange: (v: HSVA) => void }) {
  const { h, s, l, a } = hsvaToHsla(hsva);
  const update = useCallback((channel: string, raw: string) => {
    const num = parseInt(raw) || 0;
    if (channel === 'a') {
      onChange({ ...hsva, a: clamp(num / 100) });
    } else {
      const hsl = hsvaToHsla(hsva);
      const newHsl = { ...hsl, [channel]: num };
      newHsl.h = Math.max(0, Math.min(360, newHsl.h));
      newHsl.s = Math.max(0, Math.min(100, newHsl.s));
      newHsl.l = Math.max(0, Math.min(100, newHsl.l));
      onChange(hslaToHsva(newHsl.h, newHsl.s, newHsl.l, hsva.a));
    }
  }, [hsva, onChange]);
  return (
    <div className={styles.channelGroup}>
      <div className={styles.channelLabels}>
        <span className={styles.channelLabel}>H</span>
        <span className={styles.channelLabel}>S</span>
        <span className={styles.channelLabel}>L</span>
        <span className={styles.channelLabel}>A</span>
      </div>
      <div className={styles.channelRow}>
        <ChannelField value={h} onCommit={(v) => update('h', v)} scrub={{ min: 0, max: 360 }} />
        <ChannelField value={s} onCommit={(v) => update('s', v)} scrub={{ min: 0, max: 100 }} />
        <ChannelField value={l} onCommit={(v) => update('l', v)} scrub={{ min: 0, max: 100 }} />
        <ChannelField value={`${Math.round(a * 100)}%`} onCommit={(v) => update('a', v.replace('%', ''))} scrub={{ min: 0, max: 100, suffix: '%' }} />
      </div>
    </div>
  );
}

function HexInputs({ hsva, onChange }: { hsva: HSVA; onChange: (v: HSVA) => void }) {
  const hex = hsvaToHex({ ...hsva, a: 1 }).slice(1);
  const commitHex = useCallback((raw: string) => {
    const cleaned = raw.replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{4}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(cleaned)) {
      const parsed = hexToHsva('#' + cleaned);
      onChange({ ...parsed, a: hsva.a });
    }
  }, [hsva.a, onChange]);
  const commitAlpha = useCallback((raw: string) => {
    const num = parseInt(raw.replace('%', '')) || 0;
    onChange({ ...hsva, a: clamp(num / 100) });
  }, [hsva, onChange]);
  return (
    <div className={styles.channelGroup}>
      <div className={`${styles.channelLabels} ${styles.twoCol}`}>
        <span className={styles.channelLabel}>Hex</span>
        <span className={styles.channelLabel}>A</span>
      </div>
      <div className={`${styles.channelRow} ${styles.twoCol}`}>
        <ChannelField value={hex} onCommit={commitHex} />
        <ChannelField value={`${Math.round(hsva.a * 100)}%`} onCommit={commitAlpha} scrub={{ min: 0, max: 100, suffix: '%' }} />
      </div>
    </div>
  );
}

function CustomInput({ hsva, onChange, onCustomChange }: { hsva: HSVA; onChange: (v: HSVA) => void; onCustomChange?: (raw: string) => void }) {
  const [local, setLocal] = useState(() => formatColor(hsva, 'rgba'));
  const isFocusedRef = useRef(false);
  useEffect(() => { if (!isFocusedRef.current) setLocal(formatColor(hsva, 'rgba')); }, [hsva]);
  const handleCommit = useCallback(() => {
    const parsed = parseCssColor(local);
    if (parsed) onChange(parsed);
    else onCustomChange?.(local);
  }, [local, onChange, onCustomChange]);
  return (
    <div className={styles.channelRow}>
      <input
        className={styles.customInput}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => { isFocusedRef.current = true; }}
        onBlur={() => { isFocusedRef.current = false; handleCommit(); }}
        onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
      />
    </div>
  );
}

interface ScrubConfig {
  min: number;
  max: number;
  suffix?: string;
}

function ChannelField({ value, onCommit, scrub }: { value: number | string; onCommit: (v: string) => void; scrub?: ScrubConfig }) {
  const [local, setLocal] = useState(String(value));
  const isFocusedRef = useRef(false);
  const dragRef = useRef<{ startX: number; startVal: number } | null>(null);
  useEffect(() => { if (!isFocusedRef.current && !dragRef.current) setLocal(String(value)); }, [value]);
  return (
    <input
      className={`${styles.channelInput} ${scrub ? styles.scrubbable : ''}`}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => { isFocusedRef.current = true; }}
      onBlur={() => { isFocusedRef.current = false; onCommit(local); }}
      onKeyDown={(e) => { if (e.key === 'Enter') onCommit(local); }}
      onPointerDown={scrub ? (e) => {
        if (isFocusedRef.current) return;
        e.preventDefault();
        const numStr = String(value).replace(/[^0-9.\-]/g, '');
        dragRef.current = { startX: e.clientX, startVal: parseFloat(numStr) || 0 };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        document.body.style.cursor = 'ew-resize';
      } : undefined}
      onPointerMove={scrub ? (e) => {
        if (!dragRef.current || !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
        const delta = e.clientX - dragRef.current.startX;
        const clamped = Math.round(Math.max(scrub.min, Math.min(scrub.max, dragRef.current.startVal + delta)));
        const formatted = scrub.suffix ? `${clamped}${scrub.suffix}` : String(clamped);
        setLocal(formatted);
        onCommit(formatted);
      } : undefined}
      onPointerUp={scrub ? (e) => {
        document.body.style.cursor = '';
        const drag = dragRef.current;
        dragRef.current = null;
        if (!drag) return;
        if (Math.abs(e.clientX - drag.startX) < 3) {
          (e.currentTarget as HTMLElement).focus();
          (e.currentTarget as HTMLInputElement).select();
        }
      } : undefined}
    />
  );
}
