import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../state/use-store';
import { useAnimationEdits } from '../state/use-animation-edits';
import { sortKeyframesByOffset } from '../utils/sort-keyframes';
import { KeyframePopover } from './KeyframePopover';
import type { ValueAnimation } from '../state/slices/animation-slice';
import styles from './AnimationsPanel.module.css';

function snapOffset(offset: number) {
    return Math.round(offset * 100) / 100;
}

interface CompactValueKeyframesProps {
    animation: ValueAnimation;
    trackWidth: number;
}

export function CompactValueKeyframes({ animation, trackWidth }: CompactValueKeyframesProps) {
    const { id: propertyId, propertyName, keyframes } = animation;
    const {
        addKeyframe,
        moveKeyframe,
        deleteKeyframe,
        updateKeyframeValue: updateValue,
        updateKeyframeEasing: updateEasing,
        beginDrag,
        endDrag,
    } = useAnimationEdits();

    const selectedKeyframes = useStore((s) => s.animSelectedKeyframes);
    const selectKeyframe = useStore((s) => s.selectAnimKeyframe);
    const deselectKeyframes = useStore((s) => s.deselectAnimKeyframes);

    const [dragOrigin, setDragOrigin] = useState<{ keyframeId: string; pointerX: number; offset: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [ghostOffset, setGhostOffset] = useState<number | null>(null);
    const [popoverAnchor, setPopoverAnchor] = useState<{ keyframeId: string; rect: DOMRect } | null>(null);

    const rowRef = useRef<HTMLDivElement>(null);
    const markerRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const orderedKeyframes = sortKeyframesByOffset(keyframes);
    const selectedKf = selectedKeyframes.find((s) => s.propertyId === propertyId);
    const selectedKfData = selectedKf ? keyframes[selectedKf.keyframeId] : null;

    useEffect(() => {
        if (!selectedKf) {
            setPopoverAnchor(null);
            return;
        }
        const el = markerRefs.current[selectedKf.keyframeId];
        if (el) {
            setPopoverAnchor({ keyframeId: selectedKf.keyframeId, rect: el.getBoundingClientRect() });
        }
    }, [selectedKf?.keyframeId, selectedKfData?.offset]);

    useEffect(() => {
        if (!dragOrigin) return;
        const handleDrag = (e: PointerEvent) => {
            const deltaOffset = (e.clientX - dragOrigin.pointerX) / trackWidth;
            const newOffset = snapOffset(Math.max(0, Math.min(1, dragOrigin.offset + deltaOffset)));
            moveKeyframe(propertyId, dragOrigin.keyframeId, newOffset);
            setIsDragging(true);
        };
        const stopDrag = () => {
            setIsDragging(false);
            setDragOrigin(null);
            endDrag();
        };
        window.addEventListener('pointermove', handleDrag);
        window.addEventListener('pointerup', stopDrag);
        return () => {
            window.removeEventListener('pointermove', handleDrag);
            window.removeEventListener('pointerup', stopDrag);
        };
    }, [dragOrigin, trackWidth, propertyId, moveKeyframe, endDrag]);

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key !== 'Backspace' && e.key !== 'Delete') return;
            let el = document.activeElement as Element | null;
            while ((el as any)?.shadowRoot?.activeElement) {
                el = (el as any).shadowRoot.activeElement;
            }
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as any)?.isContentEditable) return;
            const sel = useStore.getState().animSelectedKeyframes;
            for (const s of sel) {
                if (s.propertyId === propertyId) {
                    e.preventDefault();
                    deleteKeyframe(s);
                }
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [propertyId, deleteKeyframe]);

    function handlePointerMove(e: React.PointerEvent) {
        if (isDragging || dragOrigin || popoverAnchor) return;
        const rect = rowRef.current?.getBoundingClientRect();
        if (!rect) return;
        const offset = snapOffset((e.clientX - rect.left) / trackWidth);
        if (offset < 0 || offset > 1) { setGhostOffset(null); return; }
        const tooClose = orderedKeyframes.some((kf) => Math.abs(kf.offset - offset) < 0.02);
        setGhostOffset(tooClose ? null : offset);
    }

    function handleClick(e: React.MouseEvent) {
        e.stopPropagation();
        if (popoverAnchor) { handlePopoverClose(); return; }
        const rect = rowRef.current?.getBoundingClientRect();
        if (!rect) return;
        const offset = snapOffset(Math.max(0, Math.min(1, (e.clientX - rect.left) / trackWidth)));
        setGhostOffset(null);
        addKeyframe(propertyId, offset);
    }

    const handlePopoverClose = useCallback(() => {
        setPopoverAnchor(null);
        deselectKeyframes();
    }, [deselectKeyframes]);

    const markers: React.ReactNode[] = [];
    let prevOffset: number | undefined;
    for (const kf of orderedKeyframes) {
        const isSelected = selectedKeyframes.some((s) => s.keyframeId === kf.id);
        if (prevOffset !== undefined) {
            markers.push(
                <motion.div
                    key={`bar-${kf.id}`}
                    className={styles.transitionBar}
                    initial={false}
                    animate={{ backgroundColor: isSelected ? 'var(--cs-accent)' : 'var(--cs-feint)' }}
                    transition={{ duration: 0.1 }}
                    style={{ width: (kf.offset - prevOffset) * trackWidth, transform: `translateX(${prevOffset * trackWidth}px)` }}
                />
            );
        }
        markers.push(
            <div
                key={kf.id}
                ref={(el) => { markerRefs.current[kf.id] = el; }}
                className={styles.markerContainer}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    selectKeyframe({ propertyId, keyframeId: kf.id });
                    beginDrag();
                    setDragOrigin({ keyframeId: kf.id, pointerX: e.clientX, offset: kf.offset });
                }}
                style={{ cursor: isDragging ? 'ew-resize' : 'pointer', transform: `translateX(${kf.offset * trackWidth}px)` }}
            >
                <motion.div
                    className={styles.valueMarker}
                    initial={false}
                    animate={{ backgroundColor: isSelected ? 'var(--cs-accent)' : 'var(--cs-white)' }}
                    transition={{ duration: 0.1 }}
                    whileTap={{ scale: 0.9 }}
                    style={{ rotate: 45 }}
                />
            </div>
        );
        prevOffset = kf.offset;
    }

    return (
        <div
            ref={rowRef}
            className={styles.keyframesTrack}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setGhostOffset(null)}
            onClick={handleClick}
        >
            {markers}
            {ghostOffset !== null && (
                <div
                    className={styles.markerContainer}
                    style={{ transform: `translateX(${ghostOffset * trackWidth}px)`, pointerEvents: 'none' }}
                >
                    <div className={styles.valueMarker} style={{ rotate: '45deg', opacity: 0.3 }} />
                </div>
            )}
            {popoverAnchor && selectedKfData && (
                <KeyframePopover
                    propertyName={propertyName}
                    value={selectedKfData.properties[propertyName] ?? ''}
                    offset={selectedKfData.offset}
                    easing={selectedKfData.easing}
                    springConfig={selectedKfData.springConfig}
                    anchorRect={popoverAnchor.rect}
                    onChange={(v) => updateValue(propertyId, popoverAnchor.keyframeId, v)}
                    onEasingChange={(e, sc) => updateEasing(propertyId, popoverAnchor.keyframeId, e, sc)}
                    onDelete={() => {
                        deleteKeyframe({ propertyId, keyframeId: popoverAnchor.keyframeId });
                        setPopoverAnchor(null);
                    }}
                    onClose={handlePopoverClose}
                />
            )}
        </div>
    );
}
