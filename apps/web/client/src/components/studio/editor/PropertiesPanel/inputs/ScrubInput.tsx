import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ContextMenu } from '../../ContextMenu';
import { TokenIcon } from '../../icons/TokenIcon';
import { XIcon } from '../../icons/XIcon';
import { useStore } from '../../state/use-store';
import { classifyTokenValue, type TokenValueType } from '../../utils/classify-token-value';
import { parseNumericValue, resolveUnitConfig, STEP_CONFIGS } from './NumberInput';
import styles from './ScrubInput.module.css';

const DEFAULT_RESETS: Record<string, string> = {
    padding: '0',
    'padding-top': '0',
    'padding-right': '0',
    'padding-bottom': '0',
    'padding-left': '0',
    margin: '0',
    'margin-top': '0',
    'margin-right': '0',
    'margin-bottom': '0',
    'margin-left': '0',
    gap: '0',
    'border-radius': '0',
    'border-top-left-radius': '0',
    'border-top-right-radius': '0',
    'border-bottom-right-radius': '0',
    'border-bottom-left-radius': '0',
    'border-width': '0',
    'border-top-width': '0',
    'border-right-width': '0',
    'border-bottom-width': '0',
    'border-left-width': '0',
    width: 'auto',
    height: 'auto',
    'min-width': 'auto',
    'min-height': 'auto',
    'max-width': 'none',
    'max-height': 'none',
    top: 'auto',
    right: 'auto',
    bottom: 'auto',
    left: 'auto',
    'z-index': 'auto',
    opacity: '1',
    'font-weight': '400',
    'font-size': '16px',
    'line-height': 'normal',
    'letter-spacing': 'normal',
    'word-spacing': 'normal',
    translateX: '0px',
    translateY: '0px',
    translateZ: '0px',
    rotate: '0deg',
    rotateX: '0deg',
    rotateY: '0deg',
    rotateZ: '0deg',
    scale: '1',
    scaleX: '1',
    scaleY: '1',
    skewX: '0deg',
    skewY: '0deg',
    'transform-origin': '50%',
};

const NUMERIC_RE =
    /^-?\d+(\.\d+)?\s*(%|px|em|rem|vh|vw|vmin|vmax|ch|ex|fr|pt|pc|cm|mm|in|s|ms|deg|rad|turn)?$/i;
const BARE_NUMBER_RE = /^-?\d+(\.\d+)?$/;
const SIZE_KEYWORDS = ['auto', 'min-content', 'max-content', 'fit-content', 'stretch'];
const MAX_KEYWORDS = ['none', 'min-content', 'max-content', 'fit-content'];
const MARGIN_KEYWORDS = ['auto'];
const KEYWORD_COMPLETIONS: Record<string, string[]> = {
    width: SIZE_KEYWORDS,
    height: SIZE_KEYWORDS,
    'min-width': SIZE_KEYWORDS,
    'min-height': SIZE_KEYWORDS,
    'max-width': MAX_KEYWORDS,
    'max-height': MAX_KEYWORDS,
    margin: MARGIN_KEYWORDS,
    'margin-top': MARGIN_KEYWORDS,
    'margin-right': MARGIN_KEYWORDS,
    'margin-bottom': MARGIN_KEYWORDS,
    'margin-left': MARGIN_KEYWORDS,
};
const STEP_UNITS: Record<string, string[]> = {
    width: ['px', '%', 'rem', 'em', 'vw', 'vh'],
    height: ['px', '%', 'rem', 'em', 'vw', 'vh'],
    'min-width': ['px', '%', 'rem', 'em', 'vw', 'vh'],
    'min-height': ['px', '%', 'rem', 'em', 'vw', 'vh'],
    'max-width': ['px', '%', 'rem', 'em', 'vw', 'vh'],
    'max-height': ['px', '%', 'rem', 'em', 'vw', 'vh'],
    padding: ['px', '%', 'rem', 'em'],
    'padding-top': ['px', '%', 'rem', 'em'],
    'padding-right': ['px', '%', 'rem', 'em'],
    'padding-bottom': ['px', '%', 'rem', 'em'],
    'padding-left': ['px', '%', 'rem', 'em'],
    margin: ['px', '%', 'rem', 'em'],
    'margin-top': ['px', '%', 'rem', 'em'],
    'margin-right': ['px', '%', 'rem', 'em'],
    'margin-bottom': ['px', '%', 'rem', 'em'],
    'margin-left': ['px', '%', 'rem', 'em'],
    gap: ['px', '%', 'rem', 'em'],
};

