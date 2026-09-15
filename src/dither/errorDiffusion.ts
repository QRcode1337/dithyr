import type { RGB } from '../types';
import { clamp, quantizePixel } from './color';

export type KernelWeight = [dx: number, dy: number, w: number];

export interface KernelDef {
  weights: KernelWeight[];
  divisor: number;
}

export const KERNELS: Record<string, KernelDef> = {
  floydSteinberg: {
    weights: [
      [1, 0, 7],
      [-1, 1, 3],
      [0, 1, 5],
      [1, 1, 1],
    ],
    divisor: 16,
  },
  falseFloydSteinberg: {
    weights: [
      [1, 0, 3],
      [0, 1, 3],
      [1, 1, 2],
    ],
    divisor: 8,
  },
  jarvis: {
    weights: [
      [1, 0, 7],
      [2, 0, 5],
      [-2, 1, 3],
      [-1, 1, 5],
      [0, 1, 7],
      [1, 1, 5],
      [2, 1, 3],
      [-2, 2, 1],
      [-1, 2, 3],
      [0, 2, 5],
      [1, 2, 3],
      [2, 2, 1],
    ],
    divisor: 48,
  },
  stucki: {
    weights: [
      [1, 0, 8],
      [2, 0, 4],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 8],
      [1, 1, 4],
      [2, 1, 2],
      [-2, 2, 1],
      [-1, 2, 2],
      [0, 2, 4],
      [1, 2, 2],
      [2, 2, 1],
    ],
    divisor: 42,
  },
  atkinson: {
    weights: [
      [1, 0, 1],
      [2, 0, 1],
      [-1, 1, 1],
      [0, 1, 1],
      [1, 1, 1],
      [0, 2, 1],
    ],
    divisor: 8,
  },
  burkes: {
    weights: [
      [1, 0, 8],
      [2, 0, 4],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 8],
      [1, 1, 4],
      [2, 1, 2],
    ],
    divisor: 32,
  },
  sierra: {
    weights: [
      [1, 0, 5],
      [2, 0, 3],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 5],
      [1, 1, 4],
      [2, 1, 2],
      [-1, 2, 2],
      [0, 2, 3],
      [1, 2, 2],
    ],
    divisor: 32,
  },
  sierraTwoRow: {
    weights: [
      [1, 0, 4],
      [2, 0, 3],
      [-2, 1, 1],
      [-1, 1, 2],
      [0, 1, 3],
      [1, 1, 2],
      [2, 1, 1],
    ],
    divisor: 16,
  },
  sierraLite: {
    weights: [
      [1, 0, 2],
      [-1, 1, 1],
      [0, 1, 1],
    ],
    divisor: 4,
  },
  stevensonArce: {
    weights: [
      [2, 0, 32],
      [-3, 1, 12],
      [-1, 1, 26],
      [1, 1, 30],
      [3, 1, 16],
      [-2, 2, 12],
      [0, 2, 26],
      [2, 2, 12],
      [-3, 3, 5],
      [-1, 3, 12],
      [1, 3, 12],
      [3, 3, 5],
    ],
    divisor: 200,
  },
  shiauFan: {
    weights: [
      [1, 0, 8],
      [-2, 1, 1],
      [-1, 1, 1],
      [0, 1, 2],
    ],
    divisor: 12,
  },
  shiauFan2: {
    weights: [
      [1, 0, 8],
      [-3, 1, 1],
      [-2, 1, 1],
      [-1, 1, 2],
      [0, 1, 4],
    ],
    divisor: 16,
  },
  fan93: {
    weights: [
      [1, 0, 7],
      [-1, 1, 1],
      [0, 1, 3],
      [1, 1, 5],
    ],
    divisor: 16,
  },
  filterLite: {
    weights: [
      [1, 0, 2],
      [-1, 1, 1],
      [0, 1, 1],
    ],
    divisor: 4,
  },
  jjnLite: {
    weights: [
      [1, 0, 2],
      [2, 0, 1],
      [-1, 1, 1],
      [0, 1, 2],
      [1, 1, 1],
    ],
    divisor: 7,
  },
};

function applyError(
  buf: Float32Array,
  w: number,
  h: number,
  x: number,
  y: number,
  er: number,
  eg: number,
  eb: number,
  kernel: KernelDef,
  dir: number
) {
  const { weights, divisor } = kernel;
  for (let i = 0; i < weights.length; i++) {
    let [dx, dy, wt] = weights[i];
    dx *= dir;
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
    const idx = (ny * w + nx) * 3;
    const f = wt / divisor;
    buf[idx] += er * f;
    buf[idx + 1] += eg * f;
    buf[idx + 2] += eb * f;
  }
}

export function errorDiffuse(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  palette: RGB[],
  kernel: KernelDef,
  serpentine = false
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  const buf = new Float32Array(w * h * 3);
  for (let i = 0, j = 0; i < src.length; i += 4, j += 3) {
    buf[j] = src[i];
    buf[j + 1] = src[i + 1];
    buf[j + 2] = src[i + 2];
  }

  for (let y = 0; y < h; y++) {
    const leftToRight = !serpentine || y % 2 === 0;
    const start = leftToRight ? 0 : w - 1;
    const end = leftToRight ? w : -1;
    const step = leftToRight ? 1 : -1;
    const dir = leftToRight ? 1 : -1;

    for (let x = start; x !== end; x += step) {
      const bi = (y * w + x) * 3;
      const r = clamp(buf[bi]);
      const g = clamp(buf[bi + 1]);
      const b = clamp(buf[bi + 2]);
      const { color, er, eg, eb } = quantizePixel(r, g, b, palette);
      const oi = (y * w + x) * 4;
      out[oi] = color[0];
      out[oi + 1] = color[1];
      out[oi + 2] = color[2];
      out[oi + 3] = src[oi + 3];
      applyError(buf, w, h, x, y, er, eg, eb, kernel, dir);
    }
  }
  return out;
}
