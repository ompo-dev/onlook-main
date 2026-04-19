import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../state/use-store';
import { NumberInput, STEP_CONFIGS } from '../PropertiesPanel/inputs/NumberInput';
import { ColorInput } from '../PropertiesPanel/inputs/ColorInput';
import { EasingCurve } from '../PropertiesPanel/inputs/EasingCurve';
import { SpringCurve } from '../PropertiesPanel/inputs/SpringCurve';
import { EasingPopover } from '../PropertiesPanel/inputs/EasingPopover/EasingPopover';
import { NAMED_EASINGS } from '../utils/parse-transition';
import styles from './AnimationsPanel.module.css';

const COLOR_PROPERTIES = new Set([
    'color', 'background-color', 'border-color', 'outline-color', 'fill', 'stroke',
    'text-decoration-color', 'column-rule-color', 'caret-color', 'accent-color',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
]);

function getInputType(prop: string): 'color' | 'number' | 'text' {
    if (COLOR_PROPERTIES.has(prop) || prop.endsWith('-color')) return 'color';
    if (prop in STEP_CONFIGS) return 'number';
    return 'text';
}

function extractBezier(timingFunction: string): [number, number, number, number] | null {
    const named = NAMED_EASINGS[timingFunction];
    if (named) return named;
    const match = timingFunction.match(
        /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/
    );
    if (match) {
        return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]), parseFloat(match[4])];
    }
    return null;
}

function getEasingLabel(easing: string | undefined, hasSpring: boolean): string {
    if (hasSpring) return 'Spring';
    if (!easing) return 'linear';
    if (easing in NAMED_EASINGS) return easing;
    if (easing.startsWith('cubic-bezier')) return 'custom';
    return easing;
}

interface KeyframePopoverProps {
    propertyName: string;
    value: string;
    offset: number;
    easing?: string;
    springConfig?: any;
    anchorRect: DOMRect;
    onChange: (value: string) => void;
    onEasingChange: (easing: string | undefined, springConfig?: any) => void;
    onDelete: () => void;
    onClose: () => void;
}

