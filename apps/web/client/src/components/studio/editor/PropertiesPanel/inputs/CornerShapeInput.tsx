import { useCallback, type ReactNode } from 'react';
import { NumberInput } from './NumberInput';
import { SelectInput } from './SelectInput';

const SHAPE_OPTIONS = ['round', 'scoop', 'bevel', 'notch', 'square', 'squircle', 'superellipse'];

function parseShape(value: string): { shape: string; param?: number } {
  const match = value.match(/^superellipse\(\s*(-?[\d.]+|infinity|-infinity)\s*\)$/);
  const captured = match?.[1];
  if (captured) {
    return {
      shape: 'superellipse',
      param:
        captured === 'infinity'
          ? Infinity
          : captured === '-infinity'
            ? -Infinity
            : parseFloat(captured),
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
    (nextShape: string) => {
      onChange(formatShape(nextShape, param));
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
  return (
    <>
      <SelectInput
        label={label}
        displayName={displayName}
        value={shape}
        options={SHAPE_OPTIONS}
        endContent={endContent}
        onChange={handleShapeChange}
        onFocus={onFocus}
      />
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
    </>
  );
}
