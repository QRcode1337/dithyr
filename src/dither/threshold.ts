import type { RGB } from '../types';
import { clamp, luminance, nearestColor } from './color';

function hashNoise(x: number, y: number, seed = 0): number {
  let n = x * 374761393 + y * 668265263 + seed * 982451653;
  n = (n ^ (n >> 13)) * 1274126177;
  n = n ^ (n >> 16);
  return (n >>> 0) / 4294967295;
}

export function simpleThreshold(
  src: Uint8ClampedArray,
  _w: number,
  _h: number,
  palette: RGB[],
  threshold = 0.5
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  const sorted = [...palette].sort(
    (a, b) => luminance(a[0], a[1], a[2]) - luminance(b[0], b[1], b[2])
  );
  const dark = sorted[0];
  const light = sorted[sorted.length - 1];
  const t = threshold * 255;
  for (let i = 0; i < src.length; i += 4) {
    const lum = luminance(src[i], src[i + 1], src[i + 2]);
    const c = lum >= t ? light : dark;
    if (palette.length > 2) {
      const boost = lum >= t ? 40 : -40;
      const nc = nearestColor(
        clamp(src[i] + boost),
        clamp(src[i + 1] + boost),
        clamp(src[i + 2] + boost),
        palette
      );
      out[i] = nc[0];
      out[i + 1] = nc[1];
      out[i + 2] = nc[2];
    } else {
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
    }
    out[i + 3] = src[i + 3];
  }
  return out;
}

export function randomDither(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  palette: RGB[]
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = (hashNoise(x, y) - 0.5) * 255;
      const c = nearestColor(
        clamp(src[i] + n),
        clamp(src[i + 1] + n),
        clamp(src[i + 2] + n),
        palette
      );
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = src[i + 3];
    }
  }
  return out;
}

export function whiteNoise(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  palette: RGB[]
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = (hashNoise(x, y, 42) - 0.5) * 200;
      const c = nearestColor(
        clamp(src[i] + n),
        clamp(src[i + 1] + n),
        clamp(src[i + 2] + n),
        palette
      );
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = src[i + 3];
    }
  }
  return out;
}

export function blueNoiseApprox(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  palette: RGB[]
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let n = 0;
      let amp = 1;
      let freq = 1;
      let norm = 0;
      for (let o = 0; o < 4; o++) {
        n += (hashNoise(Math.floor(x * freq), Math.floor(y * freq), o * 97) - 0.5) * amp;
        norm += amp;
        amp *= 0.5;
        freq *= 2.1;
      }
      n = (n / norm) * 255;
      const c = nearestColor(
        clamp(src[i] + n),
        clamp(src[i + 1] + n),
        clamp(src[i + 2] + n),
        palette
      );
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = src[i + 3];
    }
  }
  return out;
}

export function gaussianThreshold(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  palette: RGB[]
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const u1 = Math.max(1e-6, hashNoise(x, y, 1));
      const u2 = hashNoise(x, y, 2);
      const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const n = g * 48;
      const c = nearestColor(
        clamp(src[i] + n),
        clamp(src[i + 1] + n),
        clamp(src[i + 2] + n),
        palette
      );
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = src[i + 3];
    }
  }
  return out;
}

export function variableThreshold(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  palette: RGB[]
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const local =
        0.5 +
        0.25 * Math.sin(x * 0.07) * Math.cos(y * 0.09) +
        0.15 * hashNoise(x >> 3, y >> 3);
      const t = (local - 0.5) * 255;
      const c = nearestColor(
        clamp(src[i] + t),
        clamp(src[i + 1] + t),
        clamp(src[i + 2] + t),
        palette
      );
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = src[i + 3];
    }
  }
  return out;
}
