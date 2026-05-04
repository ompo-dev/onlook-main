'use client';

import { Monitor, Smartphone, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import styles from './ViewportToolbar.module.css';

const VIEWPORT_PRESETS = {
    phone: { width: 390, height: 844 },
    monitor: { width: 1440, height: 900 },
} as const;

const MIN_DIM = 120;
const MAX_DIM = 8000;

function matchesPreset(
    viewport: { width: number; height: number },
    key: keyof typeof VIEWPORT_PRESETS,
) {
    const preset = VIEWPORT_PRESETS[key];
    return viewport.width === preset.width && viewport.height === preset.height;
}

function DimensionInput({
    label,
    value,
    onChange,
    ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    value: number;
    onChange: (value: number) => void;
}) {
    const [local, setLocal] = useState(String(value));

    useEffect(() => {
        setLocal(String(value));
    }, [value]);

    const commit = useCallback(
        (raw: string) => {
            const parsed = Number.parseInt(raw, 10);
            if (!Number.isFinite(parsed)) {
                setLocal(String(value));
                return;
            }
            const clamped = Math.min(MAX_DIM, Math.max(MIN_DIM, parsed));
            setLocal(String(clamped));
            if (clamped !== value) {
                onChange(clamped);
            }
        },
        [onChange, value],
    );

    return (
        <label className={styles.dim}>
            <span className={styles.dimLabel}>{label}</span>
            <input
                type="number"
                inputMode="numeric"
                className={styles.dimInput}
                value={local}
                min={MIN_DIM}
                max={MAX_DIM}
                onChange={(event) => setLocal(event.target.value)}
                onBlur={(event) => commit(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        (event.target as HTMLInputElement).blur();
                    } else if (event.key === 'Escape') {
                        setLocal(String(value));
                        (event.target as HTMLInputElement).blur();
                    }
                }}
                {...rest}
            />
        </label>
    );
}

export function ViewportToolbar({
    viewport,
    onChange,
    onClose,
}: {
    viewport: { width: number; height: number };
    onChange: (viewport: { width: number; height: number }) => void;
    onClose?: () => void;
}) {
    const activePreset = matchesPreset(viewport, 'phone')
        ? 'phone'
        : matchesPreset(viewport, 'monitor')
          ? 'monitor'
          : null;

    return (
        <div data-cs-viewport-toolbar className={styles.toolbar}>
            <button
                type="button"
                data-cs-viewport-preset="phone"
                className={`${styles.tab} ${activePreset === 'phone' ? styles.tabActive : ''}`}
                onClick={() => onChange({ ...VIEWPORT_PRESETS.phone })}
                title="Phone (390 × 844)"
                aria-label="Phone viewport"
            >
                <Smartphone size={14} />
            </button>
            <button
                type="button"
                data-cs-viewport-preset="monitor"
                className={`${styles.tab} ${activePreset === 'monitor' ? styles.tabActive : ''}`}
                onClick={() => onChange({ ...VIEWPORT_PRESETS.monitor })}
                title="Monitor (1440 × 900)"
                aria-label="Monitor viewport"
            >
                <Monitor size={14} />
            </button>
            <div className={styles.separator} />
            <DimensionInput
                label="W"
                data-cs-viewport-width=""
                value={viewport.width}
                onChange={(width) => onChange({ width, height: viewport.height })}
            />
            <span className={styles.times}>×</span>
            <DimensionInput
                label="H"
                data-cs-viewport-height=""
                value={viewport.height}
                onChange={(height) => onChange({ width: viewport.width, height })}
            />
            <div className={styles.separator} />
            <button
                type="button"
                data-cs-viewport-close
                className={styles.closeButton}
                onClick={onClose}
                title="Exit responsive view"
                aria-label="Exit responsive view"
            >
                <X size={14} />
            </button>
        </div>
    );
}
