import type { Palette, RGB } from '../types';

export const BUILTIN_PALETTES: Palette[] = [
  {
    id: 'bw',
    name: 'Black & White',
    colors: [
      [0, 0, 0],
      [255, 255, 255],
    ],
  },
  {
    id: 'cga',
    name: 'CGA',
    colors: [
      [0, 0, 0],
      [0, 0, 170],
      [0, 170, 0],
      [0, 170, 170],
      [170, 0, 0],
      [170, 0, 170],
      [170, 85, 0],
      [170, 170, 170],
      [85, 85, 85],
      [85, 85, 255],
      [85, 255, 85],
      [85, 255, 255],
      [255, 85, 85],
      [255, 85, 255],
      [255, 255, 85],
      [255, 255, 255],
    ],
  },
  {
    id: 'gameboy',
    name: 'Game Boy',
    colors: [
      [15, 56, 15],
      [48, 98, 48],
      [139, 172, 15],
      [155, 188, 15],
    ],
  },
  {
    id: 'c64',
    name: 'Commodore 64',
    colors: [
      [0, 0, 0],
      [255, 255, 255],
      [136, 0, 0],
      [170, 255, 238],
      [204, 68, 204],
      [0, 204, 85],
      [0, 0, 170],
      [238, 238, 119],
      [221, 136, 85],
      [102, 68, 0],
      [255, 119, 119],
      [51, 51, 51],
      [119, 119, 119],
      [170, 255, 102],
      [0, 136, 255],
      [187, 187, 187],
    ],
  },
  {
    id: 'pico8',
    name: 'Pico-8',
    colors: [
      [0, 0, 0],
      [29, 43, 83],
      [126, 37, 83],
      [0, 135, 81],
      [171, 82, 54],
      [95, 87, 79],
      [194, 195, 199],
      [255, 241, 232],
      [255, 0, 77],
      [255, 163, 0],
      [255, 236, 39],
      [0, 228, 54],
      [41, 173, 255],
      [131, 118, 156],
      [255, 119, 168],
      [255, 204, 170],
    ],
  },
  {
    id: 'apple2',
    name: 'Apple II',
    colors: [
      [0, 0, 0],
      [114, 33, 64],
      [64, 48, 127],
      [226, 60, 241],
      [14, 92, 60],
      [128, 128, 128],
      [29, 185, 241],
      [192, 200, 240],
      [64, 63, 11],
      [226, 96, 23],
      [128, 128, 128],
      [241, 166, 191],
      [39, 201, 20],
      [191, 200, 133],
      [147, 219, 185],
      [255, 255, 255],
    ],
  },
  {
    id: 'sunset',
    name: 'Sunset Crush',
    colors: [
      [26, 19, 48],
      [72, 34, 74],
      [160, 54, 82],
      [230, 98, 68],
      [250, 178, 90],
      [255, 230, 180],
    ],
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    colors: [
      [5, 15, 30],
      [10, 40, 70],
      [20, 80, 120],
      [40, 140, 160],
      [120, 200, 190],
      [220, 240, 230],
    ],
  },
  {
    id: 'neon',
    name: 'Neon Noir',
    colors: [
      [10, 10, 18],
      [255, 0, 128],
      [0, 255, 200],
      [120, 0, 255],
      [255, 240, 0],
      [255, 255, 255],
    ],
  },
  {
    id: 'earth',
    name: 'Earth Tones',
    colors: [
      [40, 28, 20],
      [90, 58, 36],
      [140, 100, 60],
      [180, 150, 100],
      [120, 140, 80],
      [220, 210, 180],
    ],
  },
  {
    id: 'mono-blue',
    name: 'Mono Blue',
    colors: [
      [8, 12, 28],
      [30, 50, 90],
      [70, 110, 170],
      [140, 180, 220],
      [220, 235, 250],
    ],
  },
  {
    id: 'pastel',
    name: 'Pastel Pop',
    colors: [
      [255, 180, 190],
      [180, 220, 255],
      [190, 255, 200],
      [255, 240, 180],
      [220, 190, 255],
      [40, 40, 50],
    ],
  },
];

