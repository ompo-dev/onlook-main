import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useStore } from '../../state/use-store';
import { TokenIcon } from '../../icons/TokenIcon';
import { XIcon } from '../../icons/XIcon';
import { classifyTokenValue, type TokenValueType } from '../../utils/classify-token-value';
import { isColorValue } from '../../utils/is-color-value';
import styles from './inputs.module.css';
import tokenStyles from './TokenPicker.module.css';

function extractTokenName(value: string): string | null {
  const match = value.match(/^var\(--(.+?)\)$/);
  return match ? match[1] : null;
}

interface DesignToken {
  name: string;
  value: string;
}

interface TokenPickerProps {
  value: string;
  label: string;
  indent?: boolean;
  tokenType?: TokenValueType | 'any';
  onSelect: (value: string) => void;
  children?: ReactNode;
}

export function TokenPicker({ value, label, indent, tokenType, onSelect, children }: TokenPickerProps) {
  const designTokens = useStore((s) => s.designTokens) as DesignToken[];

  const filteredTokens = useMemo(() => {
    if (!tokenType || tokenType === 'any') return designTokens;
    return designTokens.filter((t) => {
      const c = classifyTokenValue(t.value);
      return c === tokenType || c === 'unknown';
    });
  }, [designTokens, tokenType]);

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tokenName = extractTokenName(value);

  const handleOpen = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuHeight = 200;
      const menuWidth = 220;
      let top = rect.bottom + 4;
      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 4;
      }
      top = Math.max(4, Math.min(top, window.innerHeight - menuHeight - 4));
      const left = Math.max(4, Math.min(rect.left, window.innerWidth - menuWidth - 8));
      setPosition({ top, left });
    }
    setOpen(true);
  }, []);

  const handleSelect = useCallback(
    (name: string) => {
      onSelect(`var(--${name})`);
      setOpen(false);
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    const token = designTokens.find((t) => t.name === tokenName);
    onSelect(token?.value ?? '');
  }, [designTokens, tokenName, onSelect]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: Event) => {
      const target = (e as MouseEvent).composedPath()[0] as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target as Node)) return;
      if (overlayRef.current?.contains(target as Node)) return;
      setOpen(false);
    };
    const root = (triggerRef.current?.getRootNode() ?? document) as Document | ShadowRoot;
    root.addEventListener('pointerdown', handleClick);
    return () => root.removeEventListener('pointerdown', handleClick);
  }, [open]);

  if (tokenName) {
    return (
      <div className={`${styles.row} ${indent ? styles.indent : ''}`}>
        <label className={styles.label} title={label}>
          {label}
        </label>
        <div className={tokenStyles.pill}>
          <span className={tokenStyles.pillIcon}>
            <TokenIcon />
          </span>
          <span className={tokenStyles.pillName}>--{tokenName}</span>
          <button className={tokenStyles.pillClear} onClick={handleClear} title="Remove token">
            <XIcon size={10} />
          </button>
        </div>
      </div>
    );
  }

  if (filteredTokens.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className={tokenStyles.rowWrapper}>
      <button
        ref={triggerRef}
        className={tokenStyles.tokenTrigger}
        onClick={handleOpen}
        title="Pick variable"
      >
        <TokenIcon />
      </button>
      {children}
      {open && (
        <div
          ref={overlayRef}
          className={tokenStyles.overlay}
          style={{ top: position.top, left: position.left }}
        >
          {filteredTokens.map((token) => (
            <button
              key={token.name}
              className={tokenStyles.tokenItem}
              onClick={() => handleSelect(token.name)}
            >
              {isColorValue(token.value) && (
                <span className={tokenStyles.tokenColor} style={{ background: token.value }} />
              )}
              <span className={tokenStyles.tokenName}>--{token.name}</span>
              <span className={tokenStyles.tokenValue}>{token.value}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
