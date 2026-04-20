import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { ColorPicker } from './ColorPicker/ColorPicker';
import {
  parseCssColor,
  formatColor,
  detectColorMode,
  hsvaToRgba,
  type HSVA,
  type ColorMode,
} from './ColorPicker/color-utils';
import { parseGradient, serializeGradient, createDefaultGradient, isGradientValue, type GradientConfig } from './ColorPicker/gradient-utils';
import styles from './inputs.module.css';

const DEFAULT_HSVA: HSVA = { h: 0, s: 0, v: 0, a: 1 };

interface ColorInputProps {
  label: string;
  displayName?: string;
  value: string;
  mono?: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
  supportsGradient?: boolean;
  onPropertyChange?: (prop: string, value: string) => void;
  onLabelDoubleClick?: () => void;
  labelOverride?: ReactNode;
}

export function ColorInput({
  label,
  displayName,
  value,
  mono,
  onChange,
  onFocus,
  supportsGradient,
  onPropertyChange,
  onLabelDoubleClick,
  labelOverride,
}: ColorInputProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hsva, setHsva] = useState<HSVA>(() => parseCssColor(value) ?? DEFAULT_HSVA);
  const [mode, setMode] = useState<ColorMode>(() => detectColorMode(value));
  const [localText, setLocalText] = useState(value);
  const hueRef = useRef(hsva.h);
  const isEditingRef = useRef(false);
  const swatchRef = useRef<HTMLButtonElement>(null);
  const anchorRectRef = useRef<DOMRect | null>(null);
  const [activeTab, setActiveTab] = useState<'color' | 'gradient'>(() => isGradientValue(value) ? 'gradient' : 'color');
  const [gradientConfig, setGradientConfig] = useState<GradientConfig>(() => parseGradient(value) ?? createDefaultGradient());

  function updateHsva(parsed: HSVA) {
    if (parsed.s > 0 && parsed.v > 0) hueRef.current = parsed.h;
    setHsva({ ...parsed, h: parsed.s === 0 || parsed.v === 0 ? hueRef.current : parsed.h });
  }

  useEffect(() => {
    if (isEditingRef.current) return;
    if (isGradientValue(value)) {
      const parsed = parseGradient(value);
      if (parsed) setGradientConfig(parsed);
      setActiveTab('gradient');
    } else {
      const parsed = parseCssColor(value);
      if (parsed) updateHsva(parsed);
      setActiveTab('color');
    }
    setLocalText(value);
  }, [value]);

  const handleTabChange = useCallback((tab: 'color' | 'gradient') => {
    setActiveTab(tab);
    isEditingRef.current = true;
    if (tab === 'gradient') {
      const currentColor = formatColor(hsva, mode);
      const config = createDefaultGradient(currentColor);
      setGradientConfig(config);
      const css = serializeGradient(config);
      setLocalText(css);
      onPropertyChange?.('background', css);
    } else {
      const css = formatColor(hsva, mode);
      setLocalText(css);
      onPropertyChange?.('background-color', css);
    }
  }, [hsva, mode, onPropertyChange]);

  const handleGradientChange = useCallback((config: GradientConfig) => {
    setGradientConfig(config);
    isEditingRef.current = true;
    const css = serializeGradient(config);
    setLocalText(css);
    onPropertyChange?.('background', css);
  }, [onPropertyChange]);

  const handlePickerChange = useCallback((newHsva: HSVA) => {
    if (newHsva.s > 0 && newHsva.v > 0) hueRef.current = newHsva.h;
    setHsva(newHsva);
    isEditingRef.current = true;
    const css = formatColor(newHsva, mode);
    setLocalText(css);
    onChange(css);
  }, [mode, onChange]);

  const handleModeChange = useCallback((newMode: ColorMode) => {
    setMode(newMode);
    if (newMode !== 'custom') {
      const css = formatColor(hsva, newMode);
      setLocalText(css);
      onChange(css);
    }
  }, [hsva, onChange]);

  const handleCustomChange = useCallback((raw: string) => {
    setLocalText(raw);
    onChange(raw);
  }, [onChange]);

  const commitText = useCallback((text: string) => {
    const val = text.toLowerCase() === 'none' ? 'transparent' : text;
    onChange(val);
    const parsed = parseCssColor(val);
    if (parsed) updateHsva(parsed);
  }, [onChange]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalText(e.target.value);
  }, []);

  const handleTextFocus = useCallback(() => {
    isEditingRef.current = true;
    onFocus?.();
  }, [onFocus]);

  const handleTextBlur = useCallback(() => {
    isEditingRef.current = false;
    if (localText !== value) commitText(localText);
  }, [localText, value, commitText]);

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitText(localText);
  }, [localText, commitText]);

  const handleSwatchClick = useCallback(() => {
    if (swatchRef.current) {
      anchorRectRef.current = swatchRef.current.getBoundingClientRect();
    }
    setPickerOpen((prev) => !prev);
    onFocus?.();
  }, [onFocus]);

  const handleClose = useCallback(() => {
    setPickerOpen(false);
    isEditingRef.current = false;
  }, []);

  const isGradient = activeTab === 'gradient';
  const isValid = isGradient ? isGradientValue(value) : parseCssColor(value) !== null;
  const displayLabel = displayName || label;
  const swatchRgba = hsvaToRgba(hsva);
  const swatchStyle = isGradient
    ? { backgroundImage: serializeGradient(gradientConfig) }
    : { backgroundColor: `rgba(${swatchRgba.r},${swatchRgba.g},${swatchRgba.b},${swatchRgba.a})` };

  return (
    <div className={styles.row}>
      {labelOverride ?? (
        <label
          className={`${styles.label} ${mono ? styles.mono : ''}`}
          onDoubleClick={onLabelDoubleClick}
        >
          {displayLabel}
        </label>
      )}
      <div className={styles.colorGroup}>
        <div className={styles.swatchWrapper}>
          {!isValid && !isGradient && <div className={styles.emptyColorSwatch} />}
          <button ref={swatchRef} className={styles.swatchButton} onClick={handleSwatchClick}>
            <span className={styles.swatchColor} style={isValid || isGradient ? swatchStyle : undefined} />
          </button>
        </div>
        <input
          type="text"
          className={styles.colorText}
          value={localText}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          onKeyDown={handleTextKeyDown}
          onFocus={handleTextFocus}
        />
      </div>
      {pickerOpen && anchorRectRef.current && (
        <ColorPicker
          hsva={hsva}
          mode={mode}
          anchorRect={anchorRectRef.current}
          onChange={handlePickerChange}
          onModeChange={handleModeChange}
          onCustomChange={handleCustomChange}
          onClose={handleClose}
          supportsGradient={supportsGradient}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          gradientConfig={gradientConfig}
          onGradientChange={handleGradientChange}
        />
      )}
    </div>
  );
}
