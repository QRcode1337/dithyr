# Dithyr

**Creative dithering studio** — turn dithering into a granular, editable, malleable effect.

Crush detail without losing resolution, or craft fine delicate dither patterns. Full-color palettes, stackable effects, and ~68 real dithering algorithms — all running live in the browser.

## Quick start

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build    # production build
npm run preview  # preview production build
```

## Pipeline

```
source → pre-effects → scale → dither(algorithm, palette) → post-effects → preview/export
```

- **Scale-independent dither**: downsample by pixel scale, dither, then nearest-neighbor upsample — keep canvas resolution while growing the grain.
- **Web Workers** handle heavy processing so the UI stays responsive.

## Algorithms (~68)

| Category | Examples |
|----------|----------|
| Error diffusion | Floyd–Steinberg, Jarvis–Judice–Ninke, Stucki, Atkinson, Burkes, Sierra / Lite / Two-Row, Stevenson–Arce, Shiau–Fan, Ostromoukhov, Riemersma, Dot Diffusion (+ serpentine variants) |
| Ordered | Bayer 2/4/8/16, clustered dot, halftone, line / crosshatch screens, Hilbert |
| Threshold / noise | Simple threshold, random, white / blue / Gaussian noise, variable threshold |
| Dithyr specialty | Weave, Spiral, Hex, Voronoi, Ripple, Checker, Diamond, Circles, Waves, Soft Grid, Pixel Crush, Grain Mesh, Lattice, Moiré, Triad, Gradient Mesh, Bloom Diffuse |

## Palettes

Built-ins: Black & White, CGA, Game Boy, Commodore 64, Pico-8, Apple II, plus artistic sets (Sunset Crush, Deep Ocean, Neon Noir, Earth Tones, Mono Blue, Pastel Pop).

- Auto extract via **median-cut** or **k-means**
- Editable swatches
- Import / export JSON palettes

## Effects (stackable & reorderable)

**Pre** and **post** stacks:

- Epsilon Glow
- JPEG Glitch
- Chromatic Aberration
- Film Grain
- Scanlines
- Pixelate
- Contrast / Brightness
- Hue Shift

## Media

- Still images (PNG, JPEG, WebP, …)
- **Video / GIF MVP**: timeline scrub, play/pause, live preview of the current frame under effects
- Export current preview as **PNG**

### Limitations

- Video/GIF **export** (encoding a processed video file) is not included in this MVP — scrub and preview frames, export stills.
- Very large images are capped at 1600px on the long edge for performance.
- Blue-noise is a multi-octave hash approximation (not a precomputed void-and-cluster texture).

## Stack

Vite · React · TypeScript · Web Workers · Canvas

---

Made for people who treat dither as a material, not a checkbox.
