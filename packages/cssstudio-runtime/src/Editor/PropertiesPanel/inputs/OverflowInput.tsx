import { useState } from 'react';
import { SplitAxisIcon } from '../../icons/SplitAxisIcon';
import { SelectInput } from './SelectInput';
import styles from './inputs.module.css';

const OVERFLOW_OPTIONS = ['visible', 'hidden', 'scroll', 'auto', 'clip'];

interface OverflowInputProps {
  value: string;
  getValue: (prop: string) => string;
  onChange: (prop: string, value: string) => void;
  onFocus?: () => void;
}

export function OverflowInput({ value, getValue, onChange, onFocus }: OverflowInputProps) {
  const [isSplit, setIsSplit] = useState(false);
  const overflowX = getValue('overflow-x');
  const overflowY = getValue('overflow-y');
  const axesDiffer = overflowX !== overflowY && overflowX !== '' && overflowY !== '';
  const showSplit = isSplit || axesDiffer;

  const handleToggle = () => {
    if (showSplit) {
      const collapsed = overflowX || overflowY || value;
      onChange('overflow', collapsed);
      setIsSplit(false);
    } else {
      setIsSplit(true);
    }
  };

  const toggleButton = (
    <button
      className={styles.toggleButton}
      onClick={handleToggle}
      title={showSplit ? 'Collapse overflow' : 'Split overflow axes'}
      style={{ color: showSplit ? 'var(--cs-accent)' : undefined }}
    >
      <SplitAxisIcon />
    </button>
  );

  return (
    <>
      <SelectInput
        label="overflow"
        displayName="Overflow"
        value={value}
        options={OVERFLOW_OPTIONS}
        onChange={(v) => onChange('overflow', v)}
        onFocus={onFocus}
        endContent={toggleButton}
      />
      {showSplit && (
        <>
          <SelectInput
            label="overflow-x"
            displayName="X"
            value={overflowX}
            options={OVERFLOW_OPTIONS}
            onChange={(v) => onChange('overflow-x', v)}
            onFocus={onFocus}
            indent
          />
          <SelectInput
            label="overflow-y"
            displayName="Y"
            value={overflowY}
            options={OVERFLOW_OPTIONS}
            onChange={(v) => onChange('overflow-y', v)}
            onFocus={onFocus}
            indent
          />
        </>
      )}
    </>
  );
}
