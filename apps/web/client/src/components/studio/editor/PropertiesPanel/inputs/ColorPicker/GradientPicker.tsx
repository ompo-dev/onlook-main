import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { Toggle } from '../Toggle';
import { NumberInput } from '../NumberInput';
import { SelectInput } from '../SelectInput';
import { parseCssColor, hsvaToRgba, hsvaToHex, type HSVA, type ColorMode } from './color-utils';
import type { GradientConfig, GradientStop } from './gradient-utils';
import styles from './GradientPicker.module.css';

let nextStopId = 1000;
function uid(): string {
  return `stop-${nextStopId++}-${Date.now().toString(36)}`;
}

function getMaxStopPosition(stops: GradientStop[], unit: string): number {
  return unit === 'px' ? Math.max(1, ...stops.map((s) => s.position)) : 100;
}

const POS_UNITS = [
  { unit: '%', min: 0, max: 100, step: 1 },
  { unit: 'px', min: 0, max: 2000, step: 1 },
];

const GRADIENT_TYPES = [
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
  { value: 'conic', label: 'Conic' },
];

interface GradientPickerProps {
  config: GradientConfig;
  onChange: (config: GradientConfig) => void;
}

export function GradientPicker({ config, onChange }: GradientPickerProps) {
  const selectedStop = config.stops.find((s) => s.id === config.selectedStopId);
  const [miniPickerOpen, setMiniPickerOpen] = useState(false);
  const [stopMode, setStopMode] = useState<ColorMode>('hex');
  const [stopHsva, setStopHsva] = useState<HSVA>({ h: 0, s: 0, v: 0, a: 1 });
  const stopHueRef = useRef(0);

  const selectedStopColor = selectedStop?.color;
  const selectedStopId = selectedStop?.id;

  useEffect(() => {
    if (!selectedStopColor) return;
    const parsed = parseCssColor(selectedStopColor);
    if (!parsed) return;
    if (parsed.s > 0 && parsed.v > 0) stopHueRef.current = parsed.h;
    setStopHsva({ ...parsed, h: parsed.s === 0 || parsed.v === 0 ? stopHueRef.current : parsed.h });
  }, [selectedStopId, selectedStopColor]);

  const handleAddStop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      const newStop: GradientStop = { id: uid(), color: '#808080', position: Math.max(0, Math.min(100, pct)) };
      onChange({ ...config, stops: [...config.stops, newStop], selectedStopId: newStop.id });
    },
    [config, onChange],
  );

  const handleSelectStop = useCallback((id: string) => {
    onChange({ ...config, selectedStopId: id });
    setMiniPickerOpen(false);
  }, [config, onChange]);

  const handleStopDrag = useCallback((id: string, position: number) => {
    onChange({ ...config, stops: config.stops.map((s) => s.id === id ? { ...s, position: Math.max(0, Math.min(100, position)) } : s) });
  }, [config, onChange]);

  const handleStopColorChange = useCallback((id: string, color: string) => {
    onChange({ ...config, stops: config.stops.map((s) => s.id === id ? { ...s, color } : s) });
  }, [config, onChange]);

  const handleDeleteStop = useCallback((id: string) => {
    if (config.stops.length <= 2) return;
    const newStops = config.stops.filter((s) => s.id !== id);
    onChange({ ...config, stops: newStops, selectedStopId: config.selectedStopId === id ? newStops[0]?.id ?? null : config.selectedStopId });
    setMiniPickerOpen(false);
  }, [config, onChange]);

  const handleTypeChange = useCallback((type: string) => { onChange({ ...config, type }); }, [config, onChange]);

  const handleRepeatToggle = useCallback((repeating: boolean) => {
    if (repeating) {
      const size = 20;
      onChange({ ...config, repeating, stopUnit: 'px', stops: config.stops.map((s) => ({ ...s, position: Math.round((s.position / 100) * size) })) });
    } else {
      const maxPos = Math.max(1, ...config.stops.map((s) => s.position));
      onChange({ ...config, repeating, stopUnit: '%', stops: config.stops.map((s) => ({ ...s, position: Math.round((s.position / maxPos) * 100) })) });
    }
  }, [config, onChange]);

  const repeatSize = useMemo(() => {
    if (!config.repeating) return 0;
    return Math.max(1, ...config.stops.map((s) => s.position));
  }, [config.repeating, config.stops]);

  const handleRepeatSizeChange = useCallback((raw: string) => {
    const newSize = Math.max(1, parseInt(raw) || 1);
    const oldSize = repeatSize;
    if (oldSize === 0) return;
    onChange({ ...config, stops: config.stops.map((s) => ({ ...s, position: Math.round((s.position / oldSize) * newSize) })) });
  }, [config, onChange, repeatSize]);

  const handleAngleChange = useCallback((raw: string) => {
    onChange({ ...config, angle: parseInt(raw) || 0 });
  }, [config, onChange]);

  const handleShapeChange = useCallback((shape: string) => { onChange({ ...config, shape }); }, [config, onChange]);
  const handlePosXChange = useCallback((raw: string) => { onChange({ ...config, posX: raw }); }, [config, onChange]);
  const handlePosYChange = useCallback((raw: string) => { onChange({ ...config, posY: raw }); }, [config, onChange]);

  const handlePositionChange = useCallback((id: string, raw: string) => {
    const num = parseInt(raw.replace(/[%px]/g, '')) || 0;
    const max = config.stopUnit === 'px' ? 9999 : 100;
    const clamped = Math.max(0, Math.min(max, num));
    onChange({ ...config, stops: config.stops.map((s) => s.id === id ? { ...s, position: clamped } : s) });
  }, [config, onChange]);

  const handleStopHsvaChange = useCallback((newHsva: HSVA) => {
    if (!selectedStop) return;
    if (newHsva.s > 0 && newHsva.v > 0) stopHueRef.current = newHsva.h;
    setStopHsva(newHsva);
    const { r, g, b, a } = hsvaToRgba(newHsva);
    const color = a < 1 ? `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})` : hsvaToHex(newHsva);
    handleStopColorChange(selectedStop.id, color);
  }, [selectedStop, handleStopColorChange]);

  const sortedStops = [...config.stops].sort((a, b) => a.position - b.position);
  const maxPos = getMaxStopPosition(config.stops, config.stopUnit ?? '%');
  const stopPreviewCss = `linear-gradient(to right, ${sortedStops.map((s) => `${s.color} ${(s.position / maxPos) * 100}%`).join(', ')})`;

  return (
    <div className={styles.gradientPicker}>
      <div>
        <div className={styles.previewWrapper}>
          <div className={styles.previewCheckerboard} />
          <div className={styles.previewGradient} style={{ backgroundImage: stopPreviewCss }} onClick={handleAddStop} />
        </div>
        <StopBar
          stops={config.stops}
          selectedId={config.selectedStopId}
          stopUnit={config.stopUnit ?? '%'}
          onSelect={handleSelectStop}
          onDrag={handleStopDrag}
          onDelete={handleDeleteStop}
        />
      </div>
      {selectedStop && (
        <div className={styles.stopEditor}>
          <div className={styles.stopColorRow}>
            <StopSwatch color={selectedStop.color} onClick={() => setMiniPickerOpen((p) => !p)} />
            <StopColorField color={selectedStop.color} onChange={(c) => handleStopColorChange(selectedStop.id, c)} />
            <PositionField position={selectedStop.position} unit={config.stopUnit ?? '%'} onChange={(raw) => handlePositionChange(selectedStop.id, raw)} />
            {config.stops.length > 2 && (
              <button className={styles.deleteStopButton} onClick={() => handleDeleteStop(selectedStop.id)} title="Remove stop">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {miniPickerOpen && (
            <ColorPickerCoreImport hsva={stopHsva} mode={stopMode} onChange={handleStopHsvaChange} onModeChange={setStopMode} />
          )}
        </div>
      )}
      {miniPickerOpen && <div className={styles.divider} />}
      <div className={styles.typeRow}>
        <div className="min-w-0 flex-1">
          <SelectInput
            bare
            value={config.type}
            options={GRADIENT_TYPES}
            onChange={handleTypeChange}
          />
        </div>
        <label className={styles.repeatLabel}>
          <span>Repeat</span>
          <Toggle value={config.repeating} onChange={handleRepeatToggle} />
        </label>
      </div>
      {config.repeating && (
        <NumberInput displayName="Size" value={`${repeatSize}px`} min={1} max={2000} sliderMin={1} sliderMax={200} step={1} unit="px" onChange={handleRepeatSizeChange} />
      )}
      {(config.type === 'linear' || config.type === 'conic') && (
        <NumberInput displayName="Angle" value={`${config.angle}deg`} min={0} max={360} step={1} unit="deg" onChange={handleAngleChange} />
      )}
      {config.type === 'radial' && (
        <>
          <SelectInput
            value={config.shape.startsWith('circle') ? 'circle' : 'ellipse'}
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'ellipse', label: 'Ellipse' },
            ]}
            onChange={handleShapeChange}
          />
          <NumberInput displayName="X" value={config.posX ?? '50%'} units={POS_UNITS} onChange={handlePosXChange} />
          <NumberInput displayName="Y" value={config.posY ?? '50%'} units={POS_UNITS} onChange={handlePosYChange} />
        </>
      )}
    </div>
  );
}

