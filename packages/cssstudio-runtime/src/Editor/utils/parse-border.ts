export const BORDER_STYLES = [
  'none',
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
  'hidden',
];

const BORDER_STYLE_SET = new Set(BORDER_STYLES);

export interface BorderParsed {
  width: string;
  style: string;
  color: string;
}

const DEFAULT_BORDER: BorderParsed = {
  width: '1px',
  style: 'solid',
  color: '#000000',
};

const WIDTH_KEYWORDS = new Set(['thin', 'medium', 'thick']);
const LENGTH_PATTERN = /^(-?[\d.]+)(px|em|rem|%|vw|vh|vmin|vmax|cm|mm|in|pt|pc|ch|ex)?$/;

function tokenize(str: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1);
      current += ch;
    } else if (ch === ' ' && depth === 0) {
      if (current) tokens.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

export function parseBorder(value: string): BorderParsed {
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'none') {
    return { width: '0px', style: 'none', color: DEFAULT_BORDER.color };
  }
  let width = '';
  let style = '';
  const colorParts: string[] = [];
  const tokens = tokenize(trimmed);
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (!style && BORDER_STYLE_SET.has(lower)) {
      style = lower;
    } else if (!width && (WIDTH_KEYWORDS.has(lower) || LENGTH_PATTERN.test(token))) {
      width = token;
    } else {
      colorParts.push(token);
    }
  }
  return {
    width: width || DEFAULT_BORDER.width,
    style: style || DEFAULT_BORDER.style,
    color: colorParts.join(' ') || DEFAULT_BORDER.color,
  };
}

export function serializeBorder(parsed: BorderParsed): string {
  return `${parsed.width} ${parsed.style} ${parsed.color}`;
}
