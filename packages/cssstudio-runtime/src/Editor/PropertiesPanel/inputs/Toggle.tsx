import styles from './Toggle.module.css';

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
            onClick={() => onChange(!value)}
        >
            <span className={styles.thumb} />
        </button>
    );
}