export function getPalette(id: string, custom?: Palette | null): Palette {
  if (custom && custom.id === id) return custom;
  return BUILTIN_PALETTES.find((p) => p.id === id) ?? BUILTIN_PALETTES[0];
}

export function exportPaletteJson(palette: Palette): string {
  return JSON.stringify(
    {
      name: palette.name,
      colors: palette.colors.map(
        ([r, g, b]) =>
          `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
      ),
    },
    null,
    2
  );
}

export function importPaletteJson(json: string): Palette {
  const data = JSON.parse(json);
  const colors: RGB[] = (data.colors as string[]).map((hex: string) => {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  });
  return {
    id: `custom-${Date.now()}`,
    name: data.name || 'Imported',
    colors,
  };
}

/** Median-cut palette extraction */
export function extractPaletteMedianCut(
  imageData: ImageData,
  colorCount = 8
): RGB[] {
  type Box = { pixels: RGB[]; };
  const pixels: RGB[] = [];
  const data = imageData.data;
  const step = Math.max(1, Math.floor((data.length / 4) / 20000));
  for (let i = 0; i < data.length; i += 4 * step) {
    if (data[i + 3] < 128) continue;
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (pixels.length === 0) return [[0, 0, 0], [255, 255, 255]];

  let boxes: Box[] = [{ pixels }];
  while (boxes.length < colorCount) {
    boxes.sort((a, b) => b.pixels.length - a.pixels.length);
    const box = boxes.shift()!;
    if (box.pixels.length < 2) {
      boxes.push(box);
      break;
    }
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    for (const [r, g, b] of box.pixels) {
      if (r < rMin) rMin = r;
      if (r > rMax) rMax = r;
      if (g < gMin) gMin = g;
      if (g > gMax) gMax = g;
      if (b < bMin) bMin = b;
      if (b > bMax) bMax = b;
    }
    const ranges = [rMax - rMin, gMax - gMin, bMax - bMin];
    const channel = ranges.indexOf(Math.max(...ranges)) as 0 | 1 | 2;
    box.pixels.sort((a, b) => a[channel] - b[channel]);
    const mid = Math.floor(box.pixels.length / 2);
    boxes.push({ pixels: box.pixels.slice(0, mid) });
    boxes.push({ pixels: box.pixels.slice(mid) });
  }

  return boxes.map((box) => {
    let r = 0, g = 0, b = 0;
    for (const p of box.pixels) {
      r += p[0];
      g += p[1];
      b += p[2];
    }
    const n = box.pixels.length || 1;
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)] as RGB;
  });
}

/** k-means palette extraction */
export function extractPaletteKMeans(
  imageData: ImageData,
  colorCount = 8,
  iterations = 10
): RGB[] {
  const data = imageData.data;
  const samples: RGB[] = [];
  const step = Math.max(1, Math.floor((data.length / 4) / 15000));
  for (let i = 0; i < data.length; i += 4 * step) {
    if (data[i + 3] < 128) continue;
    samples.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (samples.length === 0) return [[0, 0, 0], [255, 255, 255]];

  const centroids: RGB[] = [];
  const used = new Set<number>();
  while (centroids.length < colorCount && centroids.length < samples.length) {
    const idx = Math.floor(Math.random() * samples.length);
    if (used.has(idx)) continue;
    used.add(idx);
    centroids.push([...samples[idx]] as RGB);
  }

  for (let iter = 0; iter < iterations; iter++) {
    const groups: RGB[][] = Array.from({ length: centroids.length }, () => []);
    for (const p of samples) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d =
          (p[0] - centroids[c][0]) ** 2 +
          (p[1] - centroids[c][1]) ** 2 +
          (p[2] - centroids[c][2]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      groups[best].push(p);
    }
    for (let c = 0; c < centroids.length; c++) {
      if (groups[c].length === 0) continue;
      let r = 0, g = 0, b = 0;
      for (const p of groups[c]) {
        r += p[0];
        g += p[1];
        b += p[2];
      }
      const n = groups[c].length;
      centroids[c] = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    }
  }
  return centroids;
}
