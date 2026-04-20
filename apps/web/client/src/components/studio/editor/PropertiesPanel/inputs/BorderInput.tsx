import { useMemo, useCallback, type ReactNode } from 'react';
import { useStore } from '../../state/use-store';
function SplitAxisIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="4.5" y1="1.5" x2="9.5" y2="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12.5" y1="4.5" x2="12.5" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4.5" y1="12.5" x2="9.5" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1.5" y1="4.5" x2="1.5" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
import { parseBorder, serializeBorder, BORDER_STYLES } from '../../utils/parse-border';
import { ColorInput } from './ColorInput';
import { NumberInput } from './NumberInput';
import { SelectInput } from './SelectInput';
import { TextInput } from './TextInput';
import styles from './inputs.module.css';
import borderStyles from './BorderInput.module.css';

const BORDER_WIDTH_UNITS = [
  { unit: 'px', min: 0, max: 20, step: 1 },
  { unit: 'em', min: 0, max: 5, step: 0.25 },
  { unit: 'rem', min: 0, max: 5, step: 0.25 },
];

const SIDES = ['top', 'right', 'bottom', 'left'];

interface BorderInputProps {
  value: string;
  getValue: (prop: string) => string;
  onChange: (prop: string, value: string) => void;
  onFocus?: () => void;
}

export function BorderInput({ value, getValue, onChange, onFocus }: BorderInputProps) {
  const splitAxis = useStore((s) => (s as any).splitAxis ?? {});
  const toggleSplitAxis = useStore((s) => (s as any).toggleSplitAxis ?? (() => {}));

  const isSplit = splitAxis['border'] ?? false;
  const sideValues = SIDES.map((s) => getValue(`border-${s}`));
  const allSame = sideValues.every((v) => v === sideValues[0]);
  const showSplit = isSplit || (!allSame && sideValues.some((v) => v !== ''));
  const isTokenRef = value.trim().startsWith('var(');

  const handleCollapse = useCallback(() => {
    if (showSplit) {
      const topValue = getValue('border-top');
      if (topValue) onChange('border', topValue);
    }
    toggleSplitAxis('border');
  }, [showSplit, getValue, onChange, toggleSplitAxis]);

  if (isTokenRef) {
    return <TextInput label="border" displayName="Border" value={value} onChange={(v) => onChange('border', v)} onFocus={onFocus} />;
  }

  const toggleButton = (
    <button
      className={styles.toggleButton}
      onClick={handleCollapse}
      title={showSplit ? 'Collapse to shorthand' : 'Split into sides'}
      style={{ color: showSplit ? 'var(--cs-accent)' : undefined }}
    >
      <SplitAxisIcon />
    </button>
  );

  if (showSplit) {
    return (
      <>
        <div className={styles.row}>
          <label className={styles.label}>Border</label>
          <span />
          {toggleButton}
        </div>
        {SIDES.map((side, i) => (
          <BorderSide key={side} side={side} getValue={getValue} onChange={onChange} onFocus={onFocus} showSeparator={i > 0} />
        ))}
      </>
    );
  }

  return (
    <BorderFields value={value} onChange={(v) => onChange('border', v)} onFocus={onFocus} toggleButton={toggleButton} label="Border" />
  );
}

interface BorderFieldsProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  toggleButton?: ReactNode;
  label: string;
}

function BorderFields({ value, onChange, onFocus, toggleButton, label }: BorderFieldsProps) {
  const parsed = useMemo(() => parseBorder(value), [value]);

  const handleColorChange = useCallback((color: string) => onChange(serializeBorder({ ...parsed, color })), [parsed, onChange]);
  const handleWidthChange = useCallback((width: string) => {
    const numericWidth = parseFloat(width);
    const style = numericWidth > 0 && parsed.style === 'none' ? 'solid' : parsed.style;
    onChange(serializeBorder({ ...parsed, width, style }));
  }, [parsed, onChange]);
  const handleStyleChange = useCallback((style: string) => onChange(serializeBorder({ ...parsed, style })), [parsed, onChange]);

  return (
    <>
      <ColorInput label="border-color" displayName={label} value={parsed.color} onChange={handleColorChange} onFocus={onFocus} />
      <NumberInput displayName="Width" value={parsed.width} units={BORDER_WIDTH_UNITS} indent onChange={handleWidthChange} onFocus={onFocus} endContent={toggleButton} />
      <SelectInput label="border-style" displayName="Style" value={parsed.style} options={BORDER_STYLES} indent onChange={handleStyleChange} onFocus={onFocus} />
    </>
  );
}

interface BorderSideProps {
  side: string;
  getValue: (prop: string) => string;
  onChange: (prop: string, value: string) => void;
  onFocus?: () => void;
  showSeparator: boolean;
}

function BorderSide({ side, getValue, onChange, onFocus, showSeparator }: BorderSideProps) {
  const sideLabel = side.charAt(0).toUpperCase() + side.slice(1);
  const prefix = `border-${side}`;

  const handleColorChange = useCallback((color: string) => onChange(`${prefix}-color`, color), [prefix, onChange]);
  const handleWidthChange = useCallback((width: string) => {
    onChange(`${prefix}-width`, width);
    const numericWidth = parseFloat(width);
    const currentStyle = getValue(`${prefix}-style`);
    if (numericWidth > 0 && (!currentStyle || currentStyle === 'none')) {
      onChange(`${prefix}-style`, 'solid');
    }
  }, [prefix, onChange, getValue]);
  const handleStyleChange = useCallback((style: string) => onChange(`${prefix}-style`, style), [prefix, onChange]);

  return (
    <>
      {showSeparator && <div className={borderStyles.separator} />}
      <ColorInput label={`${prefix}-color`} displayName={sideLabel} value={getValue(`${prefix}-color`)} onChange={handleColorChange} onFocus={onFocus} />
      <NumberInput displayName="Width" value={getValue(`${prefix}-width`)} units={BORDER_WIDTH_UNITS} indent onChange={handleWidthChange} onFocus={onFocus} />
      <SelectInput label={`${prefix}-style`} displayName="Style" value={getValue(`${prefix}-style`)} options={BORDER_STYLES} indent onChange={handleStyleChange} onFocus={onFocus} />
    </>
  );
}
