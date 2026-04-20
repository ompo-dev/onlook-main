import { useCallback } from 'react';
import { NumberInput } from './NumberInput';

const INSET_PROPS = [
  { prop: 'top', displayName: 'Top' },
  { prop: 'left', displayName: 'Left' },
  { prop: 'right', displayName: 'Right' },
  { prop: 'bottom', displayName: 'Bottom' },
];

interface PositionBoxProps {
  position: string;
  getValue: (prop: string) => string;
  onChange: (prop: string, value: string) => void;
  onFocus?: () => void;
}

export function PositionBox({ position, getValue, onChange, onFocus }: PositionBoxProps) {
  const isRelative = position === 'relative';

  const handleChange = useCallback(
    (prop: string, value: string) => {
      if (isRelative) {
        if (prop === 'top') onChange('bottom', 'auto');
        if (prop === 'bottom') onChange('top', 'auto');
        if (prop === 'left') onChange('right', 'auto');
        if (prop === 'right') onChange('left', 'auto');
      }
      onChange(prop, value);
    },
    [isRelative, onChange],
  );

  return (
    <>
      {INSET_PROPS.map(({ prop, displayName }) => (
        <NumberInput
          key={prop}
          label={prop}
          displayName={displayName}
          value={getValue(prop)}
          onChange={(v) => handleChange(prop, v)}
          onFocus={onFocus}
        />
      ))}
    </>
  );
}
