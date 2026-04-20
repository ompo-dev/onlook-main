import { useState, useMemo, useCallback } from 'react';
import { Section } from '../Section';
import { NumberInput, SMALL_SPATIAL_UNITS } from '../inputs/NumberInput';
import { SelectInput } from '../inputs/SelectInput';
import { TextInput } from '../inputs/TextInput';
import { IconTabBar, type TabOption } from '../inputs/IconTabBar';
import { SplitAxisToggle } from '../inputs/SplitAxisToggle';
import { PositionBox } from '../inputs/PositionBox';
import { TokenPicker } from '../inputs/TokenPicker';
import { ContextMenu } from '../../ContextMenu';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  AlignStretchHIcon,
  AlignStretchVIcon,
  AlignStartHIcon,
  AlignCenterHIcon,
  AlignEndHIcon,
  AlignStartVIcon,
  AlignCenterVIcon,
  AlignEndVIcon,
  GridStretchIcon,
  GridStartIcon,
  GridCenterIcon,
  GridEndIcon,
  NoWrapIcon,
  WrapIcon,
  WrapReverseIcon,
} from '../layout-icons';
import { useFilter, matchesFilter } from '../filter-utils';
import { useRowContextMenu } from '../use-row-context-menu';
import sectionStyles from '../Section.module.css';

const DISPLAY_OPTIONS = [
  'block',
  'flex',
  'grid',
  'inline',
  'inline-block',
  'inline-flex',
  'inline-grid',
  'none',
];
const POSITION_OPTIONS = ['static', 'relative', 'absolute', 'fixed', 'sticky'];
const BOX_SIZING_OPTIONS = ['content-box', 'border-box'];
const GRID_AUTO_FLOW_OPTIONS = ['row', 'column', 'dense', 'row dense', 'column dense'];
const JUSTIFY_OPTIONS = [
  'flex-start',
  'center',
  'flex-end',
  'space-between',
  'space-around',
  'space-evenly',
];

const isGridDisplay = (v: string) => v === 'grid' || v === 'inline-grid';

const DIRECTION_TABS: TabOption[] = [
  { value: 'column', icon: <ArrowDownIcon />, title: 'Column' },
  { value: 'column-reverse', icon: <ArrowUpIcon />, title: 'Column reverse' },
  { value: 'row', icon: <ArrowRightIcon />, title: 'Row' },
  { value: 'row-reverse', icon: <ArrowLeftIcon />, title: 'Row reverse' },
];

const ALIGN_TABS_ROW: TabOption[] = [
  { value: 'stretch', icon: <AlignStretchVIcon />, title: 'Stretch' },
  { value: 'flex-start', icon: <AlignStartHIcon />, title: 'Flex start' },
  { value: 'center', icon: <AlignCenterHIcon />, title: 'Center' },
  { value: 'flex-end', icon: <AlignEndHIcon />, title: 'Flex end' },
];

const ALIGN_TABS_COL: TabOption[] = [
  { value: 'stretch', icon: <AlignStretchHIcon />, title: 'Stretch' },
  { value: 'flex-start', icon: <AlignStartVIcon />, title: 'Flex start' },
  { value: 'center', icon: <AlignCenterVIcon />, title: 'Center' },
  { value: 'flex-end', icon: <AlignEndVIcon />, title: 'Flex end' },
];

const GRID_JUSTIFY_TABS: TabOption[] = [
  { value: 'stretch', icon: <GridStretchIcon />, title: 'Stretch' },
  { value: 'start', icon: <GridStartIcon />, title: 'Start' },
  { value: 'center', icon: <GridCenterIcon />, title: 'Center' },
  { value: 'end', icon: <GridEndIcon />, title: 'End' },
];

const GRID_ALIGN_TABS: TabOption[] = [
  { value: 'stretch', icon: <AlignStretchVIcon />, title: 'Stretch' },
  { value: 'start', icon: <AlignStartVIcon />, title: 'Start' },
  { value: 'center', icon: <AlignCenterVIcon />, title: 'Center' },
  { value: 'end', icon: <AlignEndVIcon />, title: 'End' },
];

