import { useStore } from '../../state/use-store';
import { SplitAxisIcon } from '../../icons/SplitAxisIcon';
import { NumberInput } from './NumberInput';
import { TokenPicker } from './TokenPicker';
import styles from './inputs.module.css';

const AXIS_SIDES: Record<string, Array<{ label: string; displayName: string }>> = {
  padding: [
    { label: 'padding-top', displayName: 'Top' },
    { label: 'padding-right', displayName: 'Right' },
    { label: 'padding-bottom', displayName: 'Bottom' },
    { label: 'padding-left', displayName: 'Left' },
  ],
  margin: [
    { label: 'margin-top', displayName: 'Top' },
    { label: 'margin-right', displayName: 'Right' },
    { label: 'margin-bottom', displayName: 'Bottom' },
    { label: 'margin-left', displayName: 'Left' },
  ],
};

interface SplitAxisToggleProps {
  prop: string;
  displayName: string;
  value: string;
  getValue: (prop: string) => string;
  onChange: (prop: string, value: string) => void;
  onFocus?: () => void;
}

export function SplitAxisToggle({ prop, displayName, value, getValue, onChange, onFocus }: SplitAxisToggleProps) {
  const splitAxis = useStore((s) => (s as any).splitAxis ?? {});
  const toggleSplitAxis = useStore((s) => (s as any).toggleSplitAxis ?? (() => {}));

  const isSplit = splitAxis[prop] ?? false;
  const sides = AXIS_SIDES[prop] ?? [];
  const sideValues = sides.map((s) => getValue(s.label));
  const allSame = sideValues.every((v) => v === sideValues[0]);
  const showSplit = isSplit || (!allSame && sideValues.some((v) => v !== ''));

  const handleCollapse = () => {
    if (showSplit) {
      const topValue = getValue(sides[0].label);
      onChange(prop, topValue);
    }
    toggleSplitAxis(prop);
  };

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

  if (!showSplit) {
    return (
      <TokenPicker value={value} label={displayName} tokenType="number" onSelect={(v) => onChange(prop, v)}>
        <NumberInput
          label={prop}
          displayName={displayName}
          value={value}
          onChange={(v) => onChange(prop, v)}
          onFocus={onFocus}
          endContent={toggleButton}
        />
      </TokenPicker>
    );
  }

  return (
    <>
      <div className={styles.row}>
        <label className={styles.label} title={displayName}>
          {displayName}
        </label>
        <span />
        {toggleButton}
      </div>
      {sides.map((side) => (
        <TokenPicker
          key={side.label}
          value={getValue(side.label)}
          label={side.displayName}
          tokenType="number"
          onSelect={(v) => onChange(side.label, v)}
        >
          <NumberInput
            label={side.label}
            displayName={side.displayName}
            value={getValue(side.label)}
            onChange={(v) => onChange(side.label, v)}
            onFocus={onFocus}
            indent
          />
        </TokenPicker>
      ))}
    </>
  );
}
