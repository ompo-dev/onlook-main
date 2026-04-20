import { useCallback, useRef, useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import styles from './inputs.module.css';
import selectStyles from './SelectInput.module.css';

interface SelectInputProps {
  label?: string;
  displayName?: string;
  value: string;
  options: string[];
  indent?: boolean;
  endContent?: ReactNode;
  bare?: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
}

export function SelectInput({
  label,
  displayName,
  value,
  options,
  indent = false,
  endContent,
  bare = false,
  onChange,
  onFocus,
}: SelectInputProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const allOptions = options.includes(value) ? options : [value, ...options];

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.composedPath()[0] as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return;
      setOpen(false);
    }
    const root = (triggerRef.current?.getRootNode() ?? document) as Document | ShadowRoot;
    root.addEventListener('pointerdown', handlePointerDown as any);
    return () => root.removeEventListener('pointerdown', handlePointerDown as any);
  }, [open]);

  const handleSelect = useCallback((opt: string) => {
    onChange(opt);
    setOpen(false);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = allOptions.indexOf(value);
      const next = allOptions[(idx + 1) % allOptions.length];
      onChange(next);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = allOptions.indexOf(value);
      const prev = allOptions[(idx - 1 + allOptions.length) % allOptions.length];
      onChange(prev);
    }
  }, [allOptions, value, onChange]);

  const dropdown = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dropdownRef}
          className={selectStyles.dropdown}
          role="listbox"
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
        >
          {allOptions.map((opt) => (
            <button
              key={opt}
              role="option"
              aria-selected={opt === value}
              className={`${selectStyles.option} ${opt === value ? selectStyles.selected : ''}`}
              onClick={() => handleSelect(opt)}
            >
              {opt === value && (
                <svg className={selectStyles.check} width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M1.5 5l2.5 2.5 4.5-4" />
                </svg>
              )}
              <span>{opt}</span>
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (bare) {
    return (
      <div style={{ position: 'relative', display: 'flex' }}>
        <button
          ref={triggerRef}
          className={`${selectStyles.trigger} ${open ? selectStyles.open : ''}`}
          onClick={() => { setOpen(v => !v); onFocus?.(); }}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={selectStyles.triggerValue}>{value}</span>
          <svg className={`${selectStyles.chevron} ${open ? selectStyles.chevronOpen : ''}`} width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            <path d="M1 2.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </svg>
        </button>
        {dropdown}
        {endContent}
      </div>
    );
  }

  const labelText = displayName || label || '';
  return (
    <div className={`${styles.row} ${indent ? styles.indent : ''}`} style={{ position: 'relative' }}>
      {labelText && (
        <label className={styles.label} title={labelText}>
          {labelText}
        </label>
      )}
      <button
        ref={triggerRef}
        className={`${selectStyles.trigger} ${open ? selectStyles.open : ''}`}
        onClick={() => { setOpen(v => !v); onFocus?.(); }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selectStyles.triggerValue}>{value}</span>
        <svg className={`${selectStyles.chevron} ${open ? selectStyles.chevronOpen : ''}`} width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
          <path d="M1 2.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {dropdown}
      {endContent}
    </div>
  );
}
