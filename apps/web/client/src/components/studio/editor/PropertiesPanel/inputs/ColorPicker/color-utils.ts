export interface HSVA {
  h: number;
  s: number;
  v: number;
  a: number;
}

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HSLA {
  h: number;
  s: number;
  l: number;
  a: number;
}

export type ColorMode = 'rgba' | 'hsla' | 'hex' | 'custom';

export function hsvaToRgba(hsva: HSVA): RGBA {
  const { s, v, a } = hsva;
  const h = ((hsva.h % 360) + 360) % 360;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a };
}

export function rgbaToHsva(r: number, g: number, b: number, a: number, hueHint?: number): HSVA {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = hueHint ?? 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r: h = 60 * (((g - b) / d) % 6); break;
      case g: h = 60 * ((b - r) / d + 2); break;
      case b: h = 60 * ((r - g) / d + 4); break;
    }
    if (h < 0) h += 360;
  }
  return { h, s, v, a };
}

export function hsvaToHsla(hsva: HSVA): HSLA {
  const { h, s, v, a } = hsva;
  const l = v * (1 - s / 2);
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return { h: Math.round(h), s: Math.round(sl * 100), l: Math.round(l * 100), a };
}

export function hslaToHsva(h: number, s: number, l: number, a: number): HSVA {
  s /= 100; l /= 100;
  const v = l + s * Math.min(l, 1 - l);
  const sv = v === 0 ? 0 : 2 * (1 - l / v);
  return { h, s: sv, v, a };
}

export function hsvaToHex(hsva: HSVA): string {
  const { r, g, b, a } = hsvaToRgba(hsva);
  const hex = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  if (a < 1) {
    const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
    return hex + alphaHex;
  }
  return hex;
}

export function hexToHsva(hex: string): HSVA {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  else if (hex.length === 4) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return rgbaToHsva(r, g, b, a);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function hsvaToRgbString(hsva: HSVA): string {
  const { r, g, b, a } = hsvaToRgba(hsva);
  if (a < 1) return `rgba(${r}, ${g}, ${b}, ${round2(a)})`;
  return `rgb(${r}, ${g}, ${b})`;
}

export function hsvaToHslString(hsva: HSVA): string {
  const { h, s, l, a } = hsvaToHsla(hsva);
  if (a < 1) return `hsla(${h}, ${s}%, ${l}%, ${round2(a)})`;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export function formatColor(hsva: HSVA, mode: ColorMode): string {
  switch (mode) {
    case 'rgba': return hsvaToRgbString(hsva);
    case 'hsla': return hsvaToHslString(hsva);
    case 'hex': return hsvaToHex(hsva);
    case 'custom': return hsvaToRgbString(hsva);
  }
}

export function parseCssColor(value: string): HSVA | null {
  const v = value.trim().toLowerCase();
  if (v === 'transparent') return { h: 0, s: 0, v: 0, a: 0 };
  if (v.startsWith('#')) {
    const hex = v.slice(1);
    if (/^[0-9a-f]{3}$|^[0-9a-f]{4}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/.test(hex)) {
      return hexToHsva(v);
    }
    return null;
  }
  const rgbMatch = v.match(/rgba?\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    let a = 1;
    if (rgbMatch[4]) {
      a = rgbMatch[4].endsWith('%') ? parseFloat(rgbMatch[4]) / 100 : parseFloat(rgbMatch[4]);
    }
    return rgbaToHsva(r, g, b, a);
  }
  const hslMatch = v.match(/hsla?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?))?\s*\)/);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]);
    const s = parseFloat(hslMatch[2]);
    const l = parseFloat(hslMatch[3]);
    let a = 1;
    if (hslMatch[4]) {
      a = hslMatch[4].endsWith('%') ? parseFloat(hslMatch[4]) / 100 : parseFloat(hslMatch[4]);
    }
    return hslaToHsva(h, s, l, a);
  }
  return null;
}

export function detectColorMode(value: string): ColorMode {
  const v = value.trim().toLowerCase();
  if (v.startsWith('rgb')) return 'rgba';
  if (v.startsWith('hsl')) return 'hsla';
  if (v.startsWith('#') || v === 'transparent') return 'hex';
  return 'custom';
}
