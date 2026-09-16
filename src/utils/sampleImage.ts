import { DEFAULT_SAMPLE_DATA_URL } from './defaultSample';

const CANDIDATES = ['/dithyr-logo.png', '/logo-lockup.png', DEFAULT_SAMPLE_DATA_URL];

export async function loadSampleImage(): Promise<ImageData> {
  for (const url of CANDIDATES) {
    if (!url) continue;
    try {
      return await decodeUrl(url);
    } catch {
      /* try next */
    }
  }
  return createSampleImage(640, 480);
}

function decodeUrl(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('no 2d')); return; }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = () => reject(new Error(`failed ${url}`));
    img.src = url;
  });
}

export function createSampleImage(width = 640, height = 480): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const u = x / width;
      const v = y / height;
      data[i] = Math.max(0, Math.min(255, 20 + u * 40));
      data[i + 1] = Math.max(0, Math.min(255, 16 + v * 24));
      data[i + 2] = Math.max(0, Math.min(255, 28 + (1 - u) * 36));
      data[i + 3] = 255;
    }
  }
  return new ImageData(data, width, height);
}
