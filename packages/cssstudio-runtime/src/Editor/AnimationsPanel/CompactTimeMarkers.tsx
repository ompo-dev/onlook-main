import { useRef } from 'react';
import { useStore } from '../state/use-store';
import styles from './AnimationsPanel.module.css';

const MARKERS = [
    { pct: 20, major: false },
    { pct: 40, major: false },
    { pct: 60, major: false },
    { pct: 80, major: false },
    { pct: 100, major: true },
];

interface CompactTimeMarkersProps {
    trackWidth: number;
    labelWidth: number;
}

export function CompactTimeMarkers({ trackWidth, labelWidth }: CompactTimeMarkersProps) {
    const scrubTo = useStore((s) => s.animScrubTo);
    const stopPlaying = useStore((s) => s.animStopPlaying);
    const dragging = useRef(false);

    function offsetFromPointer(clientX: number, rect: DOMRect) {
        if (trackWidth <= 0) return 0;
        return Math.max(0, Math.min(1, (clientX - rect.left - labelWidth) / trackWidth));
    }

    function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
        stopPlaying();
        const rect = e.currentTarget.getBoundingClientRect();
        scrubTo(offsetFromPointer(e.clientX, rect));
        dragging.current = true;
        const onMove = (ev: PointerEvent) => {
            scrubTo(offsetFromPointer(ev.clientX, rect));
        };
        const onUp = () => {
            dragging.current = false;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }

    return (
        <div className={styles.markersRow} onPointerDown={handlePointerDown}>
            <div style={{ width: labelWidth, flexShrink: 0 }} />
            <div className={styles.markersTrack}>
                {MARKERS.map(({ pct, major }) => (
                    <span
                        key={pct}
                        className={major ? styles.markerMajor : styles.markerMinor}
                        style={{
                            position: 'absolute',
                            left: (pct / 100) * trackWidth,
                            transform: 'translateX(-100%)',
                            paddingRight: 4,
                        }}
                    >
                        {pct}%
                    </span>
                ))}
            </div>
        </div>
    );
}
