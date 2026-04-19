import { useStore } from '../../state/use-store';
import { PerCornerIcon } from '../../icons/PerCornerIcon';
import { NumberInput } from './NumberInput';
import { CornerShapeInput } from './CornerShapeInput';
import { SelectInput } from './SelectInput';
import styles from './inputs.module.css';

const CORNER_MAP: Record<string, Array<{ label: string; suffix: string }>> = {
  'border-radius': [
    { label: 'border-top-left-radius', suffix: 'TL' },
    { label: 'border-top-right-radius', suffix: 'TR' },
    { label: 'border-bottom-right-radius', suffix: 'BR' },
    { label: 'border-bottom-left-radius', suffix: 'BL' },
  ],
  'corner-shape': [
    { label: 'corner-shape-top-left', suffix: 'TL' },
    { label: 'corner-shape-top-right', suffix: 'TR' },
    { label: 'corner-shape-bottom-right', suffix: 'BR' },
    { label: 'corner-shape-bottom-left', suffix: 'BL' },
  ],
};

interface PerCornerToggleProps {
  prop: string;
  displayName: string;
  value: string;
  getValue: (prop: string) => string;
  onChange: (prop: string, value: string) => void;
  onFocus?: () => void;
  type?: 'number' | 'corner-shape' | 'select';
  options?: string[];
}

export function PerCornerToggle({ prop, displayName, value, getValue, onChange, onFocus, type = 'number', options }: PerCornerToggleProps) {
  const splitCorners = useStore((s) => (s as any).splitCorners ?? {});
  const toggleSplitCorners = useStore((s) => (s as any).toggleSplitCorners ?? (() => {}));

  const isSplit = splitCorners[prop] ?? false;
  const corners = CORNER_MAP[prop] ?? [];
  const cornerValues = corners.map((c) => getValue(c.label));
  const allSame = cornerValues.every((v) => v === cornerValues[0]);
  const showSplit = isSplit || (!allSame && cornerValues.some((v) => v !== ''));

  const handleToggle = () => {
    if (showSplit) {
      const tlValue = getValue(corners[0].label);
      onChange(prop, tlValue);
    }
    toggleSplitCorners(prop);
  };

  const toggleButton = (
    <button
      className={styles.toggleButton}
      onClick={handleToggle}
      title={showSplit ? 'Collapse to shorthand' : 'Split into corners'}
      style={{ color: showSplit ? 'var(--cs-accent)' : undefined }}
    >
      <PerCornerIcon />
    </button>
  );

  if (!showSplit) {
    if (type === 'number') {
      return <NumberInput label={prop} displayName={displayName} value={value} onChange={(v) => onChange(prop, v)} onFocus={onFocus} endContent={toggleButton} />;
    }
    if (type === 'corner-shape') {
      return <CornerShapeInput label={prop} displayName={displayName} value={value} onChange={(v) => onChange(prop, v)} onFocus={onFocus} endContent={toggleButton} />;
    }
    return <SelectInput label={prop} displayName={displayName} value={value} options={options ?? []} onChange={(v) => onChange(prop, v)} onFocus={onFocus} endContent={toggleButton} />;
  }

  return (
    <>
      <div className={styles.row}>
        <label className={styles.label} title={displayName}>{displayName}</label>
        <span />
        {toggleButton}
      </div>
      {corners.map((corner) =>
        type === 'number' ? (
          <NumberInput
            key={corner.label}
            label={corner.label}
            displayName={corner.suffix}
            value={getValue(corner.label)}
            showSlider={false}
            compact
            indent
            onChange={(v) => onChange(corner.label, v)}
            onFocus={onFocus}
          />
        ) : type === 'corner-shape' ? (
          <CornerShapeInput
            key={corner.label}
            label={corner.label}
            displayName={corner.suffix}
            value={getValue(corner.label)}
            onChange={(v) => onChange(corner.label, v)}
            onFocus={onFocus}
          />
        ) : (
          <SelectInput
            key={corner.label}
            label={corner.label}
            displayName={corner.suffix}
            value={getValue(corner.label)}
            options={options ?? []}
            onChange={(v) => onChange(corner.label, v)}
            onFocus={onFocus}
          />
        ),
      )}
    </>
  );
}
