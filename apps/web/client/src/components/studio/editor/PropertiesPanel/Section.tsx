import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

interface SectionProps {
  title?: string;
  onAdd?: () => void;
  addTitle?: string;
  children?: ReactNode;
}

export function Section({ title, onAdd, addTitle, children }: SectionProps) {
  return (
    <div className="border-b border-[var(--cs-border)] py-1 last:border-b-0">
      {(title || onAdd) && (
        <div className="flex items-center justify-between gap-2 px-3 py-1">
          {title ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--cs-secondary-text)]">
              {title}
            </span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--cs-secondary-text)]" />
          )}
          {onAdd && (
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded text-[var(--cs-icon-muted)] transition hover:bg-[var(--cs-feint)] hover:text-[var(--cs-foreground)]"
              onClick={onAdd}
              title={addTitle}
            >
              <Plus size={12} />
            </button>
          )}
        </div>
      )}
      <div className="pb-1">{children}</div>
    </div>
  );
}
