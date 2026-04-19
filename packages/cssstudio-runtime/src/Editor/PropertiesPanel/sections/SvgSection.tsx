import { Section } from '../Section';
import { ColorInput } from '../inputs/ColorInput';
import { NumberInput } from '../inputs/NumberInput';
import { SelectInput } from '../inputs/SelectInput';
import { TextInput } from '../inputs/TextInput';
import { TokenPicker } from '../inputs/TokenPicker';
import { useFilter, matchesFilter } from '../filter-utils';

interface SvgSectionProps {
  getValue: (prop: string) => string;
  onChange: (prop: string, value: string) => void;
  onFocus?: () => void;
}

export function SvgSection({ getValue, onChange, onFocus }: SvgSectionProps) {
  const filter = useFilter();
  const f = (name: string) => matchesFilter(name, filter);

  const hasMatch =
    f('Fill') ||
    f('Fill Opacity') ||
    f('Fill Rule') ||
    f('Stroke') ||
    f('Stroke Opacity') ||
    f('Stroke Width') ||
    f('Stroke Linecap') ||
    f('Stroke Linejoin') ||
    f('Stroke Dasharray') ||
    f('Stroke Dashoffset');

  if (!hasMatch) return null;

  return (
    <Section title="SVG">
      {f('Fill') && (
        <TokenPicker
          value={getValue('fill')}
          label="Fill"
          tokenType="color"
          onSelect={(v) => onChange('fill', v)}
        >
          <ColorInput
            label="fill"
            displayName="Fill"
            value={getValue('fill')}
            onChange={(v) => onChange('fill', v)}
            onFocus={onFocus}
          />
        </TokenPicker>
      )}
      {f('Fill Opacity') && (
        <TokenPicker
          value={getValue('fill-opacity')}
          label="Fill Opacity"
          tokenType="number"
          onSelect={(v) => onChange('fill-opacity', v)}
        >
          <NumberInput
            label="fill-opacity"
            displayName="Fill Opacity"
            value={getValue('fill-opacity')}
            onChange={(v) => onChange('fill-opacity', v)}
            onFocus={onFocus}
          />
        </TokenPicker>
      )}
      {f('Fill Rule') && (
        <SelectInput
          label="fill-rule"
          displayName="Fill Rule"
          value={getValue('fill-rule')}
          onChange={(v) => onChange('fill-rule', v)}
          options={['nonzero', 'evenodd']}
          onFocus={onFocus}
        />
      )}
      {f('Stroke') && (
        <TokenPicker
          value={getValue('stroke')}
          label="Stroke"
          tokenType="color"
          onSelect={(v) => onChange('stroke', v)}
        >
          <ColorInput
            label="stroke"
            displayName="Stroke"
            value={getValue('stroke')}
            onChange={(v) => onChange('stroke', v)}
            onFocus={onFocus}
          />
        </TokenPicker>
      )}
      {f('Stroke Opacity') && (
        <TokenPicker
          value={getValue('stroke-opacity')}
          label="Stroke Opacity"
          tokenType="number"
          onSelect={(v) => onChange('stroke-opacity', v)}
        >
          <NumberInput
            label="stroke-opacity"
            displayName="Stroke Opacity"
            value={getValue('stroke-opacity')}
            onChange={(v) => onChange('stroke-opacity', v)}
            onFocus={onFocus}
          />
        </TokenPicker>
      )}
      {f('Stroke Width') && (
        <TokenPicker
          value={getValue('stroke-width')}
          label="Stroke Width"
          tokenType="number"
          onSelect={(v) => onChange('stroke-width', v)}
        >
          <NumberInput
            label="stroke-width"
            displayName="Stroke Width"
            value={getValue('stroke-width')}
            onChange={(v) => onChange('stroke-width', v)}
            onFocus={onFocus}
          />
        </TokenPicker>
      )}
      {f('Stroke Linecap') && (
        <SelectInput
          label="stroke-linecap"
          displayName="Stroke Linecap"
          value={getValue('stroke-linecap')}
          onChange={(v) => onChange('stroke-linecap', v)}
          options={['butt', 'round', 'square']}
          onFocus={onFocus}
        />
      )}
      {f('Stroke Linejoin') && (
        <SelectInput
          label="stroke-linejoin"
          displayName="Stroke Linejoin"
          value={getValue('stroke-linejoin')}
          onChange={(v) => onChange('stroke-linejoin', v)}
          options={['miter', 'round', 'bevel']}
          onFocus={onFocus}
        />
      )}
      {f('Stroke Dasharray') && (
        <TokenPicker
          value={getValue('stroke-dasharray')}
          label="Stroke Dasharray"
          onSelect={(v) => onChange('stroke-dasharray', v)}
        >
          <TextInput
            label="stroke-dasharray"
            displayName="Stroke Dasharray"
            value={getValue('stroke-dasharray')}
            onChange={(v) => onChange('stroke-dasharray', v)}
            onFocus={onFocus}
          />
        </TokenPicker>
      )}
      {f('Stroke Dashoffset') && (
        <TokenPicker
          value={getValue('stroke-dashoffset')}
          label="Stroke Dashoffset"
          tokenType="number"
          onSelect={(v) => onChange('stroke-dashoffset', v)}
        >
          <NumberInput
            label="stroke-dashoffset"
            displayName="Stroke Dashoffset"
            value={getValue('stroke-dashoffset')}
            onChange={(v) => onChange('stroke-dashoffset', v)}
            onFocus={onFocus}
          />
        </TokenPicker>
      )}
    </Section>
  );
}
