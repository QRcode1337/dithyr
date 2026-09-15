import type { DitherAlgorithm, RGB } from '../types';
import { errorDiffuse, KERNELS } from './errorDiffusion';
import * as ordered from './ordered';
import * as threshold from './threshold';
import * as specialty from './specialty';

export type DitherFn = (
  src: Uint8ClampedArray,
  w: number,
  h: number,
  palette: RGB[],
  opts?: { threshold?: number; serpentine?: boolean }
) => Uint8ClampedArray;

function ed(kernelKey: keyof typeof KERNELS, serpentineDefault = false): DitherFn {
  return (src, w, h, palette, opts) =>
    errorDiffuse(
      src,
      w,
      h,
      palette,
      KERNELS[kernelKey],
      opts?.serpentine ?? serpentineDefault
    );
}

const entries: Array<DitherAlgorithm & { fn: DitherFn }> = [
  { id: 'floyd-steinberg', name: 'Floyd–Steinberg', category: 'error-diffusion', description: 'Classic 7/16 error diffusion', fn: ed('floydSteinberg') },
  { id: 'floyd-steinberg-serpentine', name: 'Floyd–Steinberg Serpentine', category: 'error-diffusion', fn: ed('floydSteinberg', true) },
  { id: 'false-floyd-steinberg', name: 'False Floyd–Steinberg', category: 'error-diffusion', fn: ed('falseFloydSteinberg') },
  { id: 'false-floyd-steinberg-serpentine', name: 'False FS Serpentine', category: 'error-diffusion', fn: ed('falseFloydSteinberg', true) },
  { id: 'jarvis', name: 'Jarvis–Judice–Ninke', category: 'error-diffusion', fn: ed('jarvis') },
  { id: 'jarvis-serpentine', name: 'JJN Serpentine', category: 'error-diffusion', fn: ed('jarvis', true) },
  { id: 'stucki', name: 'Stucki', category: 'error-diffusion', fn: ed('stucki') },
  { id: 'stucki-serpentine', name: 'Stucki Serpentine', category: 'error-diffusion', fn: ed('stucki', true) },
  { id: 'atkinson', name: 'Atkinson', category: 'error-diffusion', description: 'MacPaint-style, preserves highlights', fn: ed('atkinson') },
  { id: 'atkinson-serpentine', name: 'Atkinson Serpentine', category: 'error-diffusion', fn: ed('atkinson', true) },
  { id: 'burkes', name: 'Burkes', category: 'error-diffusion', fn: ed('burkes') },
  { id: 'burkes-serpentine', name: 'Burkes Serpentine', category: 'error-diffusion', fn: ed('burkes', true) },
  { id: 'sierra', name: 'Sierra', category: 'error-diffusion', fn: ed('sierra') },
  { id: 'sierra-serpentine', name: 'Sierra Serpentine', category: 'error-diffusion', fn: ed('sierra', true) },
  { id: 'sierra-two-row', name: 'Two-Row Sierra', category: 'error-diffusion', fn: ed('sierraTwoRow') },
  { id: 'sierra-two-row-serpentine', name: 'Two-Row Sierra Serpentine', category: 'error-diffusion', fn: ed('sierraTwoRow', true) },
  { id: 'sierra-lite', name: 'Sierra Lite', category: 'error-diffusion', fn: ed('sierraLite') },
  { id: 'sierra-lite-serpentine', name: 'Sierra Lite Serpentine', category: 'error-diffusion', fn: ed('sierraLite', true) },
  { id: 'stevenson-arce', name: 'Stevenson–Arce', category: 'error-diffusion', fn: ed('stevensonArce') },
  { id: 'stevenson-arce-serpentine', name: 'Stevenson–Arce Serpentine', category: 'error-diffusion', fn: ed('stevensonArce', true) },
  { id: 'shiau-fan', name: 'Shiau–Fan', category: 'error-diffusion', fn: ed('shiauFan') },
  { id: 'shiau-fan-2', name: 'Shiau–Fan 2', category: 'error-diffusion', fn: ed('shiauFan2') },
  { id: 'fan-93', name: 'Fan (1993)', category: 'error-diffusion', fn: ed('fan93') },
  { id: 'filter-lite', name: 'Filter Lite', category: 'error-diffusion', fn: ed('filterLite') },
  { id: 'jjn-lite', name: 'JJN Lite', category: 'error-diffusion', fn: ed('jjnLite') },
  { id: 'ostromoukhov', name: 'Ostromoukhov', category: 'error-diffusion', description: 'Variable-coefficient FS', fn: (s,w,h,p) => specialty.ostromoukhov(s,w,h,p) },
  { id: 'riemersma', name: 'Riemersma', category: 'error-diffusion', description: 'Hilbert-path error history', fn: (s,w,h,p) => specialty.riemersma(s,w,h,p) },
  { id: 'dot-diffusion', name: 'Dot Diffusion', category: 'error-diffusion', description: 'Ulichney class-matrix', fn: (s,w,h,p) => specialty.dotDiffusion(s,w,h,p) },

  { id: 'bayer-2', name: 'Bayer 2×2', category: 'ordered', fn: (s,w,h,p) => ordered.bayer2(s,w,h,p) },
  { id: 'bayer-4', name: 'Bayer 4×4', category: 'ordered', fn: (s,w,h,p) => ordered.bayer4(s,w,h,p) },
  { id: 'bayer-8', name: 'Bayer 8×8', category: 'ordered', fn: (s,w,h,p) => ordered.bayer8(s,w,h,p) },
  { id: 'bayer-16', name: 'Bayer 16×16', category: 'ordered', fn: (s,w,h,p) => ordered.bayer16(s,w,h,p) },
  { id: 'clustered-4', name: 'Clustered Dot 4×4', category: 'ordered', fn: (s,w,h,p) => ordered.clustered4(s,w,h,p) },
  { id: 'clustered-8', name: 'Clustered Dot 8×8', category: 'ordered', fn: (s,w,h,p) => ordered.clustered8(s,w,h,p) },
  { id: 'diagonal-cluster', name: 'Diagonal Cluster', category: 'ordered', fn: (s,w,h,p) => ordered.diagonalCluster(s,w,h,p) },
  { id: 'halftone', name: 'Halftone', category: 'ordered', fn: (s,w,h,p) => ordered.halftone(s,w,h,p) },
  { id: 'line-horizontal', name: 'Horizontal Lines', category: 'ordered', fn: (s,w,h,p) => ordered.lineHorizontal(s,w,h,p) },
  { id: 'line-vertical', name: 'Vertical Lines', category: 'ordered', fn: (s,w,h,p) => ordered.lineVertical(s,w,h,p) },
  { id: 'line-diagonal', name: 'Diagonal Lines', category: 'ordered', fn: (s,w,h,p) => ordered.lineDiagonal(s,w,h,p) },
  { id: 'crosshatch', name: 'Crosshatch', category: 'ordered', fn: (s,w,h,p) => ordered.crosshatch(s,w,h,p) },
  { id: 'dot-screen', name: 'Dot Screen', category: 'ordered', fn: (s,w,h,p) => ordered.dotScreen(s,w,h,p) },
  { id: 'ellipse-screen', name: 'Ellipse Screen', category: 'ordered', fn: (s,w,h,p) => ordered.ellipseScreen(s,w,h,p) },
  { id: 'dual-screen', name: 'Dual Screen', category: 'ordered', fn: (s,w,h,p) => ordered.dualScreen(s,w,h,p) },
  { id: 'hilbert', name: 'Hilbert / Z-order', category: 'ordered', fn: (s,w,h,p) => specialty.hilbertApprox(s,w,h,p) },

  { id: 'threshold', name: 'Simple Threshold', category: 'threshold', fn: (s,w,h,p,o) => threshold.simpleThreshold(s,w,h,p, o?.threshold ?? 0.5) },
  { id: 'random', name: 'Random', category: 'threshold', fn: (s,w,h,p) => threshold.randomDither(s,w,h,p) },
  { id: 'white-noise', name: 'White Noise', category: 'threshold', fn: (s,w,h,p) => threshold.whiteNoise(s,w,h,p) },
  { id: 'blue-noise', name: 'Blue Noise (approx)', category: 'threshold', fn: (s,w,h,p) => threshold.blueNoiseApprox(s,w,h,p) },
  { id: 'gaussian', name: 'Gaussian Threshold', category: 'threshold', fn: (s,w,h,p) => threshold.gaussianThreshold(s,w,h,p) },
  { id: 'variable-threshold', name: 'Variable Threshold', category: 'threshold', fn: (s,w,h,p) => threshold.variableThreshold(s,w,h,p) },
  { id: 'peano', name: 'Peano-ish', category: 'threshold', fn: (s,w,h,p) => specialty.peanoish(s,w,h,p) },

  { id: 'dithyr-weave', name: 'Dithyr Weave', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrWeave(s,w,h,p) },
  { id: 'dithyr-spiral', name: 'Dithyr Spiral', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrSpiral(s,w,h,p) },
  { id: 'dithyr-hex', name: 'Dithyr Hex', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrHex(s,w,h,p) },
  { id: 'dithyr-voronoi', name: 'Dithyr Voronoi', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrVoronoi(s,w,h,p) },
  { id: 'dithyr-ripple', name: 'Dithyr Ripple', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrRipple(s,w,h,p) },
  { id: 'dithyr-checker', name: 'Dithyr Checker', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrChecker(s,w,h,p) },
  { id: 'dithyr-diamond', name: 'Dithyr Diamond', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrDiamond(s,w,h,p) },
  { id: 'dithyr-circles', name: 'Dithyr Circles', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrCircles(s,w,h,p) },
  { id: 'dithyr-waves', name: 'Dithyr Waves', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrWaves(s,w,h,p) },
  { id: 'dithyr-grid-soft', name: 'Dithyr Soft Grid', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrGridSoft(s,w,h,p) },
  { id: 'dithyr-pixel-crush', name: 'Dithyr Pixel Crush', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrPixelCrush(s,w,h,p) },
  { id: 'dithyr-grain-mesh', name: 'Dithyr Grain Mesh', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrGrainMesh(s,w,h,p) },
  { id: 'dithyr-lattice', name: 'Dithyr Lattice', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrLattice(s,w,h,p) },
  { id: 'dithyr-moire', name: 'Dithyr Moiré', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrMoire(s,w,h,p) },
  { id: 'dithyr-triad', name: 'Dithyr Triad', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrTriad(s,w,h,p) },
  { id: 'dithyr-gradient-mesh', name: 'Dithyr Gradient Mesh', category: 'specialty', fn: (s,w,h,p) => specialty.gradientMesh(s,w,h,p) },
  { id: 'dithyr-bloom', name: 'Dithyr Bloom Diffuse', category: 'specialty', fn: (s,w,h,p) => specialty.dithyrBloomDiffuse(s,w,h,p) },
];

export const ALGORITHM_REGISTRY = entries;

export const ALGORITHMS: DitherAlgorithm[] = entries.map(({ id, name, category, description }) => ({
  id,
  name,
  category,
  description,
}));

export function getAlgorithm(id: string) {
  return entries.find((e) => e.id === id) ?? entries[0];
}

export function runDither(
  id: string,
  src: Uint8ClampedArray,
  w: number,
  h: number,
  palette: RGB[],
  opts?: { threshold?: number; serpentine?: boolean }
): Uint8ClampedArray {
  const algo = getAlgorithm(id);
  return algo.fn(src, w, h, palette, opts);
}

export const ALGORITHM_COUNT = entries.length;