const WRAP_TABS: TabOption[] = [
  { value: 'nowrap', icon: <NoWrapIcon />, title: 'No wrap' },
  { value: 'wrap', icon: <WrapIcon />, title: 'Wrap' },
  { value: 'wrap-reverse', icon: <WrapReverseIcon />, title: 'Wrap reverse' },
];

const RESET_VALUES: Record<string, string> = {
  'min-width': '0px',
  'min-height': '0px',
  'max-width': 'none',
  'max-height': 'none',
};

const MIN_MAX_PROPS = ['min-width', 'max-width', 'min-height', 'max-height'];

function isMinMaxSet(value: string, prop: string): boolean {
  if (!value) return false;
  const defaults = prop.startsWith('min-') ? ['0px', '0', 'auto', ''] : ['none', 'auto', ''];
  return !defaults.includes(value);
}

interface SizeDimensionProps {
  dim: string;
  label: string;
  getValue: (prop: string) => string;
  onChange: (prop: string, value: string) => void;
  onFocus?: () => void;
  visibleMinMax: Set<string>;
  onRowContextMenu: (e: React.MouseEvent, fn: () => void) => void;
  onRemoveProp: (prop: string) => void;
}

function SizeDimension({
  dim,
  label,
  getValue,
  onChange,
  onFocus,
  visibleMinMax,
  onRowContextMenu,
  onRemoveProp,
}: SizeDimensionProps) {
  return (
    <>
      <TokenPicker
        value={getValue(dim)}
        label={label}
        tokenType="number"
        onSelect={(v) => onChange(dim, v)}
      >
        <NumberInput
          label={dim}
          displayName={label}
          value={getValue(dim)}
          onChange={(v) => onChange(dim, v)}
          onFocus={onFocus}
        />
      </TokenPicker>
      {['min', 'max'].map((bound) => {
        const prop = `${bound}-${dim}`;
        if (!visibleMinMax.has(prop)) return null;
        const boundLabel = bound[0].toUpperCase() + bound.slice(1);
        return (
          <div key={prop} onContextMenu={(e) => onRowContextMenu(e, () => onRemoveProp(prop))}>
            <TokenPicker
              value={getValue(prop)}
              label={boundLabel}
              indent={true}
              tokenType="number"
              onSelect={(v) => onChange(prop, v)}
            >
              <NumberInput
                label={prop}
                displayName={boundLabel}
                value={getValue(prop)}
                showSlider={false}
                onChange={(v) => onChange(prop, v)}
                onFocus={onFocus}
                indent={true}
              />
            </TokenPicker>
          </div>
        );
      })}
    </>
  );
}

interface LayoutSectionProps {
  getValue: (prop: string) => string;
  onChange: (prop: string, value: string) => void;
  onFocus?: () => void;
  parentDisplay?: string;
}

