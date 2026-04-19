import { useState, useMemo, useCallback } from 'react';
import { Section } from '../Section';
import { ColorInput } from '../inputs/ColorInput';
import { NumberInput } from '../inputs/NumberInput';
import { SelectInput } from '../inputs/SelectInput';
import { TextInput } from '../inputs/TextInput';
import { BorderInput } from '../inputs/BorderInput';
import { BoxShadowInput } from '../inputs/BoxShadowInput';
import { OverflowInput } from '../inputs/OverflowInput';
import { PerCornerToggle } from '../inputs/PerCornerToggle';
import { TokenPicker } from '../inputs/TokenPicker';
import { ContextMenu } from '../../ContextMenu';
import {
  parseFilter,
  serializeFilter,
  FILTER_CONFIGS,
  getFilterConfig,
} from '../../utils/parse-filter';
import { useFilter, matchesFilter } from '../filter-utils';
import { useRowContextMenu } from '../use-row-context-menu';

const CURSOR_OPTIONS = [
  'auto',
  'default',
  'none',
  'pointer',
  'text',
  'move',
  'wait',
  'progress',
  'help',
  'not-allowed',
  'no-drop',
  'grab',
  'grabbing',
  'crosshair',
  'cell',
  'alias',
  'copy',
  'context-menu',
  'vertical-text',
  'all-scroll',
  'col-resize',
  'row-resize',
  'n-resize',
  'e-resize',
  's-resize',
  'w-resize',
  'ne-resize',
  'nw-resize',
  'se-resize',
  'sw-resize',
  'ew-resize',
  'ns-resize',
  'nesw-resize',
  'nwse-resize',
  'zoom-in',
  'zoom-out',
];

interface StylesSectionProps {
  getValue: (prop: string) => string;
  onChange: (prop: string, value: string) => void;
  onFocus?: () => void;
}

