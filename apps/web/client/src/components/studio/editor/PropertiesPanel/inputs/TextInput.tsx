import { useState, useCallback, useEffect, type ReactNode } from 'react';
import styles from './inputs.module.css';

interface TextInputProps {
  label: string;
  displayName?: string;
  value: string;
  mono?: boolean;
  indent?: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onLabelDoubleClick?: () => void;
  labelOverride?: ReactNode;
}

export function TextInput({
  label,
  displayName,
  value,
  mono,
  indent = false,
  onChange,
  onFocus,
  onLabelDoubleClick,
  labelOverride,
}: TextInputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    if (localValue !== value) {
      onChange(localValue);
    }
  }, [localValue, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') onChange(localValue);
    },
    [localValue, onChange],
  );

  const labelText = displayName || label;

  return (
    <div className={`${styles.row} ${indent ? styles.indent : ''}`}>
      {labelOverride ?? (
        <label
          className={`${styles.label} ${mono ? styles.mono : ''}`}
          title={labelText}
          onDoubleClick={onLabelDoubleClick}
        >
          {labelText}
        </label>
      )}
      <input
        type="text"
        className={styles.textInput}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
      />
    </div>
  );
}
