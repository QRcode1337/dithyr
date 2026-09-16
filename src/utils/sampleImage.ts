import { DEFAULT_SAMPLE_DATA_URL } from './defaultSample';

const CANDIDATES = [DEFAULT_SAMPLE_DATA_URL, '/dithyr-logo.png', '/logo-lockup.png'];

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
      if (!ctx) {
        reject(new Error('no 2d'));
        return;
      }
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
      data[i] = 8;
      data[i + 1] = 8;
      data[i + 2] = 12;
      data[i + 3] = 255;
    }
  }
  return new ImageData(data, width, height);
}
