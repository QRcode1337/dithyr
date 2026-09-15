import type { EffectInstance, RGB } from '../types';
import { runDither } from '../dither/registry';
import { applyEffectStack } from '../effects/effects';

export interface ProcessParams {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  algorithmId: string;
  palette: RGB[];
  scale: number;
  threshold: number;
  serpentine: boolean;
  preEffects: EffectInstance[];
  postEffects: EffectInstance[];
}

/** Nearest-neighbor downsample then nearest upsample — scale-independent dither look */
export function scaleIndependent(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  scale: number
): { data: Uint8ClampedArray; w: number; h: number; fullW: number; fullH: number } {
  const s = Math.max(1, Math.round(scale));
  if (s === 1) {
    return { data: new Uint8ClampedArray(data), w, h, fullW: w, fullH: h };
  }
  const sw = Math.max(1, Math.floor(w / s));
  const sh = Math.max(1, Math.floor(h / s));
  const small = new Uint8ClampedArray(sw * sh * 4);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const sx = Math.min(w - 1, x * s);
      const sy = Math.min(h - 1, y * s);
      const si = (sy * w + sx) * 4;
      const di = (y * sw + x) * 4;
      small[di] = data[si];
      small[di + 1] = data[si + 1];
      small[di + 2] = data[si + 2];
      small[di + 3] = data[si + 3];
    }
  }
  return { data: small, w: sw, h: sh, fullW: w, fullH: h };
}

export function upsampleNearest(
  data: Uint8ClampedArray,
  sw: number,
  sh: number,
  fw: number,
  fh: number,
  scale: number
): Uint8ClampedArray {
  const s = Math.max(1, Math.round(scale));
  if (s === 1) return data;
  const out = new Uint8ClampedArray(fw * fh * 4);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const sx = Math.min(sw - 1, Math.floor(x / s));
      const sy = Math.min(sh - 1, Math.floor(y / s));
      const si = (sy * sw + sx) * 4;
      const di = (y * fw + x) * 4;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = data[si + 3];
    }
  }
  return out;
}

/** Pipeline: source → pre-effects → scale → dither → upsample → post-effects */
export function processImage(params: ProcessParams): {
  width: number;
  height: number;
  data: Uint8ClampedArray;
} {
  const {
    width,
    height,
    data: source,
    algorithmId,
    palette,
    scale,
    threshold,
    serpentine,
    preEffects,
    postEffects,
  } = params;

  let data = applyEffectStack(new Uint8ClampedArray(source), width, height, preEffects);

  const scaled = scaleIndependent(data, width, height, scale);
  let dithered = runDither(algorithmId, scaled.data, scaled.w, scaled.h, palette, {
    threshold,
    serpentine,
  });

  data = upsampleNearest(dithered, scaled.w, scaled.h, scaled.fullW, scaled.fullH, scale);
  data = applyEffectStack(data, width, height, postEffects);

  return { width, height, data };
}
