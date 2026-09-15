import type { RGB } from '../types';
import { clamp, luminance, nearestColor } from './color';
import { errorDiffuse, KERNELS } from './errorDiffusion';

function patternMap(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  palette: RGB[],
  fn: (x: number, y: number, lum: number) => number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = luminance(src[i], src[i + 1], src[i + 2]) / 255;
      const t = (fn(x, y, lum) - 0.5) * 255;
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

export function dithyrWeave(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternMap(src, w, h, palette, (x, y) => {
    const a = ((x + y * 2) % 6) / 5;
    const b = ((x * 2 - y + 6000) % 6) / 5;
    return (a * 0.6 + b * 0.4);
  });
}

export function dithyrSpiral(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  const cx = w / 2;
  const cy = h / 2;
  return patternMap(src, w, h, palette, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const ang = Math.atan2(dy, dx);
    const r = Math.sqrt(dx * dx + dy * dy);
    return ((ang / Math.PI + 1) * 0.5 * 0.4 + ((r * 0.15) % 1) * 0.6);
  });
}

export function dithyrHex(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternMap(src, w, h, palette, (x, y) => {
    const s = 10;
    const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / (s / 2);
    const r = ((2 / 3) * y) / (s / 2);
    const fq = q - Math.floor(q);
    const fr = r - Math.floor(r);
    return (fq + fr) / 2;
  });
}

export function dithyrRipple(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  const cx = w / 2;
  const cy = h / 2;
  return patternMap(src, w, h, palette, (x, y) => {
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    return (Math.sin(d * 0.35) + 1) / 2;
  });
}

export function dithyrChecker(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternMap(src, w, h, palette, (x, y) => {
    const cell = 6;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    const base = (cx + cy) % 2 === 0 ? 0.25 : 0.75;
    const fx = (x % cell) / cell;
    const fy = (y % cell) / cell;
    return base + (fx - 0.5) * 0.15 + (fy - 0.5) * 0.15;
  });
}

export function dithyrDiamond(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternMap(src, w, h, palette, (x, y) => {
    const s = 8;
    const fx = Math.abs((x % s) - s / 2);
    const fy = Math.abs((y % s) - s / 2);
    return Math.min(1, (fx + fy) / s);
  });
}

export function dithyrCircles(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternMap(src, w, h, palette, (x, y) => {
    const s = 12;
    const fx = (x % s) - s / 2;
    const fy = (y % s) - s / 2;
    return Math.min(1, Math.sqrt(fx * fx + fy * fy) / (s * 0.6));
  });
}

export function dithyrWaves(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternMap(src, w, h, palette, (x, y) => {
    return (Math.sin(x * 0.2 + Math.sin(y * 0.15) * 2) + 1) / 2;
  });
}

export function dithyrGridSoft(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternMap(src, w, h, palette, (x, y) => {
    const gx = Math.abs(Math.sin(x * 0.5));
    const gy = Math.abs(Math.sin(y * 0.5));
    return (gx + gy) / 2;
  });
}

export function dithyrPixelCrush(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const crush = 48;
      const n = ((((x * 7 + y * 13) & 15) / 15) - 0.5) * crush;
      const c = nearestColor(
        clamp(Math.round(src[i] / 32) * 32 + n),
        clamp(Math.round(src[i + 1] / 32) * 32 + n),
        clamp(Math.round(src[i + 2] / 32) * 32 + n),
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

export function dithyrGrainMesh(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternMap(src, w, h, palette, (x, y) => {
    const g =
      ((x * 374761393 + y * 668265263) >>> 0) / 4294967295;
    const m = ((Math.sin(x * 1.7) * Math.cos(y * 1.3) + 1) / 2) * 0.5;
    return g * 0.5 + m;
  });
}

export function dithyrLattice(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternMap(src, w, h, palette, (x, y) => {
    const a = Math.abs(Math.sin(x * 0.8) * Math.sin(y * 0.8));
    const b = ((x + y) % 7) / 6;
    return a * 0.5 + b * 0.5;
  });
}

export function dithyrVoronoi(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  const cell = 16;
  return patternMap(src, w, h, palette, (x, y) => {
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    let best = Infinity;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const nx = cx + ox;
        const ny = cy + oy;
        const hx = ((nx * 127 + ny * 311) & 255) / 255;
        const hy = ((nx * 269 + ny * 97) & 255) / 255;
        const px = (nx + hx) * cell;
        const py = (ny + hy) * cell;
        const d = (x - px) ** 2 + (y - py) ** 2;
        if (d < best) best = d;
      }
    }
    return Math.min(1, Math.sqrt(best) / cell);
  });
}

export function hilbertApprox(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternMap(src, w, h, palette, (x, y) => {
    let n = 0;
    for (let i = 0; i < 8; i++) {
      n |= ((x >> i) & 1) << (2 * i);
      n |= ((y >> i) & 1) << (2 * i + 1);
    }
    return ((n & 255) / 255);
  });
}

export function peanoish(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternMap(src, w, h, palette, (x, y) => {
    const t = ((x * 3 + y * 5) ^ (x * 7 - y)) & 63;
    return t / 63;
  });
}

export function riemersma(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  const out = new Uint8ClampedArray(src.length);
  const history: Array<[number, number, number]> = [];
  const histLen = 16;
  let er = 0,
    eg = 0,
    eb = 0;

  for (let y = 0; y < h; y++) {
    const ltr = y % 2 === 0;
    for (let xi = 0; xi < w; xi++) {
      const x = ltr ? xi : w - 1 - xi;
      const i = (y * w + x) * 4;
      const r = clamp(src[i] + er);
      const g = clamp(src[i + 1] + eg);
      const b = clamp(src[i + 2] + eb);
      const c = nearestColor(r, g, b, palette);
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = src[i + 3];
      const nr = r - c[0];
      const ng = g - c[1];
      const nb = b - c[2];
      history.push([nr, ng, nb]);
      if (history.length > histLen) history.shift();
      er = eg = eb = 0;
      for (let k = 0; k < history.length; k++) {
        const wgt = (k + 1) / ((histLen * (histLen + 1)) / 2);
        er += history[k][0] * wgt * histLen * 0.5;
        eg += history[k][1] * wgt * histLen * 0.5;
        eb += history[k][2] * wgt * histLen * 0.5;
      }
    }
  }
  return out;
}