export function KeyframePopover({ propertyName, value, offset, easing, springConfig, anchorRect, onChange, onEasingChange, onDelete, onClose }: KeyframePopoverProps) {
    const ref = useRef<HTMLDivElement>(null);
    const inputType = getInputType(propertyName);
    const config = STEP_CONFIGS[propertyName];
    const domPanelHeight = useStore((s) => s.dockedClaims.bottom);
    const [easingPopoverOpen, setEasingPopoverOpen] = useState(false);
    const easingTriggerRef = useRef<HTMLButtonElement>(null);
    const easingAnchorRef = useRef<DOMRect | null>(null);
    const pendingRef = useRef<{ easing?: string | undefined; spring?: any | null } | null>(null);

    const flushPending = useCallback(() => {
        const p = pendingRef.current;
        if (!p) return;
        pendingRef.current = null;
        onEasingChange(p.easing, p.spring ?? undefined);
    }, [onEasingChange]);

    const hasSpring = !!springConfig;
    const bezier = !hasSpring && easing ? extractBezier(easing) : undefined;
    const easingLabel = getEasingLabel(easing, hasSpring);

    useEffect(() => {
        requestAnimationFrame(() => {
            const input = ref.current?.querySelector('input');
            if (input) input.focus();
        });
    }, []);

    useEffect(() => {
        function handleMouseDown(e: MouseEvent) {
            const target = e.composedPath()[0] as Node;
            if (target && ref.current && !ref.current.contains(target)) {
                onClose();
            }
        }
        const root = (ref.current?.getRootNode() ?? document) as Document;
        root.addEventListener('mousedown', handleMouseDown as any);
        return () => root.removeEventListener('mousedown', handleMouseDown as any);
    }, [onClose]);

    const popoverWidth = 220;
    const popoverHeight = 120;
    const maxBottom = window.innerHeight - domPanelHeight;
    let top = anchorRect.bottom + 8;
    let isAbove = false;
    if (top + popoverHeight > maxBottom) {
        top = anchorRect.top - popoverHeight - 8;
        isAbove = true;
    }
    const rawLeft = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - popoverWidth - 8));

    const handleEasingTriggerClick = useCallback(() => {
        if (easingTriggerRef.current) {
            easingAnchorRef.current = easingTriggerRef.current.getBoundingClientRect();
        }
        setEasingPopoverOpen((prev) => !prev);
    }, []);

    const handleEasingTimingChange = useCallback((v: string) => {
        if (!pendingRef.current) {
            pendingRef.current = {};
            queueMicrotask(flushPending);
        }
        pendingRef.current.easing = v === 'linear' ? undefined : v;
    }, [flushPending]);

    const handleSpringConfigChange = useCallback((cfg: any) => {
        if (!pendingRef.current) {
            pendingRef.current = {};
            queueMicrotask(flushPending);
        }
        pendingRef.current.spring = { ...cfg };
    }, [flushPending]);

    const handleClearSpring = useCallback(() => {
        if (!pendingRef.current) {
            pendingRef.current = {};
            queueMicrotask(flushPending);
        }
        pendingRef.current.spring = null;
    }, [flushPending]);

    return (
        <div
            ref={ref}
            className={styles.popover}
            style={{ top, left }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className={isAbove ? styles.popoverArrowBottom : styles.popoverArrow} />
            <div className={styles.popoverHeader}>
                <span className={styles.popoverProp}>{propertyName}</span>
                <span className={styles.editOffset}>{Math.round(offset * 100)}%</span>
                <button className={styles.editDelete} onClick={onDelete} title="Delete keyframe">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                </button>
            </div>
            <div className={styles.popoverBody}>
                {inputType === 'number' && (
                    <NumberInput
                        value={value}
                        step={config?.step}
                        min={config?.min}
                        max={config?.max}
                        unit={config?.unit}
                        units={config?.units}
                        onChange={onChange}
                    />
                )}
                {inputType === 'color' && (
                    <ColorInput label="" value={value} onChange={onChange} />
                )}
                {inputType === 'text' && (
                    <PopoverTextInput value={value} onChange={onChange} />
                )}
            </div>
            <div className={styles.popoverEasingRow}>
                <span className={styles.popoverEasingLabel}>Easing</span>
                <button
                    ref={easingTriggerRef}
                    className={styles.popoverEasingTrigger}
                    onClick={handleEasingTriggerClick}
                    title="Edit easing"
                >
                    <svg className={styles.popoverEasingPreview} viewBox="0 0 24 24">
                        {hasSpring ? (
                            <SpringCurve spring={springConfig} width={24} height={24} left={2} top={2} right={22} bottom={22} color="var(--cs-accent)" pathWidth={1.5} />
                        ) : bezier ? (
                            <EasingCurve curve={bezier} width={24} height={24} left={2} top={2} right={22} bottom={22} color="var(--cs-accent)" pathWidth={1.5} />
                        ) : (
                            <line x1="2" y1="22" x2="22" y2="2" stroke="var(--cs-accent)" strokeWidth="1.5" />
                        )}
                    </svg>
                    <span className={styles.popoverEasingName}>{easingLabel}</span>
                </button>
            </div>
            {easingPopoverOpen && easingAnchorRef.current && (
                <EasingPopover
                    anchorRect={easingAnchorRef.current}
                    bezier={bezier}
                    timingFunction={easing || 'linear'}
                    springConfig={springConfig ?? null}
                    onTimingChange={handleEasingTimingChange}
                    onDurationChange={() => {}}
                    onSpringConfigChange={handleSpringConfigChange}
                    onClearSpring={handleClearSpring}
                    onClose={() => setEasingPopoverOpen(false)}
                />
            )}
        </div>
    );
}

function PopoverTextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [local, setLocal] = useState(value);
    useEffect(() => { setLocal(value); }, [value]);
    const commit = useCallback(() => {
        if (local !== value) onChange(local);
    }, [local, value, onChange]);
    return (
        <input
            className={styles.popoverTextInput}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
            placeholder="value"
            autoFocus
        />
    );
}