interface ScrubInputProps {
    propName: string;
    label: string;
    displayName?: string;
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
    onFocus?: () => void;
    endContent?: ReactNode;
    className?: string;
    tokenType?: TokenValueType | 'any';
    resetValue?: string;
}

interface MenuPosition {
    x: number;
    y: number;
}

function extractTokenName(value: string) {
    const match = value.trim().match(/^var\(--(.+?)\)$/);
    return match ? match[1] : null;
}

function isNumericValue(raw: string) {
    return NUMERIC_RE.test(raw.trim());
}

function toBareDisplay(value: string, numeric: boolean) {
    if (!numeric) {
        return value;
    }

    return String(parseNumericValue(value).num);
}

export function ScrubInput({
    propName,
    label,
    displayName,
    value,
    placeholder,
    onChange,
    onFocus,
    endContent,
    className,
    tokenType = 'number',
    resetValue,
}: ScrubInputProps) {
    const tokenName = extractTokenName(value);
    const designTokens = useStore((state) => state.designTokens);
    const filteredTokens = useMemo(() => {
        if (!tokenType || tokenType === 'any') {
            return designTokens;
        }

        return designTokens.filter((token) => {
            const classification = classifyTokenValue(token.value);
            return classification === tokenType || classification === 'unknown';
        });
    }, [designTokens, tokenType]);

    const resolved = resolveUnitConfig(value, { label: propName });
    const valueIsNumeric = isNumericValue(value);
    const placeholderIsNumeric = !!placeholder && isNumericValue(placeholder);
    const numeric = valueIsNumeric || (value === '' && placeholderIsNumeric);
    const parsed = valueIsNumeric
        ? parseNumericValue(value)
        : placeholderIsNumeric
          ? parseNumericValue(placeholder!)
          : { num: 0, unit: '' };
    const effectiveUnit = parsed.unit || resolved.unit;
    const bare = toBareDisplay(value, valueIsNumeric);
    const [localValue, setLocalValue] = useState(bare);
    const [unitMenu, setUnitMenu] = useState<MenuPosition | null>(null);
    const [tokenMenu, setTokenMenu] = useState<MenuPosition | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const isEditingRef = useRef(false);
    const dragStartValue = useRef(0);
    const dragAccumDelta = useRef(0);
    const isDraggingRef = useRef(false);
    const hasDraggedRef = useRef(false);
    const lastClientX = useRef(0);

    useEffect(() => {
        if (!isEditingRef.current) {
            setLocalValue(bare);
        }
    }, [bare]);

    const formatNumber = useCallback(
        (num: number, unit: string) => {
            const clamped = Math.min(resolved.max, Math.max(resolved.min, num));
            const rounded = Math.round(clamped / resolved.step) * resolved.step;
            const decimals =
                resolved.step < 1
                    ? String(resolved.step).split('.')[1]?.length ?? 2
                    : 0;
            const fixed = Number.parseFloat(rounded.toFixed(decimals));
            return unit ? `${fixed}${unit}` : String(fixed);
        },
        [resolved.max, resolved.min, resolved.step],
    );

    const latestMove = useRef<(event: PointerEvent) => void>(() => {});
    latestMove.current = (event: PointerEvent) => {
        if (!isDraggingRef.current) {
            return;
        }

        const delta = event.clientX - lastClientX.current;
        lastClientX.current = event.clientX;
        dragAccumDelta.current += delta;

        if (!hasDraggedRef.current && Math.abs(dragAccumDelta.current) < 2) {
            return;
        }

        hasDraggedRef.current = true;
        const multiplier = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
        const steps = Math.round(dragAccumDelta.current / 2);
        const nextValue = formatNumber(
            dragStartValue.current + steps * resolved.step * multiplier,
            effectiveUnit,
        );
        onChange(nextValue);
    };

    const handleLabelPointerDown = useCallback(
        (event: React.PointerEvent<HTMLSpanElement>) => {
            if (!numeric || event.button !== 0) {
                return;
            }

            event.preventDefault();
            isDraggingRef.current = true;
            hasDraggedRef.current = false;
            dragAccumDelta.current = 0;
            dragStartValue.current = parsed.num;
            lastClientX.current = event.clientX;

            const target = event.currentTarget;
            const pointerId = event.pointerId;

            try {
                target.setPointerCapture(pointerId);
            } catch {}

            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';

            const onMove = (pointerEvent: PointerEvent) => latestMove.current(pointerEvent);
            const finish = () => {
                if (!isDraggingRef.current) {
                    return;
                }

                isDraggingRef.current = false;
                document.body.style.removeProperty('cursor');
                document.body.style.removeProperty('user-select');

                try {
                    target.releasePointerCapture(pointerId);
                } catch {}

                target.removeEventListener('pointermove', onMove);
                target.removeEventListener('pointerup', finish);
                target.removeEventListener('pointercancel', finish);
                target.removeEventListener('lostpointercapture', finish);

                if (!hasDraggedRef.current) {
                    inputRef.current?.focus();
                    inputRef.current?.select();
                }
            };

            target.addEventListener('pointermove', onMove);
            target.addEventListener('pointerup', finish);
            target.addEventListener('pointercancel', finish);
            target.addEventListener('lostpointercapture', finish);
        },
        [effectiveUnit, formatNumber, numeric, onChange, parsed.num, resolved.step],
    );

    const handleInputChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            isEditingRef.current = true;
            setLocalValue(event.target.value);
        },
        [],
    );

    const handleFocus = useCallback(() => {
        isEditingRef.current = true;
        onFocus?.();
    }, [onFocus]);

    const commit = useCallback(() => {
        isEditingRef.current = false;
        const trimmed = localValue.trim();
        if (trimmed === '' && !numeric) {
            return;
        }

        const nextValue =
            BARE_NUMBER_RE.test(trimmed) && effectiveUnit
                ? `${trimmed}${effectiveUnit}`
                : trimmed;
        if (nextValue !== value) {
            onChange(nextValue);
        }
    }, [effectiveUnit, localValue, numeric, onChange, value]);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
                commit();
                event.currentTarget.blur();
                return;
            }

            if (event.key === 'Tab' && !event.shiftKey) {
                const trimmed = localValue.trim();
                if (!trimmed) {
                    return;
                }

                const keywords = KEYWORD_COMPLETIONS[propName] ?? [];
                const lower = trimmed.toLowerCase();
                const match = keywords.find(
                    (keyword) =>
                        keyword.toLowerCase().startsWith(lower) &&
                        keyword.toLowerCase() !== lower,
                );

                if (match) {
                    event.preventDefault();
                    isEditingRef.current = false;
                    setLocalValue(match);
                    onChange(match);
                }
                return;
            }

            if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && numeric) {
                event.preventDefault();
                const direction = event.key === 'ArrowUp' ? 1 : -1;
                const multiplier = event.shiftKey ? 10 : 1;
                onChange(
                    formatNumber(parsed.num + direction * resolved.step * multiplier, effectiveUnit),
                );
            }
        },
        [
            commit,
            effectiveUnit,
            formatNumber,
            localValue,
            numeric,
            onChange,
            parsed.num,
            propName,
            resolved.step,
        ],
    );

    const availableUnits = STEP_UNITS[propName] ?? [];

    const handleUnitClick = useCallback(
        (event: React.MouseEvent<HTMLSpanElement>) => {
            if (!numeric || availableUnits.length < 2) {
                return;
            }

            const rect = event.currentTarget.getBoundingClientRect();
            setUnitMenu({ x: rect.left, y: rect.bottom + 4 });
        },
        [availableUnits.length, numeric],
    );

    const openTokenMenu = useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            event.preventDefault();
            event.stopPropagation();
            if (filteredTokens.length === 0) {
                return;
            }

            const rect = event.currentTarget.getBoundingClientRect();
            setTokenMenu({ x: rect.left, y: rect.bottom + 4 });
        },
        [filteredTokens.length],
    );

    const pickToken = useCallback(
        (nextTokenName: string) => {
            onChange(`var(--${nextTokenName})`);
        },
        [onChange],
    );

    const clearToken = useCallback(() => {
        if (!tokenName) {
            return;
        }

        const token = designTokens.find((item) => item.name === tokenName);
        onChange(token?.value ?? '');
    }, [designTokens, onChange, tokenName]);

    const effectiveReset = resetValue ?? DEFAULT_RESETS[propName];
    const handleLabelDoubleClick = useCallback(() => {
        if (effectiveReset === undefined) {
            return;
        }
        hasDraggedRef.current = true;
        onChange(effectiveReset);
    }, [effectiveReset, onChange]);

    const labelClassName = `${styles.label} ${numeric ? styles.scrubbable : ''}`;

    if (tokenName) {
        return (
            <div className={`${styles.cell} ${styles.cellToken} ${className ?? ''}`} data-prop={propName}>
                <button
                    className={styles.pillIcon}
                    onClick={openTokenMenu}
                    title="Pick variable"
                    tabIndex={-1}
                >
                    <TokenIcon />
                </button>
                <span className={styles.pillName} title={`var(--${tokenName})`}>
                    --{tokenName}
                </span>
                <button className={styles.pillClear} onClick={clearToken} title="Remove token">
                    <XIcon size={10} />
                </button>
                {endContent ? <span className={styles.endContent}>{endContent}</span> : <span />}
                {tokenMenu ? (
                    <ContextMenu
                        x={tokenMenu.x}
                        y={tokenMenu.y}
                        animate
                        items={filteredTokens.map((token) => ({
                            label: `--${token.name}  ${token.value}`,
                            onClick: () => pickToken(token.name),
                        }))}
                        onClose={() => setTokenMenu(null)}
                    />
                ) : null}
            </div>
        );
    }

    return (
        <div
            className={`${styles.cell} ${styles.cellHoverable} ${className ?? ''}`}
            data-prop={propName}
        >
            <span
                className={labelClassName}
                onPointerDown={handleLabelPointerDown}
                onDoubleClick={handleLabelDoubleClick}
                title={displayName || label}
            >
                {label}
            </span>
            <input
                ref={inputRef}
                type="text"
                className={styles.input}
                value={localValue}
                placeholder={placeholder}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={commit}
                onKeyDown={handleKeyDown}
                spellCheck={false}
            />
            {filteredTokens.length > 0 ? (
                <button
                    className={styles.tokenTrigger}
                    onClick={openTokenMenu}
                    title="Pick variable"
                    tabIndex={-1}
                >
                    <TokenIcon />
                </button>
            ) : null}
            {numeric ? (
                <span
                    className={`${styles.unit} ${styles.unitClickable}`}
                    onClick={handleUnitClick}
                    title="Change unit"
                >
                    {effectiveUnit || ''}
                </span>
            ) : (
                <span />
            )}
            {endContent ? <span className={styles.endContent}>{endContent}</span> : <span />}
            {unitMenu ? (
                <ContextMenu
                    x={unitMenu.x}
                    y={unitMenu.y}
                    animate
                    items={availableUnits.map((unit) => ({
                        label: unit,
                        onClick: () => onChange(`${parsed.num}${unit}`),
                    }))}
                    onClose={() => setUnitMenu(null)}
                />
            ) : null}
            {tokenMenu ? (
                <ContextMenu
                    x={tokenMenu.x}
                    y={tokenMenu.y}
                    animate
                    items={filteredTokens.map((token) => ({
                        label: `--${token.name}  ${token.value}`,
                        onClick: () => pickToken(token.name),
                    }))}
                    onClose={() => setTokenMenu(null)}
                />
            ) : null}
        </div>
    );
}
