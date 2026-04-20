import { useState, useCallback, useEffect } from 'react';
import styles from './inputs.module.css';

interface TextAreaInputProps {
  label: string;
  displayName?: string;
  value: string;
  onChange: (value: string) => void;
}

export function TextAreaInput({ label, displayName, value, onChange }: TextAreaInputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    if (localValue !== value) {
      onChange(localValue);
    }
  }, [localValue, value, onChange]);

  const labelText = displayName || label;

  return (
    <div className={`${styles.row} ${styles.textAreaRow}`}>
      <label className={styles.label} title={labelText}>
        {labelText}
      </label>
      <textarea
        className={styles.textArea}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        rows={3}
      />
    </div>
  );
}
