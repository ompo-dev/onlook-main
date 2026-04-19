// src/Editor/PropertiesPanel/inputs/ColorPicker/color-utils.ts
function hsvaToRgba(hsva) {
  const { s, v, a } = hsva;
  const h = (hsva.h % 360 + 360) % 360;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a
  };
}
function rgbaToHsva(r, g, b, a, hueHint) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = hueHint ?? 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r:
        h = 60 * ((g - b) / d % 6);
        break;
      case g:
        h = 60 * ((b - r) / d + 2);
        break;
      case b:
        h = 60 * ((r - g) / d + 4);
        break;
    }
    if (h < 0) h += 360;
  }
  return { h, s, v, a };
}
function hsvaToHsla(hsva) {
  const { h, s, v, a } = hsva;
  const l = v * (1 - s / 2);
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return {
    h: Math.round(h),
    s: Math.round(sl * 100),
    l: Math.round(l * 100),
    a
  };
}
function hslaToHsva(h, s, l, a) {
  s /= 100;
  l /= 100;
  const v = l + s * Math.min(l, 1 - l);
  const sv = v === 0 ? 0 : 2 * (1 - l / v);
  return { h, s: sv, v, a };
}
function hsvaToHex(hsva) {
  const { r, g, b, a } = hsvaToRgba(hsva);
  const hex2 = `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
  if (a < 1) {
    const alphaHex = Math.round(a * 255).toString(16).padStart(2, "0");
    return hex2 + alphaHex;
  }
  return hex2;
}
function hexToHsva(hex2) {
  hex2 = hex2.replace(/^#/, "");
  if (hex2.length === 3) {
    hex2 = hex2[0] + hex2[0] + hex2[1] + hex2[1] + hex2[2] + hex2[2];
  } else if (hex2.length === 4) {
    hex2 = hex2[0] + hex2[0] + hex2[1] + hex2[1] + hex2[2] + hex2[2] + hex2[3] + hex2[3];
  }
  const r = parseInt(hex2.slice(0, 2), 16);
  const g = parseInt(hex2.slice(2, 4), 16);
  const b = parseInt(hex2.slice(4, 6), 16);
  const a = hex2.length === 8 ? parseInt(hex2.slice(6, 8), 16) / 255 : 1;
  return rgbaToHsva(r, g, b, a);
}
function hsvaToRgbString(hsva) {
  const { r, g, b, a } = hsvaToRgba(hsva);
  if (a < 1) return `rgba(${r}, ${g}, ${b}, ${round2(a)})`;
  return `rgb(${r}, ${g}, ${b})`;
}
function hsvaToHslString(hsva) {
  const { h, s, l, a } = hsvaToHsla(hsva);
  if (a < 1) return `hsla(${h}, ${s}%, ${l}%, ${round2(a)})`;
  return `hsl(${h}, ${s}%, ${l}%)`;
}
function round2(n) {
  return Math.round(n * 100) / 100;
}
function formatColor(hsva, mode) {
  switch (mode) {
    case "rgba":
      return hsvaToRgbString(hsva);
    case "hsla":
      return hsvaToHslString(hsva);
    case "hex":
      return hsvaToHex(hsva);
    case "custom":
      return hsvaToRgbString(hsva);
  }
}
function parseCssColor(value) {
  const v = value.trim().toLowerCase();
  if (v === "transparent") return { h: 0, s: 0, v: 0, a: 0 };
  if (v.startsWith("#")) {
    const hex2 = v.slice(1);
    if (/^[0-9a-f]{3}$|^[0-9a-f]{4}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/.test(hex2)) {
      return hexToHsva(v);
    }
    return null;
  }
  const rgbMatch = v.match(
    /rgba?\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)/
  );
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    let a = 1;
    if (rgbMatch[4]) {
      a = rgbMatch[4].endsWith("%") ? parseFloat(rgbMatch[4]) / 100 : parseFloat(rgbMatch[4]);
    }
    return rgbaToHsva(r, g, b, a);
  }
  const hslMatch = v.match(
    /hsla?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?))?\s*\)/
  );
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]);
    const s = parseFloat(hslMatch[2]);
    const l = parseFloat(hslMatch[3]);
    let a = 1;
    if (hslMatch[4]) {
      a = hslMatch[4].endsWith("%") ? parseFloat(hslMatch[4]) / 100 : parseFloat(hslMatch[4]);
    }
    return hslaToHsva(h, s, l, a);
  }
  return null;
}
function detectColorMode(value) {
  const v = value.trim().toLowerCase();
  if (v.startsWith("rgb")) return "rgba";
  if (v.startsWith("hsl")) return "hsla";
  if (v.startsWith("#") || v === "transparent") return "hex";
  return "custom";
}

