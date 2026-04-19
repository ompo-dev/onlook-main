import { useCallback, type ReactNode } from 'react';
import styles from './inputs.module.css';
import tabStyles from './IconTabBar.module.css';

export interface TabOption {
  value: string;
  title?: string;
  icon: ReactNode;
}

interface IconTabBarProps {
  label: string;
  displayName?: string;
  value: string;
  options: TabOption[];
  onChange: (value: string) => void;
  onFocus?: () => void;
}

export function IconTabBar({
  label,
  displayName,
  value,
  options,
  onChange,
  onFocus,
}: IconTabBarProps) {
  const handleClick = useCallback(
    (optValue: string) => {
      onChange(optValue);
    },
    [onChange],
  );

  const labelText = displayName || label;

  return (
    <div className={styles.row}>
      <label className={styles.label} title={labelText}>
        {labelText}
      </label>
      <div className={tabStyles.bar} onFocus={onFocus}>
        {options.map((opt) => (
          <button
            key={opt.value}
            className={`${tabStyles.tab} ${value === opt.value ? tabStyles.active : ''}`}
            onClick={() => handleClick(opt.value)}
            title={opt.title}
            type="button"
          >
            {opt.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