// Lazy import to break circular dep
function ColorPickerCoreImport({ hsva, mode, onChange, onModeChange }: { hsva: HSVA; mode: ColorMode; onChange: (v: HSVA) => void; onModeChange: (m: ColorMode) => void }) {
  // Dynamic require to avoid circular imports; this is an internal-only usage
  const { ColorPickerCore } = require('./ColorPicker');
  return <ColorPickerCore hsva={hsva} mode={mode} onChange={onChange} onModeChange={onModeChange} />;
}

interface StopBarProps {
  stops: GradientStop[];
  selectedId: string | null;
  stopUnit: string;
  onSelect: (id: string) => void;
  onDrag: (id: string, position: number) => void;
  onDelete: (id: string) => void;
}

function StopBar({ stops, selectedId, stopUnit, onSelect, onDrag, onDelete }: StopBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<string | null>(null);
  const maxPos = getMaxStopPosition(stops, stopUnit);

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.preventDefault();
    onSelect(id);
    draggingRef.current = id;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [onSelect]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || !barRef.current) return;
    if (!(e.target as HTMLElement).hasPointerCapture(e.pointerId)) return;
    const rect = barRef.current.getBoundingClientRect();
    const pos = Math.round(((e.clientX - rect.left) / rect.width) * maxPos);
    onDrag(draggingRef.current, pos);
  }, [onDrag, maxPos]);

  const handlePointerUp = useCallback(() => { draggingRef.current = null; }, []);

  return (
    <div ref={barRef} className={styles.stopBar} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      {stops.map((stop) => (
        <div
          key={stop.id}
          className={`${styles.stopThumb} ${stop.id === selectedId ? styles.selected : ''}`}
          style={{ left: `${(stop.position / maxPos) * 100}%`, backgroundColor: stop.color }}
          onPointerDown={(e) => handlePointerDown(e, stop.id)}
          onDoubleClick={() => onDelete(stop.id)}
        />
      ))}
    </div>
  );
}

