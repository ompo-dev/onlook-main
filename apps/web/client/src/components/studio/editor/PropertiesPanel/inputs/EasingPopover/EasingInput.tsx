import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './EasingInput.module.css';

function clampX(v: number): number {
  return Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function parseBezierString(str: string): [number, number, number, number] | null {
  const inner = str.replace(/cubic-bezier\s*\(\s*/i, '').replace(/\)\s*$/, '');
  const parts = inner.split(/[\s,]+/).map(Number);
  if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
    return [clampX(parts[0]), round3(parts[1]), clampX(parts[2]), round3(parts[3])];
  }
  return null;
}

interface EasingInputProps {
  value: [number, number, number, number];
  onChange: (value: [number, number, number, number]) => void;
}

export function EasingInput({ value, onChange }: EasingInputProps) {
  const [locals, setLocals] = useState<string[]>(() => value.map(String));
  const suppressSync = useRef(false);

  useEffect(() => {
    if (suppressSync.current) return;
    setLocals(value.map(String));
  }, [value[0], value[1], value[2], value[3]]);

  const commit = useCallback(
    (index: number, raw: string) => {
      const num = parseFloat(raw);
      if (isNaN(num)) return;
      const next = [...value] as [number, number, number, number];
      next[index] = index === 0 || index === 2 ? clampX(num) : round3(num);
      onChange(next);
    },
    [value, onChange],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData('text/plain').trim();
      const parsed = parseBezierString(text);
      if (parsed) {
        e.preventDefault();
        suppressSync.current = true;
        setLocals(parsed.map(String));
        onChange(parsed);
        requestAnimationFrame(() => {
          suppressSync.current = false;
        });
      }
    },
    [onChange],
  );

  const handleChange = useCallback(
    (index: number, raw: string) => {
      suppressSync.current = true;
      setLocals((prev) => {
        const next = [...prev];
        next[index] = raw;
        return next;
      });
      commit(index, raw);
      requestAnimationFrame(() => {
        suppressSync.current = false;
      });
    },
    [commit],
  );

  return (
    <div className={styles.bezierInputRow}>
      {locals.map((val, i) => (
        <input
          key={i}
          className={styles.bezierField}
          data-testid={`bezier-input-${i}`}
          type="text"
          inputMode="decimal"
          value={val}
          onChange={(e) => handleChange(i, e.target.value)}
          onPaste={i === 0 ? handlePaste : undefined}
          onBlur={() => {
            const num = parseFloat(val);
            if (!isNaN(num)) {
              const clamped = i === 0 || i === 2 ? clampX(num) : round3(num);
              setLocals((prev) => {
                const next = [...prev];
                next[i] = String(clamped);
                return next;
              });
            }
          }}
        />
      ))}
    </div>
  );
}
