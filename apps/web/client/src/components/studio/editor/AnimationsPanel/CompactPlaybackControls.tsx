import { useStore } from '../state/use-store';
import styles from './AnimationsPanel.module.css';

function PlayIcon() {
    return <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>;
}
function PauseIcon() {
    return <svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>;
}
function SkipBackIcon() {
    return <svg viewBox="0 0 24 24"><path d="M19 20L9 12l10-8v16zM5 4h2v16H5z" /></svg>;
}

export function CompactPlaybackControls() {
    const isPlaying = useStore((s) => s.animPlaybackOrigin !== null);
    const currentTime = useStore((s) => s.animCurrentTime);
    const startPlaying = useStore((s) => s.animStartPlaying);
    const stopPlaying = useStore((s) => s.animStopPlaying);
    const scrubTo = useStore((s) => s.animScrubTo);
    const hasRule = useStore((s) => s.selectedKeyframesName !== null);
    const disabled = !hasRule;

    return (
        <div className={`${styles.playback} ${disabled ? styles.playbackDisabled : ''}`}>
            <button
                className={styles.playbackBtn}
                disabled={disabled}
                onClick={() => {
                    scrubTo(0);
                    if (isPlaying) startPlaying();
                }}
                title="Skip to start"
            >
                <SkipBackIcon />
            </button>
            <button
                className={styles.playbackBtn}
                disabled={disabled}
                onClick={() => {
                    if (isPlaying) {
                        stopPlaying();
                    } else {
                        if (currentTime >= 1) scrubTo(0);
                        startPlaying();
                    }
                }}
                title={isPlaying ? 'Pause' : 'Play'}
            >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <span className={styles.currentTime}>{Math.round(currentTime * 100)}%</span>
        </div>
    );
}
