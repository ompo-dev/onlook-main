import { useCallback, type ReactNode } from 'react';
import styles from './inputs.module.css';

interface SelectInputProps {
  label: string;
  displayName?: string;
  value: string;
  options: string[];
  indent?: boolean;
  endContent?: ReactNode;
  onChange: (value: string) => void;
  onFocus?: () => void;
}

export function SelectInput({
  label,
  displayName,
  value,
  options,
  indent = false,
  endContent,
  onChange,
  onFocus,
}: SelectInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const labelText = displayName || label;

  return (
    <div className={`${styles.row} ${indent ? styles.indent : ''}`}>
      <label className={styles.label} title={labelText}>
        {labelText}
      </label>
      <select className={styles.select} value={value} onChange={handleChange} onFocus={onFocus}>
        {!options.includes(value) && <option value={value}>{value}</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {endContent}
    </div>
  );
}
