import { useCallback, type ReactNode } from 'react';
import { NumberInput } from './NumberInput';
import styles from './inputs.module.css';

const SHAPE_OPTIONS = ['round', 'scoop', 'bevel', 'notch', 'square', 'squircle', 'superellipse'];

function parseShape(value: string): { shape: string; param?: number } {
  const match = value.match(/^superellipse\(\s*(-?[\d.]+|infinity|-infinity)\s*\)$/);
  if (match) {
    return {
      shape: 'superellipse',
      param: match[1] === 'infinity' ? Infinity : match[1] === '-infinity' ? -Infinity : parseFloat(match[1]),
    };
  }
  return { shape: value || 'round' };
}

function formatShape(shape: string, param?: number): string {
  if (shape === 'superellipse') return `superellipse(${param ?? 2})`;
  return shape;
}

interface CornerShapeInputProps {
  label: string;
  displayName?: string;
  value: string;
  endContent?: ReactNode;
  onChange: (value: string) => void;
  onFocus?: () => void;
}

export function CornerShapeInput({ label, displayName, value, endContent, onChange, onFocus }: CornerShapeInputProps) {
  const { shape, param } = parseShape(value);

  const handleShapeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(formatShape(e.target.value, param));
    },
    [onChange, param],
  );

  const handleParamChange = useCallback(
    (v: string) => {
      const num = parseFloat(v);
      if (!isNaN(num)) onChange(formatShape('superellipse', num));
    },
    [onChange],
  );

  const labelText = displayName || label;

  return (
    <div className={styles.row}>
      <label className={styles.label} title={labelText}>
        {labelText}
      </label>
      <select
        className={styles.select}
        value={shape}
        onChange={handleShapeChange}
        onFocus={onFocus}
        style={shape === 'superellipse' ? { flex: '1 1 0', minWidth: 0 } : undefined}
      >
        {!SHAPE_OPTIONS.includes(shape) && <option value={shape}>{shape}</option>}
        {SHAPE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {shape === 'superellipse' && (
        <NumberInput
          value={String(param ?? 2)}
          min={-10}
          max={10}
          step={0.1}
          unit=""
          showSlider={false}
          compact
          onChange={handleParamChange}
          onFocus={onFocus}
        />
      )}
      {endContent}
    </div>
  );
}
