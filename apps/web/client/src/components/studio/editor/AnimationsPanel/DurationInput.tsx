import { useState, useEffect } from 'react';
import { useStore } from '../state/use-store';
import styles from './AnimationsPanel.module.css';

export function DurationInput() {
    const duration = useStore((s) => s.animDuration);
    const setDuration = useStore((s) => s.setAnimDuration);
    const [localValue, setLocalValue] = useState(String(duration));

    useEffect(() => {
        setLocalValue(String(duration));
    }, [duration]);

    function commit() {
        const v = parseFloat(localValue);
        if (!isNaN(v) && v > 0) {
            setDuration(v);
        } else {
            setLocalValue(String(duration));
        }
    }

    return (
        <div className={styles.durationWrap}>
            <input
                className={styles.durationInput}
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                }}
            />
            <span className={styles.durationLabel}>s</span>
        </div>
    );
}