export function gradientMesh(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternMap(src, w, h, palette, (x, y, lum) => {
    const g = (x / Math.max(1, w - 1) + y / Math.max(1, h - 1)) / 2;
    return (g * 0.4 + lum * 0.3 + ((((x * 13) ^ (y * 7)) & 15) / 15) * 0.3);
  });
}

export function ostromoukhov(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  const out = new Uint8ClampedArray(src.length);
  const buf = new Float32Array(w * h * 3);
  for (let i = 0, j = 0; i < src.length; i += 4, j += 3) {
    buf[j] = src[i];
    buf[j + 1] = src[i + 1];
    buf[j + 2] = src[i + 2];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const bi = (y * w + x) * 3;
      const r = clamp(buf[bi]);
      const g = clamp(buf[bi + 1]);
      const b = clamp(buf[bi + 2]);
      const c = nearestColor(r, g, b, palette);
      const oi = (y * w + x) * 4;
      out[oi] = c[0];
      out[oi + 1] = c[1];
      out[oi + 2] = c[2];
      out[oi + 3] = src[oi + 3];
      const er = r - c[0];
      const eg = g - c[1];
      const eb = b - c[2];
      const lum = luminance(r, g, b) / 255;
      const right = 0.4375 + lum * 0.1;
      const bl = 0.1875 - lum * 0.05;
      const bc = 0.3125;
      const br = 0.0625 + lum * 0.05;
      const sum = right + bl + bc + br;
      const add = (nx: number, ny: number, f: number) => {
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) return;
        const idx = (ny * w + nx) * 3;
        buf[idx] += er * f;
        buf[idx + 1] += eg * f;
        buf[idx + 2] += eb * f;
      };
      add(x + 1, y, right / sum);
      add(x - 1, y + 1, bl / sum);
      add(x, y + 1, bc / sum);
      add(x + 1, y + 1, br / sum);
    }
  }
  return out;
}

export function dotDiffusion(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  const cls = [
    [34, 48, 40, 32, 29, 15, 23, 31],
    [42, 58, 56, 53, 21, 5, 7, 10],
    [50, 62, 60, 45, 13, 1, 3, 18],
    [38, 46, 54, 37, 25, 17, 9, 26],
    [28, 14, 22, 30, 35, 49, 41, 33],
    [20, 4, 6, 11, 43, 59, 57, 52],
    [12, 0, 2, 19, 51, 63, 61, 44],
    [24, 16, 8, 27, 39, 47, 55, 36],
  ];
  const out = new Uint8ClampedArray(src.length);
  const buf = new Float32Array(w * h * 3);
  for (let i = 0, j = 0; i < src.length; i += 4, j += 3) {
    buf[j] = src[i];
    buf[j + 1] = src[i + 1];
    buf[j + 2] = src[i + 2];
  }
  const order: Array<[number, number, number]> = [];
  for (let cy = 0; cy < 8; cy++) {
    for (let cx = 0; cx < 8; cx++) {
      order.push([cls[cy][cx], cx, cy]);
    }
  }
  order.sort((a, b) => a[0] - b[0]);

  for (let y0 = 0; y0 < h; y0 += 8) {
    for (let x0 = 0; x0 < w; x0 += 8) {
      for (const [, cx, cy] of order) {
        const x = x0 + cx;
        const y = y0 + cy;
        if (x >= w || y >= h) continue;
        const bi = (y * w + x) * 3;
        const r = clamp(buf[bi]);
        const g = clamp(buf[bi + 1]);
        const b = clamp(buf[bi + 2]);
        const c = nearestColor(r, g, b, palette);
        const oi = (y * w + x) * 4;
        out[oi] = c[0];
        out[oi + 1] = c[1];
        out[oi + 2] = c[2];
        out[oi + 3] = src[oi + 3];
        const er = r - c[0];
        const eg = g - c[1];
        const eb = b - c[2];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < x0 || ny < y0 || nx >= x0 + 8 || ny >= y0 + 8) continue;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const ncx = nx - x0;
            const ncy = ny - y0;
            if (cls[ncy][ncx] <= cls[cy][cx]) continue;
            const idx = (ny * w + nx) * 3;
            const f = 1 / 8;
            buf[idx] += er * f;
            buf[idx + 1] += eg * f;
            buf[idx + 2] += eb * f;
          }
        }
      }
    }
  }
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0 && src[i + 3] !== 0) {
      const c = nearestColor(src[i], src[i + 1], src[i + 2], palette);
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = src[i + 3];
    }
  }
  return out;
}

export function dithyrMoire(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternMap(src, w, h, palette, (x, y) => {
    const a = Math.sin(x * 0.55) * Math.sin(y * 0.55);
    const b = Math.sin(x * 0.61 + 1) * Math.sin(y * 0.49);
    return (a + b + 2) / 4;
  });
}

export function dithyrTriad(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return patternMap(src, w, h, palette, (x, y) => {
    const t = ((x + y * 2) % 3) / 2;
    return t;
  });
}

export function dithyrBloomDiffuse(src: Uint8ClampedArray, w: number, h: number, palette: RGB[]) {
  return errorDiffuse(src, w, h, palette, KERNELS.atkinson, true);
}
