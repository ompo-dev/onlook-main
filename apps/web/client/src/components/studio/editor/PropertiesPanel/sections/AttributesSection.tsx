import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { Section } from '../Section';
import { TextInput } from '../inputs/TextInput';
import { useFilter, matchesFilter } from '../filter-utils';
import { useRowContextMenu } from '../use-row-context-menu';
import inputStyles from '../inputs/inputs.module.css';

let nextId = 0;

interface NewAttr {
  id: number;
  name: string;
  value: string;
}

interface AttributesSectionProps {
  attributes: Record<string, string>;
  onAttributeChange: (name: string, value: string) => void;
  onAttributeDelete: (name: string) => void;
  onAttributeRename?: (oldName: string, newName: string) => void;
}

export function AttributesSection({
  attributes,
  onAttributeChange,
  onAttributeDelete,
  onAttributeRename,
}: AttributesSectionProps) {
  const [newAttrs, setNewAttrs] = useState<NewAttr[]>([]);
  const valueRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const { onRowContextMenu, RowContextMenu } = useRowContextMenu();
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const editNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName !== null) editNameRef.current?.select();
  }, [editingName]);

  const startEditName = useCallback((name: string) => {
    setEditingName(name);
    setEditNameValue(name);
  }, []);

  const commitEditName = useCallback(() => {
    if (editingName === null) return;
    const trimmed = editNameValue.trim();
    if (trimmed && trimmed !== editingName) {
      onAttributeRename?.(editingName, trimmed);
    }
    setEditingName(null);
  }, [editingName, editNameValue, onAttributeRename]);

  const cancelEditName = useCallback(() => {
    setEditingName(null);
  }, []);

  const filter = useFilter();
  const f = (name: string) => matchesFilter(name, filter);

  const attrEntries = Object.entries(attributes).filter(([name]) => name !== 'style');

  const handleAddAttribute = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNewAttrs((prev) => [...prev, { id: nextId++, name: '', value: '' }]);
  }, []);

  const handleCommit = useCallback(
    (attr: NewAttr) => {
      if (attr.name.trim()) {
        onAttributeChange(attr.name.trim(), attr.value);
      }
      setNewAttrs((prev) => prev.filter((a) => a.id !== attr.id));
      delete valueRefs.current[attr.id];
    },
    [onAttributeChange],
  );

  const focusValue = (id: number) => {
    valueRefs.current[id]?.focus();
  };

  const filteredEntries = attrEntries.filter(([name]) => f(name));
  if (filteredEntries.length === 0 && filter) return null;

  return (
    <>
      <Section title="Attributes" onAdd={handleAddAttribute} addTitle="Add attribute">
        {filteredEntries.length > 0
          ? filteredEntries.map(([name, value]) => {
              const isEditing = editingName === name;
              const labelOverride: ReactNode | undefined = isEditing ? (
                <input
                  ref={editNameRef}
                  type="text"
                  className={`${inputStyles.label} ${inputStyles.mono}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--cs-accent)',
                    outline: 'none',
                    color: 'var(--cs-foreground)',
                    padding: 0,
                  }}
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onBlur={commitEditName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEditName();
                    if (e.key === 'Escape') cancelEditName();
                  }}
                />
              ) : undefined;
              return (
                <div
                  key={name}
                  onContextMenu={(e) => onRowContextMenu(e, () => onAttributeDelete(name))}
                >
                  <TextInput
                    label={name}
                    value={value}
                    mono={true}
                    onChange={(v) => onAttributeChange(name, v)}
                    onLabelDoubleClick={() => startEditName(name)}
                    labelOverride={labelOverride}
                  />
                </div>
              );
            })
          : newAttrs.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-[var(--cs-secondary-text)]">
                No attributes
              </div>
            )}
        {newAttrs.map((attr) => (
          <div key={attr.id} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="name"
              autoFocus
              style={{
                width: 80,
                padding: '2px 4px',
                background: 'var(--cs-feint)',
                border: '1px solid var(--cs-border)',
                borderRadius: 3,
                color: 'var(--cs-foreground)',
                fontFamily: 'var(--cs-font-mono)',
                fontSize: 11,
                outline: 'none',
              }}
              onChange={(e) => {
                setNewAttrs((prev) =>
                  prev.map((a) => (a.id === attr.id ? { ...a, name: e.target.value } : a)),
                );
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  focusValue(attr.id);
                }
              }}
            />
            <input
              ref={(el) => {
                valueRefs.current[attr.id] = el;
              }}
              type="text"
              placeholder="value"
              value={attr.value}
              style={{
                flex: 1,
                padding: '2px 4px',
                background: 'var(--cs-feint)',
                border: '1px solid var(--cs-border)',
                borderRadius: 3,
                color: 'var(--cs-foreground)',
                fontFamily: 'var(--cs-font-mono)',
                fontSize: 11,
                outline: 'none',
              }}
              onChange={(e) => {
                setNewAttrs((prev) =>
                  prev.map((a) => (a.id === attr.id ? { ...a, value: e.target.value } : a)),
                );
              }}
              onBlur={() => handleCommit(attr)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommit(attr);
              }}
            />
          </div>
        ))}
      </Section>
      {RowContextMenu}
    </>
  );
}
