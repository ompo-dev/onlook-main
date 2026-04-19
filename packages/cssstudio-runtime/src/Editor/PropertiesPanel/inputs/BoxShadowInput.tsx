import { useMemo, useCallback } from 'react';
import { PlusIcon } from '../../icons/PlusIcon';
import { XIcon } from '../../icons/XIcon';
import { parseBoxShadow, serializeBoxShadow, DEFAULT_SHADOW, type BoxShadow } from '../../utils/parse-box-shadow';
import { SHADOW_UNITS, SHADOW_BLUR_UNITS } from './NumberInput';
import { NumberInput } from './NumberInput';
import { ColorInput } from './ColorInput';
import { TextInput } from './TextInput';
import { Toggle } from './Toggle';
import styles from './inputs.module.css';
import boxStyles from './BoxShadowInput.module.css';

interface BoxShadowInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
}

export function BoxShadowInput({ value, onChange, onFocus }: BoxShadowInputProps) {
  const shadows = useMemo(() => parseBoxShadow(value), [value]);
  const isTokenRef = value.trim().startsWith('var(');

  const handleFieldChange = useCallback(
    (index: number, field: keyof BoxShadow, fieldValue: string | boolean) => {
      const updated = shadows.map((s, i) => (i === index ? { ...s, [field]: fieldValue } : s));
      onChange(serializeBoxShadow(updated));
    },
    [shadows, onChange],
  );

  const handleAdd = useCallback(() => {
    onChange(serializeBoxShadow([...shadows, { ...DEFAULT_SHADOW }]));
  }, [shadows, onChange]);

  const handleDelete = useCallback(
    (index: number) => {
      const updated = shadows.filter((_, i) => i !== index);
      onChange(serializeBoxShadow(updated));
    },
    [shadows, onChange],
  );

  if (isTokenRef) {
    return <TextInput label="box-shadow" displayName="Shadow" value={value} onChange={onChange} onFocus={onFocus} />;
  }

  return (
    <>
      <div className={styles.row}>
        <label className={styles.label}>Shadow</label>
        <span />
        <button className={boxStyles.addButton} onClick={handleAdd} title="Add shadow">
          <PlusIcon />
        </button>
      </div>
      {shadows.map((shadow, i) => (
        <ShadowItem
          key={i}
          index={i}
          shadow={shadow}
          showSeparator={i > 0}
          onFieldChange={handleFieldChange}
          onDelete={handleDelete}
          onFocus={onFocus}
        />
      ))}
    </>
  );
}

interface ShadowItemProps {
  index: number;
  shadow: BoxShadow;
  showSeparator: boolean;
  onFieldChange: (index: number, field: keyof BoxShadow, value: string | boolean) => void;
  onDelete: (index: number) => void;
  onFocus?: () => void;
}

function ShadowItem({ index, shadow, showSeparator, onFieldChange, onDelete, onFocus }: ShadowItemProps) {
  return (
    <>
      {showSeparator && <div className={boxStyles.separator} />}
      <ColorInput label="color" displayName="Color" value={shadow.color} onChange={(v) => onFieldChange(index, 'color', v)} onFocus={onFocus} />
      <NumberInput displayName="X" value={shadow.offsetX} units={SHADOW_UNITS} indent onChange={(v) => onFieldChange(index, 'offsetX', v)} onFocus={onFocus} />
      <NumberInput displayName="Y" value={shadow.offsetY} units={SHADOW_UNITS} indent onChange={(v) => onFieldChange(index, 'offsetY', v)} onFocus={onFocus} />
      <NumberInput displayName="Blur" value={shadow.blur} units={SHADOW_BLUR_UNITS} indent onChange={(v) => onFieldChange(index, 'blur', v)} onFocus={onFocus} />
      <NumberInput displayName="Spread" value={shadow.spread} units={SHADOW_UNITS} indent onChange={(v) => onFieldChange(index, 'spread', v)} onFocus={onFocus} />
      <div className={`${styles.row} ${styles.indent}`}>
        <label className={styles.label}>Inset</label>
        <Toggle value={shadow.inset} onChange={(v) => onFieldChange(index, 'inset', v)} />
        <button className={styles.deleteButton} onClick={() => onDelete(index)} title="Remove shadow">
          <XIcon size={10} />
        </button>
      </div>
    </>
  );
}
