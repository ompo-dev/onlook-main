export const NAMED_EASINGS: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

function splitByComma(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (const ch of value) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function extractBezier(timingFunction: string): [number, number, number, number] | null {
  const named = NAMED_EASINGS[timingFunction];
  if (named) return named;
  const match = timingFunction.match(
    /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/
  );
  if (match) {
    return [
      parseFloat(match[1]),
      parseFloat(match[2]),
      parseFloat(match[3]),
      parseFloat(match[4]),
    ];
  }
  return null;
}

export interface TransitionEntry {
  property: string;
  duration: string;
  timingFunction: string;
  delay: string;
  bezier: [number, number, number, number] | null;
}

export function parseTransitions(getValue: (prop: string) => string): TransitionEntry[] {
  const properties = splitByComma(getValue('transition-property') || 'all');
  const durations = splitByComma(getValue('transition-duration') || '0s');
  const timings = splitByComma(getValue('transition-timing-function') || 'ease');
  const delays = splitByComma(getValue('transition-delay') || '0s');
  return properties.map((prop, i) => {
    const timingFunction = timings[i % timings.length] || 'ease';
    return {
      property: prop,
      duration: durations[i % durations.length] || '0s',
      timingFunction,
      delay: delays[i % delays.length] || '0s',
      bezier: extractBezier(timingFunction),
    };
  });
}

export function serializeTimingFunction(bezier: [number, number, number, number]): string {
  for (const [name, values] of Object.entries(NAMED_EASINGS)) {
    if (
      bezier[0] === values[0] &&
      bezier[1] === values[1] &&
      bezier[2] === values[2] &&
      bezier[3] === values[3]
    ) {
      return name;
    }
  }
  return `cubic-bezier(${bezier[0]}, ${bezier[1]}, ${bezier[2]}, ${bezier[3]})`;
}

export function serializeLonghand(values: string[]): string {
  return values.join(', ');
}
