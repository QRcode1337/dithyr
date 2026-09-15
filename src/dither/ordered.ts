import type { RGB } from '../types';
import { clamp, nearestColor } from './color';

function bayerMatrix(n: number): number[][] {
  if (n === 2) {
    return [
      [0, 2],
      [3, 1],
    ];
  }
  const half = bayerMatrix(n / 2);
  const h = n / 2;
  const m: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < h; x++) {
      const v = half[y][x];
      m[y][x] = 4 * v;
      m[y][x + h] = 4 * v + 2;
      m[y + h][x] = 4 * v + 3;
      m[y + h][x + h] = 4 * v + 1;
    }
  }
  return m;
}

const BAYER_2 = bayerMatrix(2);
const BAYER_4 = bayerMatrix(4);
const BAYER_8 = bayerMatrix(8);
const BAYER_16 = bayerMatrix(16);

const CLUSTERED_4: number[][] = [
  [12, 5, 6, 13],
  [4, 0, 1, 7],
  [11, 3, 2, 8],
  [15, 10, 9, 14],
];

const CLUSTERED_8: number[][] = [
  [24, 10, 12, 26, 35, 47, 49, 37],
  [8, 0, 2, 14, 45, 59, 61, 51],
  [22, 6, 4, 16, 43, 57, 63, 53],
  [30, 20, 18, 28, 33, 41, 55, 39],
  [34, 46, 48, 36, 25, 11, 13, 27],
  [44, 58, 60, 50, 9, 1, 3, 15],
  [42, 56, 62, 52, 23, 7, 5, 17],
  [32, 40, 54, 38, 31, 21, 19, 29],
];

const DIAGONAL_CLUSTER: number[][] = [
  [7, 2, 1, 6],
  [3, 0, 5, 4],
  [1, 6, 7, 2],
  [5, 4, 3, 0],
];

function orderedDither(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  palette: RGB[],
  matrix: number[][],
  strength = 1
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  const mh = matrix.length;
  const mw = matrix[0].length;
  const maxV = mh * mw - 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const t = (matrix[y % mh][x % mw] / maxV - 0.5) * strength * 255;
      const r = clamp(src[i] + t);
      const g = clamp(src[i + 1] + t);
      const b = clamp(src[i + 2] + t);
      const c = nearestColor(r, g, b, palette);
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = src[i + 3];
    }
  }
  return out;
}

export function bayer2(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return orderedDither(src, w, h, palette, BAYER_2);
}
export function bayer4(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return orderedDither(src, w, h, palette, BAYER_4);
}
export function bayer8(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return orderedDither(src, w, h, palette, BAYER_8);
}
export function bayer16(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return orderedDither(src, w, h, palette, BAYER_16);
}
export function clustered4(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return orderedDither(src, w, h, palette, CLUSTERED_4);
}
export function clustered8(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return orderedDither(src, w, h, palette, CLUSTERED_8);
}
export function diagonalCluster(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return orderedDither(src, w, h, palette, DIAGONAL_CLUSTER);
}

function patternFromFn(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  palette: RGB[],
  fn: (x: number, y: number) => number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const t = (fn(x, y) - 0.5) * 255;
      const r = clamp(src[i] + t);
      const g = clamp(src[i + 1] + t);
      const b = clamp(src[i + 2] + t);
      const c = nearestColor(r, g, b, palette);
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = src[i + 3];
    }
  }
  return out;
}

export function lineHorizontal(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternFromFn(src, w, h, palette, (_x, y) => (y % 4) / 3);
}
export function lineVertical(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternFromFn(src, w, h, palette, (x) => (x % 4) / 3);
}
export function lineDiagonal(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternFromFn(src, w, h, palette, (x, y) => ((x + y) % 5) / 4);
}
export function crosshatch(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternFromFn(src, w, h, palette, (x, y) => {
    const a = ((x + y) % 4) / 3;
    const b = ((x - y + 4000) % 4) / 3;
    return (a + b) / 2;
  });
}

export function halftone(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  const cell = 8;
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const cx = (x % cell) - cell / 2 + 0.5;
      const cy = (y % cell) - cell / 2 + 0.5;
      const dist = Math.sqrt(cx * cx + cy * cy) / (cell * 0.707);
      const t = (dist - 0.5) * 255;
      const r = clamp(src[i] + t);
      const g = clamp(src[i + 1] + t);
      const b = clamp(src[i + 2] + t);
      const nc = nearestColor(r, g, b, palette);
      out[i] = nc[0];
      out[i + 1] = nc[1];
      out[i + 2] = nc[2];
      out[i + 3] = src[i + 3];
    }
  }
  return out;
}

export function dotScreen(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternFromFn(src, w, h, palette, (x, y) => {
    const angle = Math.PI / 4;
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const rx = x * c - y * s;
    const ry = x * s + y * c;
    const fx = ((rx % 10) + 10) % 10;
    const fy = ((ry % 10) + 10) % 10;
    const dx = fx - 5;
    const dy = fy - 5;
    return Math.min(1, Math.sqrt(dx * dx + dy * dy) / 7);
  });
}

export function ellipseScreen(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternFromFn(src, w, h, palette, (x, y) => {
    const fx = (x % 12) - 6;
    const fy = (y % 8) - 4;
    return Math.min(1, Math.sqrt((fx * fx) / 36 + (fy * fy) / 16));
  });
}

export function dualScreen(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternFromFn(src, w, h, palette, (x, y) => {
    const a = Math.sin(x * 0.4) * Math.cos(y * 0.4);
    const b = Math.sin((x + y) * 0.25);
    return (a + b + 2) / 4;
  });
}