export function LayoutSection({ getValue, onChange, onFocus, parentDisplay }: LayoutSectionProps) {
  const filter = useFilter();
  const f = (name: string) => matchesFilter(name, filter);
  const [addMenu, setAddMenu] = useState<{ x: number; y: number } | null>(null);
  const [addedProps, setAddedProps] = useState<Set<string>>(new Set());
  const { onRowContextMenu, RowContextMenu } = useRowContextMenu();

  const display = getValue('display');
  const flexDir = getValue('flex-direction') || 'row';
  const position = getValue('position');
  const showPositionBox = position !== 'static' && position !== '';
  const isFlex = ['flex', 'inline-flex'].includes(display);
  const isGrid = isGridDisplay(display);
  const showGap = isFlex || isGrid;
  const isColumnDir = flexDir === 'column' || flexDir === 'column-reverse';
  const isGridChild = isGridDisplay(parentDisplay ?? '');

  const visibleMinMax = useMemo(() => {
    const set = new Set<string>();
    for (const prop of MIN_MAX_PROPS) {
      if (addedProps.has(prop) || isMinMaxSet(getValue(prop), prop)) {
        set.add(prop);
      }
    }
    return set;
  }, [getValue, addedProps]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAddMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleRemoveProp = useCallback(
    (prop: string) => {
      onChange(prop, RESET_VALUES[prop] ?? '');
      setAddedProps((prev) => {
        const next = new Set(prev);
        next.delete(prop);
        return next;
      });
    },
    [onChange],
  );

  const sizeMenuItems = useMemo(() => {
    const items: Array<{ label: string; onClick: () => void }> = [];
    for (const prop of MIN_MAX_PROPS) {
      if (!visibleMinMax.has(prop)) {
        const label = prop
          .split('-')
          .map((w) => w[0].toUpperCase() + w.slice(1))
          .join(' ');
        items.push({
          label,
          onClick: () => {
            setAddedProps((prev) => new Set(prev).add(prop));
          },
        });
      }
    }
    return items;
  }, [visibleMinMax]);

  const sizeVisible =
    f('Width') || f('Height') || f('Padding') || f('Margin') || f('Box Sizing');
  const layoutVisible =
    f('Display') ||
    f('Gap') ||
    f('Direction') ||
    f('Justify') ||
    f('Align') ||
    f('Wrap') ||
    f('Columns') ||
    f('Rows') ||
    f('Auto Flow') ||
    f('Justify Items') ||
    f('Align Items') ||
    f('Grid Column') ||
    f('Grid Row') ||
    f('Position');

  if (!sizeVisible && !layoutVisible) return null;

  return (
    <>
      {sizeVisible && (
        <Section
          title="Size"
          onAdd={sizeMenuItems.length > 0 ? handleAddClick : undefined}
          addTitle="Add size constraint"
        >
          {(['width', 'height'] as const).map((dim) => {
            const label = (dim[0].toUpperCase() + dim.slice(1)) as string;
            if (!f(label)) return null;
            return (
              <SizeDimension
                key={dim}
                dim={dim}
                label={label}
                getValue={getValue}
                onChange={onChange}
                onFocus={onFocus}
                visibleMinMax={visibleMinMax}
                onRowContextMenu={onRowContextMenu}
                onRemoveProp={handleRemoveProp}
              />
            );
          })}
          {f('Padding') && (
            <SplitAxisToggle
              prop="padding"
              displayName="Padding"
              value={getValue('padding')}
              getValue={getValue}
              onChange={onChange}
              onFocus={onFocus}
            />
          )}
          {f('Margin') && (
            <SplitAxisToggle
              prop="margin"
              displayName="Margin"
              value={getValue('margin')}
              getValue={getValue}
              onChange={onChange}
              onFocus={onFocus}
            />
          )}
          {f('Box Sizing') && (
            <SelectInput
              label="box-sizing"
              displayName="Box Sizing"
              value={getValue('box-sizing')}
              options={BOX_SIZING_OPTIONS}
              onChange={(v) => onChange('box-sizing', v)}
              onFocus={onFocus}
            />
          )}
        </Section>
      )}
      {layoutVisible && (
        <Section title="Layout">
          {f('Display') && (
            <SelectInput
              label="display"
              displayName="Display"
              value={display}
              options={DISPLAY_OPTIONS}
              onChange={(v) => onChange('display', v)}
              onFocus={onFocus}
            />
          )}
          {showGap && f('Gap') && (
            <TokenPicker
              value={getValue('gap')}
              label="Gap"
              tokenType="number"
              onSelect={(v) => onChange('gap', v)}
            >
              <NumberInput
                label="gap"
                displayName="Gap"
                value={getValue('gap')}
                onChange={(v) => onChange('gap', v)}
                onFocus={onFocus}
              />
            </TokenPicker>
          )}
          {isFlex && f('Direction') && (
            <IconTabBar
              label="flex-direction"
              displayName="Direction"
              value={flexDir}
              options={DIRECTION_TABS}
              onChange={(v) => onChange('flex-direction', v)}
              onFocus={onFocus}
            />
          )}
          {isFlex && f('Justify') && (
            <SelectInput
              label="justify-content"
              displayName="Justify"
              value={getValue('justify-content')}
              options={JUSTIFY_OPTIONS}
              onChange={(v) => onChange('justify-content', v)}
              onFocus={onFocus}
            />
          )}
          {isFlex && f('Align') && (
            <IconTabBar
              label="align-items"
              displayName="Align"
              value={getValue('align-items') || 'stretch'}
              options={isColumnDir ? ALIGN_TABS_COL : ALIGN_TABS_ROW}
              onChange={(v) => onChange('align-items', v)}
              onFocus={onFocus}
            />
          )}
          {isFlex && f('Wrap') && (
            <IconTabBar
              label="flex-wrap"
              displayName="Wrap"
              value={getValue('flex-wrap') || 'nowrap'}
              options={WRAP_TABS}
              onChange={(v) => onChange('flex-wrap', v)}
              onFocus={onFocus}
            />
          )}
          {isGrid && f('Columns') && (
            <TextInput
              label="grid-template-columns"
              displayName="Columns"
              value={getValue('grid-template-columns')}
              onChange={(v) => onChange('grid-template-columns', v)}
              onFocus={onFocus}
            />
          )}
          {isGrid && f('Rows') && (
            <TextInput
              label="grid-template-rows"
              displayName="Rows"
              value={getValue('grid-template-rows')}
              onChange={(v) => onChange('grid-template-rows', v)}
              onFocus={onFocus}
            />
          )}
          {isGrid && f('Auto Flow') && (
            <SelectInput
              label="grid-auto-flow"
              displayName="Auto Flow"
              value={getValue('grid-auto-flow')}
              options={GRID_AUTO_FLOW_OPTIONS}
              onChange={(v) => onChange('grid-auto-flow', v)}
              onFocus={onFocus}
            />
          )}
          {isGrid && f('Justify Items') && (
            <IconTabBar
              label="justify-items"
              displayName="Justify Items"
              value={getValue('justify-items') || 'stretch'}
              options={GRID_JUSTIFY_TABS}
              onChange={(v) => onChange('justify-items', v)}
              onFocus={onFocus}
            />
          )}
          {isGrid && f('Align Items') && (
            <IconTabBar
              label="align-items"
              displayName="Align Items"
              value={getValue('align-items') || 'stretch'}
              options={GRID_ALIGN_TABS}
              onChange={(v) => onChange('align-items', v)}
              onFocus={onFocus}
            />
          )}
          {isGridChild && f('Grid Column') && (
            <TextInput
              label="grid-column"
              displayName="Grid Column"
              value={getValue('grid-column')}
              onChange={(v) => onChange('grid-column', v)}
              onFocus={onFocus}
            />
          )}
          {isGridChild && f('Grid Row') && (
            <TextInput
              label="grid-row"
              displayName="Grid Row"
              value={getValue('grid-row')}
              onChange={(v) => onChange('grid-row', v)}
              onFocus={onFocus}
            />
          )}
          {(isFlex || isGrid || isGridChild) && <div className={sectionStyles.divider} />}
          {f('Position') && (
            <SelectInput
              label="position"
              displayName="Position"
              value={position}
              options={POSITION_OPTIONS}
              onChange={(v) => onChange('position', v)}
              onFocus={onFocus}
            />
          )}
          {f('Position') && showPositionBox && (
            <PositionBox position={position} getValue={getValue} onChange={onChange} onFocus={onFocus} />
          )}
        </Section>
      )}
      {addMenu && (
        <ContextMenu
          x={addMenu.x}
          y={addMenu.y}
          items={sizeMenuItems}
          onClose={() => setAddMenu(null)}
          animate={true}
        />
      )}
      {RowContextMenu}
    </>
  );
}
