export interface BoxShadow {
  inset: boolean;
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string;
}

export const DEFAULT_SHADOW: BoxShadow = {
  inset: false,
  offsetX: '0px',
  offsetY: '2px',
  blur: '8px',
  spread: '0px',
  color: 'rgba(0, 0, 0, 0.25)',
};

const FUNC_COLOR = /\b(rgba?|hsla?|oklch|oklab|lab|lch|color|light-dark)\([^)]*\)/gi;

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

function parseSingleShadow(raw: string): BoxShadow {
  let str = raw.trim();
  let inset = false;
  if (/\binset\b/i.test(str)) {
    inset = true;
    str = str.replace(/\binset\b/gi, '').trim();
  }
  let colorMatch = '';
  FUNC_COLOR.lastIndex = 0;
  const funcMatches = str.match(FUNC_COLOR);
  if (funcMatches) {
    colorMatch = funcMatches[0];
    str = str.replace(FUNC_COLOR, '').trim();
  }
  const lengthPattern = /(-?[\d.]+)(px|em|rem|%|vw|vh|vmin|vmax|cm|mm|in|pt|pc|ch|ex)?/g;
  const lengths: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = lengthPattern.exec(str)) !== null) {
    lengths.push(match[0] + (match[2] ? '' : 'px'));
  }
  if (!colorMatch) {
    const withoutLengths = str.replace(lengthPattern, '').trim();
    if (withoutLengths) colorMatch = withoutLengths;
  }
  return {
    inset,
    offsetX: lengths[0] || '0px',
    offsetY: lengths[1] || '0px',
    blur: lengths[2] || '0px',
    spread: lengths[3] || '0px',
    color: colorMatch || 'rgba(0, 0, 0, 0.25)',
  };
}

export function parseBoxShadow(value: string): BoxShadow[] {
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'none') return [];
  const segments = splitByComma(trimmed);
  return segments.map(parseSingleShadow);
}

export function serializeBoxShadow(shadows: BoxShadow[]): string {
  if (shadows.length === 0) return 'none';
  return shadows
    .map((s) => {
      const parts: string[] = [];
      if (s.inset) parts.push('inset');
      parts.push(s.offsetX, s.offsetY, s.blur, s.spread, s.color);
      return parts.join(' ');
    })
    .join(', ');
}
