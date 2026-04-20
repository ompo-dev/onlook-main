import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import styles from './MotionCard.module.css';

interface MotionCardProps {
  headerLabel?: string;
  headerContent?: ReactNode;
  headerActions?: ReactNode;
  selected?: boolean;
  children?: ReactNode;
  secondaryContent?: ReactNode;
  hasNonDefaultSecondary?: boolean;
}

export function MotionCard({
  headerLabel,
  headerContent,
  headerActions,
  selected,
  children,
  secondaryContent,
  hasNonDefaultSecondary,
}: MotionCardProps) {
  const [userToggled, setUserToggled] = useState(false);
  const [userExpanded, setUserExpanded] = useState(false);
  const isExpanded = userToggled ? userExpanded : (hasNonDefaultSecondary ?? false);

  const handleToggle = () => {
    if (!userToggled) {
      setUserToggled(true);
      setUserExpanded(!isExpanded);
    } else {
      setUserExpanded(!userExpanded);
    }
  };

  return (
    <div className={`${styles.card} ${selected ? styles.selected : ''}`}>
      <div className={styles.header}>
        {headerLabel && <span className={styles.headerLabel}>{headerLabel}</span>}
        <div className={styles.headerContent}>{headerContent}</div>
        {headerActions && <div className={styles.headerActions}>{headerActions}</div>}
      </div>
      <div className={styles.body}>{children}</div>
      {secondaryContent && (
        <>
          <button className={styles.moreToggle} onClick={handleToggle}>
            <span className={`${styles.moreChevron} ${isExpanded ? styles.expanded : ''}`}>
              <ChevronRight size={10} />
            </span>
            {isExpanded ? 'Less' : 'More'}
          </button>
          {isExpanded && <div className={styles.secondary}>{secondaryContent}</div>}
        </>
      )}
    </div>
  );
}
