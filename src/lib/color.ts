// Small colour helpers: hex <-> rgb, mixing, shading, perceptual distance, plain-language names.

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/** amount > 0 lightens towards white, < 0 darkens towards black. */
export function shade(hex: string, amount: number): string {
  return amount >= 0 ? mix(hex, '#ffffff', amount) : mix(hex, '#000000', -amount);
}

function srgbToLinear(v: number) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function toLab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear) as RGB;
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE76 distance. ~0-10 very close, 10-25 related, 35+ clearly different. */
export function colorDistance(a: string, b: string): number {
  const x = toLab(a);
  const y = toLab(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

export function lightness(hex: string): number {
  return toLab(hex)[0];
}

const NAMED: [string, string][] = [
  ['white', '#f4f2ec'],
  ['ivory', '#ece4d2'],
  ['cream', '#e6dac0'],
  ['oatmeal', '#d6c7ab'],
  ['sand', '#c9b38c'],
  ['beige', '#bfae94'],
  ['taupe', '#9a8b7a'],
  ['light grey', '#bdbcb8'],
  ['grey', '#8e8d8a'],
  ['charcoal', '#46474a'],
  ['black', '#1f1f20'],
  ['camel', '#b0814c'],
  ['cognac', '#8e4f26'],
  ['brown', '#6b4a33'],
  ['chocolate', '#47301f'],
  ['terracotta', '#b8613f'],
  ['rust', '#9c4426'],
  ['blush', '#d9a8a0'],
  ['dusty rose', '#b97f7c'],
  ['mustard', '#c9a03a'],
  ['olive', '#7b7a46'],
  ['sage', '#9caa8c'],
  ['forest green', '#355343'],
  ['emerald', '#1f6b55'],
  ['teal', '#2f6f73'],
  ['sky blue', '#9cb9cf'],
  ['slate blue', '#5d7287'],
  ['navy', '#26344f'],
  ['plum', '#5e3550'],
];

export function colorName(hex: string): string {
  let best = NAMED[0][0];
  let bestD = Infinity;
  for (const [name, ref] of NAMED) {
    const d = colorDistance(hex, ref);
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}

/** Broad colour family used by the colour filter. */
export type ColorFamily = 'light' | 'beige' | 'grey' | 'dark' | 'brown' | 'warm' | 'green' | 'blue';

export const COLOR_FAMILY_LABEL: Record<ColorFamily, string> = {
  light: 'White & cream',
  beige: 'Beige & sand',
  grey: 'Grey',
  dark: 'Charcoal & black',
  brown: 'Brown & leather tones',
  warm: 'Rust, pink & yellow',
  green: 'Green',
  blue: 'Blue',
};

const FAMILY_OF: Record<string, ColorFamily> = {
  white: 'light',
  ivory: 'light',
  cream: 'light',
  oatmeal: 'beige',
  sand: 'beige',
  beige: 'beige',
  taupe: 'beige',
  'light grey': 'grey',
  grey: 'grey',
  charcoal: 'dark',
  black: 'dark',
  camel: 'brown',
  cognac: 'brown',
  brown: 'brown',
  chocolate: 'brown',
  terracotta: 'warm',
  rust: 'warm',
  blush: 'warm',
  'dusty rose': 'warm',
  mustard: 'warm',
  plum: 'warm',
  olive: 'green',
  sage: 'green',
  'forest green': 'green',
  emerald: 'green',
  teal: 'blue',
  'sky blue': 'blue',
  'slate blue': 'blue',
  navy: 'blue',
};

export function colorFamily(hex: string): ColorFamily {
  return FAMILY_OF[colorName(hex)] ?? 'grey';
}

/** Extract a few dominant colours from image pixel data (simple bucketed histogram). */
export function dominantColors(data: Uint8ClampedArray, count = 4): string[] {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (data[i + 3] < 128) continue;
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++;
    e.r += r;
    e.g += g;
    e.b += b;
    buckets.set(key, e);
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
  const out: string[] = [];
  for (const e of sorted) {
    const hex = rgbToHex([e.r / e.n, e.g / e.n, e.b / e.n]);
    if (out.every((o) => colorDistance(o, hex) > 18)) out.push(hex);
    if (out.length >= count) break;
  }
  return out;
}
