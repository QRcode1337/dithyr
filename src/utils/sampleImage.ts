/** Generate a tasteful gradient + shapes sample for first open */
export function createSampleImage(width = 640, height = 480): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const u = x / width;
      const v = y / height;
      let r = 30 + u * 180 + Math.sin(v * Math.PI) * 40;
      let g = 40 + v * 120 + Math.cos(u * Math.PI * 2) * 30;
      let b = 90 + (1 - u) * 140;

      const d1 = Math.sqrt((x - cx * 0.7) ** 2 + (y - cy * 0.6) ** 2);
      if (d1 < 120) {
        const t = 1 - d1 / 120;
        r = r * (1 - t) + 255 * t;
        g = g * (1 - t) + 160 * t;
        b = b * (1 - t) + 60 * t;
      }

      const band = Math.abs((x + y) - (width + height) * 0.45);
      if (band < 40) {
        const t = 1 - band / 40;
        r = r * (1 - t * 0.5) + 80 * t;
        g = g * (1 - t * 0.5) + 220 * t;
        b = b * (1 - t * 0.5) + 200 * t;
      }

      const n = ((x * 17 + y * 31) & 15) - 7;
      data[i] = Math.max(0, Math.min(255, r + n));
      data[i + 1] = Math.max(0, Math.min(255, g + n));
      data[i + 2] = Math.max(0, Math.min(255, b + n));
      data[i + 3] = 255;
    }
  }
  return new ImageData(data, width, height);
}
