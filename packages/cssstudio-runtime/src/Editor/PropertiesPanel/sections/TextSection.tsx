import { useState, useMemo, useCallback, type ReactNode } from 'react';
import { Section } from '../Section';
import { ColorInput } from '../inputs/ColorInput';
import { NumberInput } from '../inputs/NumberInput';
import { SelectInput } from '../inputs/SelectInput';
import { TextInput } from '../inputs/TextInput';
import { IconTabBar, type TabOption } from '../inputs/IconTabBar';
import { TokenPicker } from '../inputs/TokenPicker';
import { ContextMenu } from '../../ContextMenu';
import { useFilter, matchesFilter } from '../filter-utils';
import { useRowContextMenu } from '../use-row-context-menu';
import {
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignJustifyIcon,
  DecorationNoneIcon,
  UnderlineIcon,
  OverlineIcon,
  StrikethroughIcon,
  TransformNoneIcon,
  UppercaseIcon,
  LowercaseIcon,
  CapitalizeIcon,
} from '../../icons/LayoutIcons';

const TEXT_ALIGN_TABS: TabOption[] = [
  { value: 'left', icon: <AlignLeftIcon />, title: 'Left' },
  { value: 'center', icon: <AlignCenterIcon />, title: 'Center' },
  { value: 'right', icon: <AlignRightIcon />, title: 'Right' },
  { value: 'justify', icon: <AlignJustifyIcon />, title: 'Justify' },
];

const TEXT_DECORATION_TABS: TabOption[] = [
  { value: 'none', icon: <DecorationNoneIcon />, title: 'None' },
  { value: 'underline', icon: <UnderlineIcon />, title: 'Underline' },
  { value: 'overline', icon: <OverlineIcon />, title: 'Overline' },
  { value: 'line-through', icon: <StrikethroughIcon />, title: 'Line through' },
];

const TEXT_TRANSFORM_TABS: TabOption[] = [
  { value: 'none', icon: <TransformNoneIcon />, title: 'None' },
  { value: 'uppercase', icon: <UppercaseIcon />, title: 'Uppercase' },
  { value: 'lowercase', icon: <LowercaseIcon />, title: 'Lowercase' },
  { value: 'capitalize', icon: <CapitalizeIcon />, title: 'Capitalize' },
];

interface OptionalPropertyBase {
  name: string;
  displayName: string;
}
interface IconTabProp extends OptionalPropertyBase {
  type: 'icon-tab';
  tabs: TabOption[];
}
interface SelectProp extends OptionalPropertyBase {
  type: 'select';
  options: string[];
}
interface TextProp extends OptionalPropertyBase {
  type: 'text';
}
type OptionalProperty = IconTabProp | SelectProp | TextProp;

const OPTIONAL_PROPERTIES: OptionalProperty[] = [
  { name: 'text-decoration', displayName: 'Decoration', type: 'icon-tab', tabs: TEXT_DECORATION_TABS },
  { name: 'text-transform', displayName: 'Transform', type: 'icon-tab', tabs: TEXT_TRANSFORM_TABS },
  { name: 'text-overflow', displayName: 'Overflow', type: 'select', options: ['clip', 'ellipsis'] },
  {
    name: 'white-space',
    displayName: 'White Space',
    type: 'select',
    options: ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line'],
  },
  {
    name: 'word-break',
    displayName: 'Word Break',
    type: 'select',
    options: ['normal', 'break-all', 'keep-all'],
  },
  { name: 'text-shadow', displayName: 'Shadow', type: 'text' },
];

interface TextSectionProps {
  getValue: (prop: string) => string;
  onChange: (prop: string, value: string) => void;
  onFocus?: () => void;
  explicitPropertyNames: Set<string>;
}

