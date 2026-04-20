import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
    icon?: ReactNode;
    label?: string;
    value: string;
}

type SelectOptionLike = SelectOption | string;

interface SelectInputProps {
    label?: string;
    displayName?: string;
    value: string;
    options: readonly SelectOptionLike[];
    indent?: boolean;
    endContent?: ReactNode;
    bare?: boolean;
    placeholder?: string;
    onChange: (value: string) => void;
    onFocus?: () => void;
}

function normalizeOptions(options: readonly SelectOptionLike[]): SelectOption[] {
    return options.map((option) =>
        typeof option === 'string'
            ? { value: option, label: option }
            : { ...option, label: option.label ?? option.value },
    );
}

function normalizeOption(option: SelectOptionLike): SelectOption {
    return typeof option === 'string'
        ? { value: option, label: option }
        : { ...option, label: option.label ?? option.value };
}

const triggerClassName =
    'flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-transparent bg-[var(--cs-input-bg)] px-2 py-1 text-left text-[11px] text-[var(--cs-foreground)] transition hover:bg-[var(--cs-feint)] focus:border-[var(--cs-input-border-strong)] focus:outline-none';

const dropdownClassName =
    'absolute left-0 top-[calc(100%+4px)] z-[200] min-w-full overflow-hidden rounded-lg border border-[var(--cs-border)] bg-[var(--cs-layer)] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)]';

export function SelectInput({
    label,
    displayName,
    value,
    options,
    indent = false,
    endContent,
    bare = false,
    placeholder = 'Select',
    onChange,
    onFocus,
}: SelectInputProps) {
    const [open, setOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<CSSProperties | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const normalizedOptions = useMemo(() => {
        const next = normalizeOptions(options);
        if (!next.some((option) => option.value === value) && value) {
            next.unshift(normalizeOption(value));
        }
        return next;
    }, [options, value]);

    const selectedOption = useMemo(
        () =>
            normalizedOptions.find((option) => option.value === value) ?? {
                value,
                label: value || placeholder,
            },
        [normalizedOptions, placeholder, value],
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        const updatePosition = () => {
            const trigger = triggerRef.current;
            if (!trigger) {
                return;
            }

            const rect = trigger.getBoundingClientRect();
            const belowSpace = window.innerHeight - rect.bottom - 8;
            const aboveSpace = rect.top - 8;
            const openAbove = belowSpace < 180 && aboveSpace > belowSpace;
            const maxHeight = Math.max(120, Math.min(280, openAbove ? aboveSpace : belowSpace));
            const width = Math.max(rect.width, bare ? rect.width : 140);
            const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
            const top = openAbove ? Math.max(8, rect.top - maxHeight - 4) : rect.bottom + 4;

            setDropdownStyle({
                position: 'fixed',
                top,
                left,
                width,
                maxHeight,
            });
        };

        updatePosition();

        const handlePointerDown = (event: Event) => {
            const target = event.composedPath()[0] as Element | undefined;
            if (!target) {
                return;
            }
            if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
                return;
            }
            if (target.closest('[data-cs-floating]')) {
                return;
            }
            setOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [bare, open]);

    const handleSelect = useCallback(
        (nextValue: string) => {
            onChange(nextValue);
            setOpen(false);
        },
        [onChange],
    );

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLButtonElement>) => {
            if (event.key === 'Escape') {
                setOpen(false);
                return;
            }

            if (normalizedOptions.length === 0) {
                return;
            }

            const currentIndex = normalizedOptions.findIndex((option) => option.value === value);

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % normalizedOptions.length : 0;
                const nextOption = normalizedOptions[nextIndex];
                if (nextOption) {
                    onChange(nextOption.value);
                }
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                const nextIndex =
                    currentIndex >= 0
                        ? (currentIndex - 1 + normalizedOptions.length) % normalizedOptions.length
                        : normalizedOptions.length - 1;
                const nextOption = normalizedOptions[nextIndex];
                if (nextOption) {
                    onChange(nextOption.value);
                }
            }
        },
        [normalizedOptions, onChange, value],
    );

    const dropdown = (
        <AnimatePresence>
            {open && dropdownStyle && typeof document !== 'undefined'
                ? createPortal(
                <motion.div
                    ref={dropdownRef}
                    data-cs-floating="select"
                    className={dropdownClassName}
                    role="listbox"
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    onPointerDown={(event) => event.stopPropagation()}
                    transition={{ duration: 0.1, ease: 'easeOut' }}
                    style={dropdownStyle}
                >
                    {normalizedOptions.map((option) => {
                        const isSelected = option.value === value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition ${
                                    isSelected
                                        ? 'text-[var(--cs-accent)]'
                                        : 'text-[var(--cs-foreground)] hover:bg-[var(--cs-feint)]'
                                }`}
                                onClick={() => handleSelect(option.value)}
                            >
                                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                                    {isSelected ? <Check className="h-3 w-3" /> : option.icon ?? null}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                            </button>
                        );
                    })}
                </motion.div>
                ,
                document.body,
            ) : null}
        </AnimatePresence>
    );

    const trigger = (
        <div className="relative min-w-0 flex-1">
            <button
                ref={triggerRef}
                type="button"
                className={`${triggerClassName} ${open ? 'border-[var(--cs-input-border-strong)]' : ''}`}
                onClick={() => {
                    setOpen((current) => !current);
                    onFocus?.();
                }}
                onKeyDown={handleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                    {selectedOption.icon ? (
                        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[var(--cs-icon-muted)]">
                            {selectedOption.icon}
                        </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">
                        {selectedOption.label || placeholder}
                    </span>
                </span>
                <ChevronDown
                    className={`h-3 w-3 shrink-0 text-[var(--cs-icon-muted)] transition ${
                        open ? 'rotate-180' : ''
                    }`}
                />
            </button>
            {dropdown}
        </div>
    );

    if (bare) {
        return (
            <div className="flex min-w-0 items-center gap-1">
                {trigger}
                {endContent}
            </div>
        );
    }

    const labelText = displayName || label || '';

    return (
        <div
            className={`flex min-h-6 items-center gap-1.5 px-3 py-0.5 ${
                indent ? 'pl-6' : ''
            }`}
        >
            {labelText ? (
                <label
                    className="w-20 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[var(--cs-label-text)]"
                    title={labelText}
                >
                    {labelText}
                </label>
            ) : null}
            {trigger}
            {endContent}
        </div>
    );
}
