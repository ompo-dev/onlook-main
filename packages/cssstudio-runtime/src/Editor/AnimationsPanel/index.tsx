import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../state/use-store';
import { useAnimPreview } from '../state/use-anim-preview';
import { useAnimationEdits } from '../state/use-animation-edits';
import { CompactPlaybackControls } from './CompactPlaybackControls';
import { DurationInput } from './DurationInput';
import { KeyframesDropdown } from './KeyframesDropdown';
import { CompactTimeMarkers } from './CompactTimeMarkers';
import { CompactValueKeyframes } from './CompactValueKeyframes';
import { EditableInput } from './EditableInput';
import { XIcon } from '../icons/XIcon';
import { PlusIcon } from '../icons/PlusIcon';
import styles from './AnimationsPanel.module.css';

const LABEL_WIDTH = 120;
const TRACK_PADDING = 16;

export function AnimationsPanel() {
    useAnimPreview();
    const timelineRef = useRef<HTMLDivElement>(null);
    const [trackWidth, setTrackWidth] = useState(0);
    const { renameProperty, deleteProperty, addProperty } = useAnimationEdits();

    const rules = useStore((s) => s.keyframesRules);
    const animations = useStore((s) => s.animValueAnimations);
    const currentTime = useStore((s) => s.animCurrentTime);
    const deselectKeyframes = useStore((s) => s.deselectAnimKeyframes);
    const scrubTo = useStore((s) => s.animScrubTo);
    const stopPlaying = useStore((s) => s.animStopPlaying);
    const creating = useStore((s) => s.creatingAnimation);

    const [editingLabel, setEditingLabel] = useState<string | null>(null);
    const [addingProperty, setAddingProperty] = useState(false);

    const hasRules = rules.length > 0;

    const measure = useCallback(() => {
        const el = timelineRef.current;
        if (!el) return;
        setTrackWidth(Math.max(0, el.clientWidth - LABEL_WIDTH - TRACK_PADDING));
    }, []);

    useLayoutEffect(() => {
        if (hasRules) measure();
    }, [hasRules, measure]);

    useEffect(() => {
        if (!hasRules) return;
        const el = timelineRef.current;
        if (!el) return;
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasRules, measure]);

    if (rules.length === 0 && !creating) {
        return <div className={styles.empty}>No @keyframes found on this page</div>;
    }

    const scrubberLeft = LABEL_WIDTH + currentTime * trackWidth;

    function handleScrubberDrag(e: React.PointerEvent) {
        e.stopPropagation();
        stopPlaying();
        const timeline = timelineRef.current;
        if (!timeline || trackWidth <= 0) return;
        const rect = timeline.getBoundingClientRect();
        const scrub = (clientX: number) => {
            const offset = Math.max(0, Math.min(1, (clientX - rect.left - LABEL_WIDTH) / trackWidth));
            scrubTo(offset);
        };
        scrub(e.clientX);
        const onMove = (ev: PointerEvent) => scrub(ev.clientX);
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            stopPlaying();
            const offsets = new Set([0, 1]);
            for (const anim of animations) {
                for (const kf of Object.values(anim.keyframes)) {
                    offsets.add(kf.offset);
                }
            }
            const sorted = Array.from(offsets).sort((a, b) => a - b);
            if (e.key === 'ArrowRight') {
                const next = sorted.find((o) => o > currentTime + 1e-3);
                if (next !== undefined) scrubTo(next);
            } else {
                const prev = sorted.findLast((o) => o < currentTime - 1e-3);
                if (prev !== undefined) scrubTo(prev);
            }
        }
    }

    return (
        <div className={styles.panel} tabIndex={0} onKeyDown={handleKeyDown}>
            <div className={styles.toolbar}>
                <CompactPlaybackControls />
                <DurationInput />
                <KeyframesDropdown />
            </div>
            <div className={styles.timeline} ref={timelineRef} onClick={deselectKeyframes}>
                <CompactTimeMarkers trackWidth={trackWidth} labelWidth={LABEL_WIDTH} />
                {animations.map((anim) => (
                    <div key={anim.id} className={styles.propertyRow}>
                        <div
                            className={styles.propertyLabel}
                            title={anim.propertyName}
                            onDoubleClick={() => setEditingLabel(anim.id)}
                        >
                            {editingLabel === anim.id ? (
                                <EditableInput
                                    initialValue={anim.propertyName}
                                    className={styles.propertyLabelInput}
                                    onCommit={(name) => {
                                        if (name && name !== anim.propertyName) {
                                            renameProperty(anim.id, name);
                                        }
                                        setEditingLabel(null);
                                    }}
                                    onCancel={() => setEditingLabel(null)}
                                />
                            ) : (
                                anim.propertyName
                            )}
                            <button
                                className={styles.propertyDelete}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteProperty(anim.id);
                                }}
                                title="Delete property"
                            >
                                <XIcon size={10} />
                            </button>
                        </div>
                        <CompactValueKeyframes animation={anim} trackWidth={trackWidth} />
                    </div>
                ))}
                <div className={styles.addPropertyRow}>
                    {addingProperty ? (
                        <EditableInput
                            placeholder="property-name"
                            className={styles.addPropertyInput}
                            onCommit={(name) => {
                                if (name) addProperty(name);
                                setAddingProperty(false);
                            }}
                            onCancel={() => setAddingProperty(false)}
                        />
                    ) : (
                        <button
                            className={styles.addPropertyBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                setAddingProperty(true);
                            }}
                        >
                            <PlusIcon size={10} />
                            Add property
                        </button>
                    )}
                </div>
                <div className={styles.scrubber} style={{ left: scrubberLeft }}>
                    <div className={styles.scrubberHead} onPointerDown={handleScrubberDrag}>
                        <svg width="9" height="25" viewBox="0 0 9 25">
                            <path d="M0 0h9v20.5l-4.5 4.5L0 20.5z" fill="var(--cs-accent)" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
}
