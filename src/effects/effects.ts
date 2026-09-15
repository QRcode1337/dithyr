import type { EffectInstance, EffectType } from '../types';
import { clamp, hslToRgb, rgbToHsl } from '../dither/color';

export const EFFECT_DEFAULTS: Record<EffectType, Record<string, number>> = {
  'epsilon-glow': { amount: 0.4, radius: 2 },
  'jpeg-glitch': { quality: 0.35, blockiness: 0.5 },
  'chromatic-aberration': { offset: 3, amount: 1 },
  'film-grain': { amount: 0.25 },
  scanlines: { amount: 0.4, gap: 2 },
  pixelate: { size: 4 },
  'contrast-brightness': { contrast: 1.1, brightness: 0 },
  'hue-shift': { degrees: 30, saturation: 1 },
};

export const EFFECT_META: Array<{
  type: EffectType;
  name: string;
  params: Array<{ key: string; label: string; min: number; max: number; step: number }>;
}> = [
  {
    type: 'epsilon-glow',
    name: 'Epsilon Glow',
    params: [
      { key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.05 },
      { key: 'radius', label: 'Radius', min: 1, max: 8, step: 1 },
    ],
  },
  {
    type: 'jpeg-glitch',
    name: 'JPEG Glitch',
    params: [
      { key: 'quality', label: 'Quality', min: 0.05, max: 0.9, step: 0.05 },
      { key: 'blockiness', label: 'Blockiness', min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    type: 'chromatic-aberration',
    name: 'Chromatic Aberration',
    params: [
      { key: 'offset', label: 'Offset', min: 0, max: 12, step: 1 },
      { key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    type: 'film-grain',
    name: 'Film Grain',
    params: [{ key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.05 }],
  },
  {
    type: 'scanlines',
    name: 'Scanlines',
    params: [
      { key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.05 },
      { key: 'gap', label: 'Gap', min: 1, max: 6, step: 1 },
    ],
  },
  {
    type: 'pixelate',
    name: 'Pixelate',
    params: [{ key: 'size', label: 'Size', min: 2, max: 32, step: 1 }],
  },
  {
    type: 'contrast-brightness',
    name: 'Contrast / Brightness',
    params: [
      { key: 'contrast', label: 'Contrast', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'brightness', label: 'Brightness', min: -100, max: 100, step: 1 },
    ],
  },
  {
    type: 'hue-shift',
    name: 'Hue Shift',
    params: [
      { key: 'degrees', label: 'Hue', min: -180, max: 180, step: 1 },
      { key: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.05 },
    ],
  },
];

function hash(x: number, y: number): number {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

export function applyEffect(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  effect: EffectInstance
): Uint8ClampedArray {
  if (!effect.enabled) return data;
  const p = { ...EFFECT_DEFAULTS[effect.type], ...effect.params };
  switch (effect.type) {
    case 'epsilon-glow':
      return epsilonGlow(data, w, h, p.amount, p.radius);
    case 'jpeg-glitch':
      return jpegGlitch(data, w, h, p.quality, p.blockiness);
    case 'chromatic-aberration':
      return chromaticAberration(data, w, h, p.offset, p.amount);
    case 'film-grain':
      return filmGrain(data, w, h, p.amount);
    case 'scanlines':
      return scanlines(data, w, h, p.amount, p.gap);
    case 'pixelate':
      return pixelate(data, w, h, p.size);
    case 'contrast-brightness':
      return contrastBrightness(data, p.contrast, p.brightness);
    case 'hue-shift':
      return hueShift(data, p.degrees, p.saturation);
    default:
      return data;
  }
}

export function applyEffectStack(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  effects: EffectInstance[]
): Uint8ClampedArray {
  let cur = data;
  for (const e of effects) {
    cur = applyEffect(cur, w, h, e);
  }
  return cur;
}

function epsilonGlow(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  amount: number,
  radius: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src);
  const r = Math.max(1, Math.round(radius));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sr = 0, sg = 0, sb = 0, n = 0;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const i = (ny * w + nx) * 4;
          sr += src[i];
          sg += src[i + 1];
          sb += src[i + 2];
          n++;
        }
      }
      const i = (y * w + x) * 4;
      const br = sr / n;
      const bg = sg / n;
      const bb = sb / n;
      out[i] = clamp(src[i] * (1 - amount) + Math.min(255, br * 1.2) * amount);
      out[i + 1] = clamp(src[i + 1] * (1 - amount) + Math.min(255, bg * 1.2) * amount);
      out[i + 2] = clamp(src[i + 2] * (1 - amount) + Math.min(255, bb * 1.2) * amount);
    }
  }
  return out;
}