export function TextSection({ getValue, onChange, onFocus, explicitPropertyNames }: TextSectionProps) {
  const [userAdded, setUserAdded] = useState<Set<string>>(new Set());
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const { onRowContextMenu, RowContextMenu } = useRowContextMenu();
  const filter = useFilter();
  const f = (name: string) => matchesFilter(name, filter);

  const visibleOptional = useMemo(
    () =>
      OPTIONAL_PROPERTIES.filter((p) => explicitPropertyNames.has(p.name) || userAdded.has(p.name)),
    [explicitPropertyNames, userAdded],
  );

  const addableProperties = useMemo(
    () =>
      OPTIONAL_PROPERTIES.filter(
        (p) => !explicitPropertyNames.has(p.name) && !userAdded.has(p.name),
      ),
    [explicitPropertyNames, userAdded],
  );

  const handlePlusClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.left, y: rect.bottom + 4 });
  }, []);

  const handleAddProperty = useCallback((name: string) => {
    setUserAdded((prev) => new Set(prev).add(name));
  }, []);

  const handleRemoveProperty = useCallback(
    (name: string) => {
      setUserAdded((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
      onChange(name, '');
    },
    [onChange],
  );

  const rows: ReactNode[] = [];

  if (f('Font')) {
    rows.push(
      <TokenPicker
        key="font-family"
        value={getValue('font-family')}
        label="Font"
        tokenType="unknown"
        onSelect={(v) => onChange('font-family', v)}
      >
        <TextInput
          label="font-family"
          displayName="Font"
          value={getValue('font-family')}
          onChange={(v) => onChange('font-family', v)}
          onFocus={onFocus}
        />
      </TokenPicker>,
    );
  }

  if (f('Size')) {
    rows.push(
      <TokenPicker
        key="font-size"
        value={getValue('font-size')}
        label="Size"
        tokenType="number"
        onSelect={(v) => onChange('font-size', v)}
      >
        <NumberInput
          label="font-size"
          displayName="Size"
          value={getValue('font-size')}
          onChange={(v) => onChange('font-size', v)}
          onFocus={onFocus}
        />
      </TokenPicker>,
    );
  }

  if (f('Color')) {
    rows.push(
      <TokenPicker
        key="color"
        value={getValue('color')}
        label="Color"
        tokenType="color"
        onSelect={(v) => onChange('color', v)}
      >
        <ColorInput
          label="color"
          displayName="Color"
          value={getValue('color')}
          onChange={(v) => onChange('color', v)}
          onFocus={onFocus}
        />
      </TokenPicker>,
    );
  }

  if (f('Weight')) {
    rows.push(
      <TokenPicker
        key="font-weight"
        value={getValue('font-weight')}
        label="Weight"
        tokenType="number"
        onSelect={(v) => onChange('font-weight', v)}
      >
        <NumberInput
          label="font-weight"
          displayName="Weight"
          value={getValue('font-weight')}
          onChange={(v) => onChange('font-weight', v)}
          onFocus={onFocus}
        />
      </TokenPicker>,
    );
  }

  if (f('Letter Spacing')) {
    rows.push(
      <TokenPicker
        key="letter-spacing"
        value={getValue('letter-spacing')}
        label="Letter Spacing"
        tokenType="number"
        onSelect={(v) => onChange('letter-spacing', v)}
      >
        <NumberInput
          label="letter-spacing"
          displayName="Letter Spacing"
          value={getValue('letter-spacing')}
          onChange={(v) => onChange('letter-spacing', v)}
          onFocus={onFocus}
        />
      </TokenPicker>,
    );
  }

  if (f('Line Height')) {
    rows.push(
      <TokenPicker
        key="line-height"
        value={getValue('line-height')}
        label="Line Height"
        tokenType="number"
        onSelect={(v) => onChange('line-height', v)}
      >
        <NumberInput
          label="line-height"
          displayName="Line Height"
          value={getValue('line-height')}
          onChange={(v) => onChange('line-height', v)}
          onFocus={onFocus}
        />
      </TokenPicker>,
    );
  }

  if (f('Align')) {
    rows.push(
      <IconTabBar
        key="text-align"
        label="text-align"
        displayName="Align"
        value={getValue('text-align') || 'left'}
        options={TEXT_ALIGN_TABS}
        onChange={(v) => onChange('text-align', v)}
        onFocus={onFocus}
      />,
    );
  }

  for (const prop of visibleOptional) {
    if (!f(prop.displayName)) continue;
    const isExplicit = explicitPropertyNames.has(prop.name);
    const removable = !isExplicit;
    const wrapNode = (node: ReactNode) =>
      removable ? (
        <div
          key={prop.name}
          onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProperty(prop.name))}
        >
          {node}
        </div>
      ) : (
        node
      );

    if (prop.type === 'icon-tab') {
      rows.push(
        wrapNode(
          <IconTabBar
            key={prop.name}
            label={prop.name}
            displayName={prop.displayName}
            value={getValue(prop.name) || prop.tabs[0].value}
            options={prop.tabs}
            onChange={(v) => onChange(prop.name, v)}
            onFocus={onFocus}
          />,
        ),
      );
    } else if (prop.type === 'select') {
      rows.push(
        wrapNode(
          <SelectInput
            key={prop.name}
            label={prop.name}
            displayName={prop.displayName}
            value={getValue(prop.name)}
            options={prop.options}
            onChange={(v) => onChange(prop.name, v)}
            onFocus={onFocus}
          />,
        ),
      );
    } else {
      rows.push(
        wrapNode(
          <TextInput
            key={prop.name}
            label={prop.name}
            displayName={prop.displayName}
            value={getValue(prop.name)}
            onChange={(v) => onChange(prop.name, v)}
            onFocus={onFocus}
          />,
        ),
      );
    }
  }

  if (rows.length === 0) return null;

  return (
    <>
      <Section
        title="Text"
        onAdd={addableProperties.length > 0 ? handlePlusClick : undefined}
        addTitle="Add text property"
      >
        {rows}
      </Section>
      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          animate={true}
          items={addableProperties.map((p) => ({
            label: p.displayName,
            onClick: () => handleAddProperty(p.name),
          }))}
          onClose={() => setMenuPos(null)}
        />
      )}
      {RowContextMenu}
    </>
  );
}