export function StylesSection({ getValue, onChange, onFocus }: StylesSectionProps) {
  const [addMenu, setAddMenu] = useState<{ x: number; y: number } | null>(null);
  const [addedProps, setAddedProps] = useState<Set<string>>(new Set());
  const { onRowContextMenu, RowContextMenu } = useRowContextMenu();
  const filter = useFilter();
  const f = (name: string) => matchesFilter(name, filter);

  const cursorValue = getValue('cursor');
  const showCursor = (!!cursorValue && cursorValue !== 'auto') || addedProps.has('cursor');
  const zIndexValue = getValue('z-index');
  const showZIndex = (!!zIndexValue && zIndexValue !== 'auto') || addedProps.has('z-index');
  const cornerShapeValue = getValue('corner-shape');
  const showCornerShape = !!cornerShapeValue || addedProps.has('corner-shape');
  const maskValue = getValue('mask-image');
  const showMask = (!!maskValue && maskValue !== 'none') || addedProps.has('mask-image');
  const shadowValue = getValue('box-shadow');
  const showShadow = (!!shadowValue && shadowValue !== 'none') || addedProps.has('box-shadow');
  const filterValue = getValue('filter');
  const parsedFilters = useMemo(() => parseFilter(filterValue), [filterValue]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAddMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleAddFilter = useCallback(
    (name: string, defaultValue: number, unit?: string) => {
      const newArgs = unit ? `${defaultValue}${unit}` : String(defaultValue);
      const newFilter = { name, args: newArgs, numericValue: defaultValue, unit };
      const updated = [...parsedFilters, newFilter];
      onChange('filter', serializeFilter(updated));
    },
    [parsedFilters, onChange],
  );

  const handleFilterChange = useCallback(
    (index: number, newArgs: string) => {
      const updated = parsedFilters.map((pf, i) => (i === index ? { ...pf, args: newArgs } : pf));
      onChange('filter', serializeFilter(updated));
    },
    [parsedFilters, onChange],
  );

  const handleFilterDelete = useCallback(
    (index: number) => {
      const updated = parsedFilters.filter((_, i) => i !== index);
      onChange('filter', serializeFilter(updated));
    },
    [parsedFilters, onChange],
  );

  const handleRemoveProp = useCallback(
    (prop: string) => {
      onChange(prop, '');
      if (prop === 'corner-shape') {
        onChange('corner-shape-top-left', '');
        onChange('corner-shape-top-right', '');
        onChange('corner-shape-bottom-right', '');
        onChange('corner-shape-bottom-left', '');
      }
      setAddedProps((prev) => {
        const next = new Set(prev);
        next.delete(prop);
        return next;
      });
    },
    [onChange],
  );

  const menuItems = useMemo(() => {
    const items: Array<{ label: string; onClick: () => void }> = [];
    if (!showCornerShape) {
      items.push({
        label: 'Corner Shape',
        onClick: () => {
          setAddedProps((prev) => new Set(prev).add('corner-shape'));
          onChange('corner-shape', 'round');
        },
      });
    }
    if (!showZIndex) {
      items.push({
        label: 'Z-Index',
        onClick: () => {
          setAddedProps((prev) => new Set(prev).add('z-index'));
          onChange('z-index', '1');
        },
      });
    }
    if (!showCursor) {
      items.push({
        label: 'Cursor',
        onClick: () => {
          setAddedProps((prev) => new Set(prev).add('cursor'));
          onChange('cursor', 'pointer');
        },
      });
    }
    if (!showShadow) {
      items.push({
        label: 'Shadow',
        onClick: () => {
          setAddedProps((prev) => new Set(prev).add('box-shadow'));
          onChange('box-shadow', '0px 4px 6px rgba(0, 0, 0, 0.1)');
        },
      });
    }
    if (!showMask) {
      items.push({
        label: 'Mask',
        onClick: () => {
          setAddedProps((prev) => new Set(prev).add('mask-image'));
        },
      });
    }
    const existing = new Set(parsedFilters.map((pf) => pf.name));
    for (const config of FILTER_CONFIGS) {
      if (!existing.has(config.name)) {
        items.push({
          label: config.displayName,
          onClick: () => handleAddFilter(config.name, config.defaultValue, config.unit),
        });
      }
    }
    return items;
  }, [
    parsedFilters,
    handleAddFilter,
    showCornerShape,
    showCursor,
    showZIndex,
    showShadow,
    showMask,
    onChange,
  ]);

  const hasVisibleFilters = parsedFilters.some((pf) => {
    const config = getFilterConfig(pf.name);
    return f(config ? config.displayName : pf.name);
  });

  const hasVisible =
    f('Opacity') ||
    f('Background') ||
    f('Overflow') ||
    f('Border Radius') ||
    f('Corner Shape') ||
    f('Border') ||
    f('Shadow') ||
    f('Mask') ||
    f('Z-Index') ||
    f('Cursor') ||
    hasVisibleFilters;

  if (!hasVisible) return null;

  const borderMatch = f('Border');

  return (
    <>
      <Section title="Styles" onAdd={handleAddClick} addTitle="Add style">
        {f('Opacity') && (
          <TokenPicker
            value={getValue('opacity')}
            label="Opacity"
            tokenType="number"
            onSelect={(v) => onChange('opacity', v)}
          >
            <NumberInput
              label="opacity"
              displayName="Opacity"
              value={getValue('opacity')}
              onChange={(v) => onChange('opacity', v)}
              onFocus={onFocus}
            />
          </TokenPicker>
        )}
        {f('Background') && (
          <TokenPicker
            value={getValue('background-color') || getValue('background')}
            label="Background"
            tokenType="color"
            onSelect={(v) => onChange('background-color', v)}
          >
            <ColorInput
              label="background"
              displayName="Background"
              value={getValue('background-color') || getValue('background')}
              onChange={(v) => onChange('background-color', v)}
              onFocus={onFocus}
              supportsGradient={true}
              onPropertyChange={(prop, val) => {
                onChange(prop, val);
                if (prop === 'background') onChange('background-color', '');
                if (prop === 'background-color') onChange('background', '');
              }}
            />
          </TokenPicker>
        )}
        {f('Overflow') && (
          <OverflowInput value={getValue('overflow')} getValue={getValue} onChange={onChange} onFocus={onFocus} />
        )}
        {f('Border Radius') && (
          <PerCornerToggle
            prop="border-radius"
            displayName="Border Radius"
            value={getValue('border-radius')}
            getValue={getValue}
            onChange={onChange}
            onFocus={onFocus}
          />
        )}
        {showCornerShape && f('Corner Shape') && (
          <div onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProp('corner-shape'))}>
            <PerCornerToggle
              prop="corner-shape"
              displayName="Corner Shape"
              value={cornerShapeValue || 'round'}
              getValue={getValue}
              onChange={onChange}
              onFocus={onFocus}
              type="corner-shape"
            />
          </div>
        )}
        {borderMatch && (
          <TokenPicker
            value={getValue('border')}
            label="Border"
            onSelect={(v) => onChange('border', v)}
          >
            <BorderInput value={getValue('border')} getValue={getValue} onChange={onChange} onFocus={onFocus} />
          </TokenPicker>
        )}
        {showShadow && f('Shadow') && (
          <div onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProp('box-shadow'))}>
            <TokenPicker
              value={getValue('box-shadow')}
              label="Shadow"
              onSelect={(v) => onChange('box-shadow', v)}
            >
              <BoxShadowInput
                value={getValue('box-shadow')}
                onChange={(v) => onChange('box-shadow', v)}
                onFocus={onFocus}
              />
            </TokenPicker>
          </div>
        )}
        {showMask && f('Mask') && (
          <div onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProp('mask-image'))}>
            <TokenPicker
              value={getValue('mask-image')}
              label="Mask"
              onSelect={(v) => onChange('mask-image', v)}
            >
              <TextInput
                label="mask-image"
                displayName="Mask"
                value={getValue('mask-image')}
                onChange={(v) => onChange('mask-image', v)}
                onFocus={onFocus}
              />
            </TokenPicker>
          </div>
        )}
        {showZIndex && f('Z-Index') && (
          <div onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProp('z-index'))}>
            <NumberInput
              label="z-index"
              displayName="Z-Index"
              value={zIndexValue || '1'}
              step={1}
              onChange={(v) => onChange('z-index', v)}
              onFocus={onFocus}
            />
          </div>
        )}
        {showCursor && f('Cursor') && (
          <div onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProp('cursor'))}>
            <SelectInput
              label="cursor"
              displayName="Cursor"
              value={cursorValue || 'auto'}
              options={CURSOR_OPTIONS}
              onChange={(v) => onChange('cursor', v)}
              onFocus={onFocus}
            />
          </div>
        )}
        {parsedFilters.map((pf, index) => {
          const config = getFilterConfig(pf.name);
          const displayName = config ? config.displayName : pf.name;
          if (!f(displayName)) return null;
          if (config) {
            return (
              <div
                key={pf.name}
                onContextMenu={(e) => onRowContextMenu(e, () => handleFilterDelete(index))}
              >
                <NumberInput
                  displayName={config.displayName}
                  value={pf.args}
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  unit={config.unit}
                  onChange={(v) => handleFilterChange(index, v)}
                  onFocus={onFocus}
                />
              </div>
            );
          }
          return (
            <div
              key={`${pf.name}-${index}`}
              onContextMenu={(e) => onRowContextMenu(e, () => handleFilterDelete(index))}
            >
              <TextInput
                label={pf.name}
                displayName={pf.name}
                value={pf.args}
                onChange={(v) => handleFilterChange(index, v)}
                onFocus={onFocus}
              />
            </div>
          );
        })}
      </Section>
      {addMenu && (
        <ContextMenu
          x={addMenu.x}
          y={addMenu.y}
          items={menuItems}
          onClose={() => setAddMenu(null)}
          animate={true}
        />
      )}
      {RowContextMenu}
    </>
  );
}
