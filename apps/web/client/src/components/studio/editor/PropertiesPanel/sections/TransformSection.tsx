import { useState, useMemo, useCallback } from 'react';
import { Section } from '../Section';
import { NumberInput, TRANSLATE_UNITS } from '../inputs/NumberInput';
import { TextInput } from '../inputs/TextInput';
import { ContextMenu } from '../../ContextMenu';
import {
  parseTransformFunctions,
  hasMatrixTransform,
  extractTranslateXY,
  extractTransformValue,
  extractScaleXY,
  getOtherFunctions,
  composeTransform,
} from '../../utils/parse-transform';
import { useFilter, matchesFilter } from '../filter-utils';
import { useRowContextMenu } from '../use-row-context-menu';

const OPTIONAL_PROPS = [
  { key: 'skewX', displayName: 'Skew X' },
  { key: 'skewY', displayName: 'Skew Y' },
  { key: 'origin', displayName: 'Origin' },
];

const ORIGIN_UNITS = [
  { unit: '%', min: -100, max: 200, step: 1, sliderMin: 0, sliderMax: 100 },
  { unit: 'px', min: -2000, max: 2000, step: 1, sliderMin: -200, sliderMax: 200 },
];

function parseTransformOrigin(value: string): { ox: string; oy: string } {
  if (!value || value === 'none') return { ox: '50%', oy: '50%' };
  const keywords: Record<string, string> = {
    left: '0%',
    center: '50%',
    right: '100%',
    top: '0%',
    bottom: '100%',
  };
  const parts = value.trim().split(/\s+/);
  const ox = keywords[parts[0]] ?? parts[0] ?? '50%';
  const oy = keywords[parts[1]] ?? parts[1] ?? '50%';
  return { ox, oy };
}

interface TransformSectionProps {
  getValue: (prop: string) => string;
  onChange: (prop: string, value: string) => void;
  onFocus?: () => void;
  explicitPropertyNames?: Set<string>;
}