function StopSwatch({ color, onClick }: { color: string; onClick: () => void }) {
  const isParseable = parseCssColor(color) !== null;
  return (
    <button className={styles.stopSwatch} onClick={onClick}>
      <span className={styles.stopSwatchColor} style={{ backgroundColor: isParseable ? color : 'transparent' }} />
    </button>
  );
}

function StopColorField({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [local, setLocal] = useState(color);
  const isFocusedRef = useRef(false);
  useEffect(() => { if (!isFocusedRef.current) setLocal(color); }, [color]);
  return (
    <input
      className={styles.stopColorInput}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => { isFocusedRef.current = true; }}
      onBlur={() => { isFocusedRef.current = false; onChange(local); }}
      onKeyDown={(e) => { if (e.key === 'Enter') onChange(local); }}
    />
  );
}

function PositionField({ position, unit, onChange }: { position: number; unit: string; onChange: (raw: string) => void }) {
  const [local, setLocal] = useState(`${Math.round(position)}${unit}`);
  const isFocusedRef = useRef(false);
  useEffect(() => { if (!isFocusedRef.current) setLocal(`${Math.round(position)}${unit}`); }, [position, unit]);
  return (
    <input
      className={styles.positionInput}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => { isFocusedRef.current = true; }}
      onBlur={() => { isFocusedRef.current = false; onChange(local); }}
      onKeyDown={(e) => { if (e.key === 'Enter') onChange(local); }}
    />
  );
}