function jpegGlitch(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  quality: number,
  blockiness: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src);
  const block = Math.max(4, Math.round(4 + blockiness * 12));
  const q = Math.max(4, Math.round(quality * 64));
  for (let by = 0; by < h; by += block) {
    for (let bx = 0; bx < w; bx += block) {
      let sr = 0, sg = 0, sb = 0, n = 0;
      const bw = Math.min(block, w - bx);
      const bh = Math.min(block, h - by);
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          const i = ((by + y) * w + (bx + x)) * 4;
          sr += src[i];
          sg += src[i + 1];
          sb += src[i + 2];
          n++;
        }
      }
      const ar = Math.round(sr / n / q) * q;
      const ag = Math.round(sg / n / q) * q;
      const ab = Math.round(sb / n / q) * q;
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          const i = ((by + y) * w + (bx + x)) * 4;
          const qr = Math.round(src[i] / q) * q;
          const qg = Math.round(src[i + 1] / q) * q;
          const qb = Math.round(src[i + 2] / q) * q;
          out[i] = clamp(qr * (1 - blockiness * 0.6) + ar * blockiness * 0.6);
          out[i + 1] = clamp(qg * (1 - blockiness * 0.6) + ag * blockiness * 0.6);
          out[i + 2] = clamp(qb * (1 - blockiness * 0.6) + ab * blockiness * 0.6);
        }
      }
    }
  }
  return out;
}

function chromaticAberration(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  offset: number,
  amount: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src);
  const o = Math.round(offset);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const rx = Math.min(w - 1, Math.max(0, x + o));
      const bx = Math.min(w - 1, Math.max(0, x - o));
      const ri = (y * w + rx) * 4;
      const bi = (y * w + bx) * 4;
      out[i] = clamp(src[i] * (1 - amount) + src[ri] * amount);
      out[i + 1] = src[i + 1];
      out[i + 2] = clamp(src[i + 2] * (1 - amount) + src[bi + 2] * amount);
    }
  }
  return out;
}

function filmGrain(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  amount: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src);
  const a = amount * 60;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = (hash(x, y) - 0.5) * 2 * a;
      out[i] = clamp(src[i] + n);
      out[i + 1] = clamp(src[i + 1] + n);
      out[i + 2] = clamp(src[i + 2] + n);
    }
  }
  return out;
}

function scanlines(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  amount: number,
  gap: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src);
  const g = Math.max(1, Math.round(gap));
  for (let y = 0; y < h; y++) {
    if (y % g !== 0) continue;
    const dark = 1 - amount * 0.7;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      out[i] = clamp(src[i] * dark);
      out[i + 1] = clamp(src[i + 1] * dark);
      out[i + 2] = clamp(src[i + 2] * dark);
    }
  }
  return out;
}

function pixelate(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  size: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  const s = Math.max(2, Math.round(size));
  for (let y = 0; y < h; y += s) {
    for (let x = 0; x < w; x += s) {
      let sr = 0, sg = 0, sb = 0, sa = 0, n = 0;
      const bw = Math.min(s, w - x);
      const bh = Math.min(s, h - y);
      for (let dy = 0; dy < bh; dy++) {
        for (let dx = 0; dx < bw; dx++) {
          const i = ((y + dy) * w + (x + dx)) * 4;
          sr += src[i];
          sg += src[i + 1];
          sb += src[i + 2];
          sa += src[i + 3];
          n++;
        }
      }
      const r = sr / n, g = sg / n, b = sb / n, a = sa / n;
      for (let dy = 0; dy < bh; dy++) {
        for (let dx = 0; dx < bw; dx++) {
          const i = ((y + dy) * w + (x + dx)) * 4;
          out[i] = r;
          out[i + 1] = g;
          out[i + 2] = b;
          out[i + 3] = a;
        }
      }
    }
  }
  return out;
}

function contrastBrightness(
  src: Uint8ClampedArray,
  contrast: number,
  brightness: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src);
  const c = contrast;
  const b = brightness;
  for (let i = 0; i < src.length; i += 4) {
    out[i] = clamp(((src[i] - 128) * c + 128) + b);
    out[i + 1] = clamp(((src[i + 1] - 128) * c + 128) + b);
    out[i + 2] = clamp(((src[i + 2] - 128) * c + 128) + b);
    out[i + 3] = src[i + 3];
  }
  return out;
}

function hueShift(
  src: Uint8ClampedArray,
  degrees: number,
  saturation: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src);
  for (let i = 0; i < src.length; i += 4) {
    const [h, s, l] = rgbToHsl(src[i], src[i + 1], src[i + 2]);
    const [r, g, b] = hslToRgb(h + degrees, Math.min(1, s * saturation), l);
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = src[i + 3];
  }
  return out;
}

export function createEffect(type: EffectType): EffectInstance {
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    enabled: true,
    params: { ...EFFECT_DEFAULTS[type] },
  };
}