export function TransformSection({
  getValue,
  onChange,
  onFocus,
  explicitPropertyNames,
}: TransformSectionProps) {
  const [addedProps, setAddedProps] = useState<Set<string>>(new Set());
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const { onRowContextMenu, RowContextMenu } = useRowContextMenu();
  const filter = useFilter();
  const f = (name: string) => matchesFilter(name, filter);

  const transformValue = getValue('transform');
  const isMatrix = hasMatrixTransform(transformValue);
  const parsed = useMemo(
    () => (isMatrix ? [] : parseTransformFunctions(transformValue)),
    [transformValue, isMatrix],
  );
  const { x, y } = useMemo(() => extractTranslateXY(parsed), [parsed]);
  const rotateValue = extractTransformValue(parsed, 'rotate');
  const { sx: scaleXValue, sy: scaleYValue } = useMemo(() => extractScaleXY(parsed), [parsed]);
  const skewXValue = extractTransformValue(parsed, 'skewX');
  const skewYValue = extractTransformValue(parsed, 'skewY');

  const showSkewX = !!skewXValue || addedProps.has('skewX');
  const showSkewY = !!skewYValue || addedProps.has('skewY');
  const hasExplicitOrigin = explicitPropertyNames?.has('transform-origin') ?? false;
  const originValue = getValue('transform-origin');
  const { ox: originX, oy: originY } = useMemo(
    () =>
      hasExplicitOrigin ? parseTransformOrigin(originValue) : { ox: '50%', oy: '50%' },
    [originValue, hasExplicitOrigin],
  );
  const showOrigin = hasExplicitOrigin || addedProps.has('origin');
  const otherFunctions = useMemo(() => getOtherFunctions(parsed), [parsed]);

  const currentTransform = useMemo(
    () => ({
      translateX: x,
      translateY: y,
      rotate: rotateValue,
      scaleX: scaleXValue,
      scaleY: scaleYValue,
      skewX: skewXValue,
      skewY: skewYValue,
      other: otherFunctions,
    }),
    [x, y, rotateValue, scaleXValue, scaleYValue, skewXValue, skewYValue, otherFunctions],
  );

  const handleChange = useCallback(
    (key: string, value: string) => {
      const next = { ...currentTransform };
      switch (key) {
        case 'x':
          next.translateX = value;
          break;
        case 'y':
          next.translateY = value;
          break;
        case 'rotate':
          next.rotate = value;
          break;
        case 'scaleX':
          next.scaleX = value;
          break;
        case 'scaleY':
          next.scaleY = value;
          break;
        case 'skewX':
          next.skewX = value;
          break;
        case 'skewY':
          next.skewY = value;
          break;
      }
      onChange('transform', composeTransform(next));
    },
    [currentTransform, onChange],
  );

  const handleOriginChange = useCallback(
    (axis: 'ox' | 'oy', value: string) => {
      const newOx = axis === 'ox' ? value : originX;
      const newOy = axis === 'oy' ? value : originY;
      onChange('transform-origin', `${newOx} ${newOy}`);
    },
    [originX, originY, onChange],
  );

  const handlePlusClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.left, y: rect.bottom + 4 });
  }, []);

  const handleRemoveProp = useCallback(
    (key: string) => {
      setAddedProps((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      if (key === 'origin') {
        onChange('transform-origin', '');
        return;
      }
      const next = { ...currentTransform };
      switch (key) {
        case 'translate':
          next.translateX = '';
          next.translateY = '';
          break;
        case 'rotate':
          next.rotate = '';
          break;
        case 'scale':
          next.scaleX = '';
          next.scaleY = '';
          break;
        case 'skewX':
          next.skewX = '';
          break;
        case 'skewY':
          next.skewY = '';
          break;
      }
      onChange('transform', composeTransform(next));
    },
    [currentTransform, onChange],
  );

  const addableProps = useMemo(
    () =>
      OPTIONAL_PROPS.filter((p) => {
        if (p.key === 'skewX') return !showSkewX;
        if (p.key === 'skewY') return !showSkewY;
        if (p.key === 'origin') return !showOrigin;
        return false;
      }),
    [showSkewX, showSkewY, showOrigin],
  );

  if (isMatrix) {
    if (!f('Transform')) return null;
    return (
      <Section title="Transform">
        <div onContextMenu={(e) => onRowContextMenu(e, () => onChange('transform', ''))}>
          <TextInput
            label="transform"
            displayName="Transform"
            value={transformValue}
            onChange={(v) => onChange('transform', v)}
            onFocus={onFocus}
          />
        </div>
        {RowContextMenu}
      </Section>
    );
  }

  const rows: Array<{ name: string; node: React.ReactNode }> = [];

  if (f('X')) {
    rows.push({
      name: 'X',
      node: (
        <div key="x" onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProp('translate'))}>
          <NumberInput
            displayName="X"
            value={x || '0px'}
            units={TRANSLATE_UNITS}
            onChange={(v) => handleChange('x', v)}
            onFocus={onFocus}
          />
        </div>
      ),
    });
  }

  if (f('Y')) {
    rows.push({
      name: 'Y',
      node: (
        <div key="y" onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProp('translate'))}>
          <NumberInput
            displayName="Y"
            value={y || '0px'}
            units={TRANSLATE_UNITS}
            onChange={(v) => handleChange('y', v)}
            onFocus={onFocus}
          />
        </div>
      ),
    });
  }

  if (f('Rotate')) {
    rows.push({
      name: 'Rotate',
      node: (
        <div key="rotate" onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProp('rotate'))}>
          <NumberInput
            displayName="Rotate"
            value={rotateValue || '0deg'}
            min={-360}
            max={360}
            sliderMin={-180}
            sliderMax={180}
            step={1}
            unit="deg"
            onChange={(v) => handleChange('rotate', v)}
            onFocus={onFocus}
          />
        </div>
      ),
    });
  }

  if (f('Scale X')) {
    rows.push({
      name: 'Scale X',
      node: (
        <div key="scaleX" onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProp('scale'))}>
          <NumberInput
            displayName="Scale X"
            value={scaleXValue || '1'}
            min={0}
            max={10}
            sliderMin={0}
            sliderMax={3}
            step={0.01}
            onChange={(v) => handleChange('scaleX', v)}
            onFocus={onFocus}
          />
        </div>
      ),
    });
  }

  if (f('Scale Y')) {
    rows.push({
      name: 'Scale Y',
      node: (
        <div key="scaleY" onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProp('scale'))}>
          <NumberInput
            displayName="Scale Y"
            value={scaleYValue || '1'}
            min={0}
            max={10}
            sliderMin={0}
            sliderMax={3}
            step={0.01}
            onChange={(v) => handleChange('scaleY', v)}
            onFocus={onFocus}
          />
        </div>
      ),
    });
  }

  if (showSkewX && f('Skew X')) {
    rows.push({
      name: 'Skew X',
      node: (
        <div key="skewX" onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProp('skewX'))}>
          <NumberInput
            displayName="Skew X"
            value={skewXValue || '0deg'}
            min={-89}
            max={89}
            sliderMin={-45}
            sliderMax={45}
            step={1}
            unit="deg"
            onChange={(v) => handleChange('skewX', v)}
            onFocus={onFocus}
          />
        </div>
      ),
    });
  }

  if (showSkewY && f('Skew Y')) {
    rows.push({
      name: 'Skew Y',
      node: (
        <div key="skewY" onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProp('skewY'))}>
          <NumberInput
            displayName="Skew Y"
            value={skewYValue || '0deg'}
            min={-89}
            max={89}
            sliderMin={-45}
            sliderMax={45}
            step={1}
            unit="deg"
            onChange={(v) => handleChange('skewY', v)}
            onFocus={onFocus}
          />
        </div>
      ),
    });
  }

  if (showOrigin && f('Origin X')) {
    rows.push({
      name: 'Origin X',
      node: (
        <div key="originX" onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProp('origin'))}>
          <NumberInput
            displayName="Origin X"
            value={originX}
            units={ORIGIN_UNITS}
            onChange={(v) => handleOriginChange('ox', v)}
            onFocus={onFocus}
          />
        </div>
      ),
    });
  }

  if (showOrigin && f('Origin Y')) {
    rows.push({
      name: 'Origin Y',
      node: (
        <div key="originY" onContextMenu={(e) => onRowContextMenu(e, () => handleRemoveProp('origin'))}>
          <NumberInput
            displayName="Origin Y"
            value={originY}
            units={ORIGIN_UNITS}
            onChange={(v) => handleOriginChange('oy', v)}
            onFocus={onFocus}
          />
        </div>
      ),
    });
  }

  if (rows.length === 0 && !f('Transform')) return null;

  return (
    <>
      <Section
        title="Transform"
        onAdd={addableProps.length > 0 ? handlePlusClick : undefined}
        addTitle="Add transform property"
      >
        {rows.map((r) => r.node)}
      </Section>
      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          animate={true}
          items={addableProps.map((p) => ({
            label: p.displayName,
            onClick: () => {
              setAddedProps((prev) => new Set(prev).add(p.key));
            },
          }))}
          onClose={() => setMenuPos(null)}
        />
      )}
      {RowContextMenu}
    </>
  );
}
