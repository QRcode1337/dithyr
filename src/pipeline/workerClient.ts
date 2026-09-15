import type { EffectInstance, RGB } from '../types';
import type { WorkerRequest, WorkerResponse } from './worker';
import { processImage } from './process';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (v: ImageData) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.error) {
        p.reject(new Error(msg.error));
        return;
      }
      const data = new Uint8ClampedArray(msg.buffer);
      p.resolve(new ImageData(new Uint8ClampedArray(data), msg.width, msg.height));
    };
    worker.onerror = (err) => {
      console.error('Worker error', err);
    };
  }
  return worker;
}

export interface ProcessInput {
  imageData: ImageData;
  algorithmId: string;
  palette: RGB[];
  scale: number;
  threshold: number;
  serpentine: boolean;
  preEffects: EffectInstance[];
  postEffects: EffectInstance[];
  sync?: boolean;
}

export function processAsync(input: ProcessInput): Promise<ImageData> {
  if (input.sync || typeof Worker === 'undefined') {
    const r = processImage({
      width: input.imageData.width,
      height: input.imageData.height,
      data: input.imageData.data,
      algorithmId: input.algorithmId,
      palette: input.palette,
      scale: input.scale,
      threshold: input.threshold,
      serpentine: input.serpentine,
      preEffects: input.preEffects,
      postEffects: input.postEffects,
    });
    return Promise.resolve(new ImageData(new Uint8ClampedArray(r.data), r.width, r.height));
  }

  const id = nextId++;
  const copy = new Uint8ClampedArray(input.imageData.data);
  const buffer = copy.buffer;
  const req: WorkerRequest = {
    id,
    width: input.imageData.width,
    height: input.imageData.height,
    buffer,
    algorithmId: input.algorithmId,
    palette: input.palette,
    scale: input.scale,
    threshold: input.threshold,
    serpentine: input.serpentine,
    preEffects: input.preEffects,
    postEffects: input.postEffects,
  };

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage(req, [buffer]);
  });
}
