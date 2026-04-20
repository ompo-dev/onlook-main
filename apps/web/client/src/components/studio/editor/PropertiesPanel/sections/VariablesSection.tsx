import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Section } from '../Section';
import { ColorInput } from '../inputs/ColorInput';
import { TextInput } from '../inputs/TextInput';
import { Plus } from 'lucide-react';
import { classifyTokenValue, type TokenValueType } from '../../utils/classify-token-value';
import { useFilter, matchesFilter } from '../filter-utils';
import inputStyles from '../inputs/inputs.module.css';
import styles from './VariablesSection.module.css';

const GROUP_ORDER: TokenValueType[] = ['color', 'number', 'unknown'];
const GROUP_LABELS: Record<TokenValueType, string> = {
  color: 'Colors',
  number: 'Numbers',
  unknown: 'Other',
};

interface CssVariable {
  name: string;
  value: string;
}

interface VariableGroup {
  type: TokenValueType;
  label: string;
  vars: CssVariable[];
}

function groupVariables(vars: CssVariable[]): VariableGroup[] {
  const buckets = new Map<TokenValueType, CssVariable[]>();
  for (const v of vars) {
    const type = classifyTokenValue(v.value);
    let list = buckets.get(type);
    if (!list) {
      list = [];
      buckets.set(type, list);
    }
    list.push(v);
  }
  return GROUP_ORDER.filter((type) => buckets.has(type)).map((type) => ({
    type,
    label: GROUP_LABELS[type],
    vars: buckets.get(type)!,
  }));
}

function stripDashes(name: string): string {
  return name.trim().replace(/^-+/, '');
}

interface VariablesSectionProps {
  title?: string;
  variables: CssVariable[];
  onChange: (name: string, value: string) => void;
  onAdd: (name: string, value: string) => void;
  onRename?: (oldName: string, newName: string) => void;
  addTitle?: string;
  resetKey?: unknown;
  standalone?: boolean;
  emptyMessage?: string;
}

export function VariablesSection({
  title,
  variables,
  onChange,
  onAdd,
  onRename,
  addTitle,
  resetKey,
  standalone,
  emptyMessage,
}: VariablesSectionProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const filter = useFilter();
  const nameRef = useRef<HTMLInputElement>(null);
  const editNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) nameRef.current?.focus();
  }, [adding]);

  useEffect(() => {
    if (editingName !== null) editNameRef.current?.select();
  }, [editingName]);

  function resetForm() {
    setAdding(false);
    setNewName('');
    setNewValue('');
  }

  useEffect(resetForm, [resetKey]);

  function handleConfirm() {
    const trimmedName = stripDashes(newName);
    const trimmedValue = newValue.trim();
    if (!trimmedName || !trimmedValue) return;
    onAdd(trimmedName, trimmedValue);
    resetForm();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') resetForm();
  }

  function handleRowBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    const trimmedName = stripDashes(newName);
    if (!trimmedName || !newValue.trim()) resetForm();
  }

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    setNewName('');
    setNewValue('');
  }, []);

  const startEditName = useCallback((name: string) => {
    setEditingName(name);
    setEditNameValue(name);
  }, []);

  const commitEditName = useCallback(() => {
    if (editingName === null) return;
    const trimmed = stripDashes(editNameValue);
    if (trimmed && trimmed !== editingName) {
      onRename?.(editingName, trimmed);
    }
    setEditingName(null);
  }, [editingName, editNameValue, onRename]);

  const cancelEditName = useCallback(() => {
    setEditingName(null);
  }, []);

  const filteredVars = useMemo(
    () => (filter ? variables.filter((v) => matchesFilter(v.name, filter)) : variables),
    [variables, filter],
  );

  const groups = useMemo(() => groupVariables(filteredVars), [filteredVars]);

  if (!standalone && !emptyMessage && filteredVars.length === 0 && !adding) return null;

  const addForm = adding && (
    <div className={styles.newRow} onBlur={handleRowBlur}>
      <input
        ref={nameRef}
        type="text"
        className={styles.newInput}
        placeholder="name"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <input
        type="text"
        className={styles.newInput}
        placeholder="value"
        value={newValue}
        onChange={(e) => setNewValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );

  function renderVariable(v: CssVariable, type: TokenValueType): ReactNode {
    const isEditing = editingName === v.name;
    const labelOverride: ReactNode | undefined =
      onRename && isEditing ? (
        <input
          ref={editNameRef}
          type="text"
          className={`${inputStyles.label} ${inputStyles.mono} ${styles.editNameInput}`}
          value={editNameValue}
          onChange={(e) => setEditNameValue(e.target.value)}
          onBlur={commitEditName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEditName();
            if (e.key === 'Escape') cancelEditName();
          }}
        />
      ) : undefined;

    return type === 'color' ? (
      <ColorInput
        key={v.name}
        label={v.name}
        value={v.value}
        mono={true}
        onChange={(val) => onChange(v.name, val)}
        onLabelDoubleClick={onRename ? () => startEditName(v.name) : undefined}
        labelOverride={labelOverride}
      />
    ) : (
      <TextInput
        key={v.name}
        label={v.name}
        value={v.value}
        mono={true}
        onChange={(val) => onChange(v.name, val)}
        onLabelDoubleClick={onRename ? () => startEditName(v.name) : undefined}
        labelOverride={labelOverride}
      />
    );
  }

  if (standalone) {
    return (
      <div className={styles.standalone}>
        {addForm}
        {filteredVars.length === 0 && !adding && emptyMessage && (
          <div className={styles.empty}>
            <div>{emptyMessage}</div>
            <button className={styles.emptyAdd} onClick={handleAddClick}>
              <Plus /> Add variable
            </button>
          </div>
        )}
        {groups.map((group) => (
          <div key={group.type} className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={styles.groupLabel}>{group.label}</span>
              <button className={styles.groupAdd} onClick={handleAddClick} title={addTitle}>
                <Plus />
              </button>
            </div>
            {group.vars.map((v) => renderVariable(v, group.type))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Section title={title} onAdd={handleAddClick} addTitle={addTitle}>
      {addForm}
      {filteredVars.length === 0 && !adding && emptyMessage && (
        <div className={styles.empty}>{emptyMessage}</div>
      )}
      {groups.map((group) => (
        <div key={group.type}>
          {groups.length > 1 && <div className={styles.groupLabel}>{group.label}</div>}
          {group.vars.map((v) => renderVariable(v, group.type))}
        </div>
      ))}
    </Section>
  );
}
