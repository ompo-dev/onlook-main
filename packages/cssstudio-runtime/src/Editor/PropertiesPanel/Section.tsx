import type { ReactNode } from 'react';
import { PlusIcon } from '../icons/PlusIcon';
import styles from './Section.module.css';

interface SectionProps {
  title?: string;
  onAdd?: () => void;
  addTitle?: string;
  children?: ReactNode;
}

export function Section({ title, onAdd, addTitle, children }: SectionProps) {
  return (
    <div className={styles.section}>
      {(title || onAdd) && (
        <div className={styles.header}>
          {title ? (
            <span className={styles.title}>{title}</span>
          ) : (
            <span className={styles.title} />
          )}
          {onAdd && (
            <button className={styles.headerAction} onClick={onAdd} title={addTitle}>
              <PlusIcon />
            </button>
          )}
        </div>
      )}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
