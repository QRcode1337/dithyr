import { processImage } from './process';
import type { EffectInstance, RGB } from '../types';

export interface WorkerRequest {
  id: number;
  width: number;
  height: number;
  buffer: ArrayBuffer;
  algorithmId: string;
  palette: RGB[];
  scale: number;
  threshold: number;
  serpentine: boolean;
  preEffects: EffectInstance[];
  postEffects: EffectInstance[];
}

export interface WorkerResponse {
  id: number;
  width: number;
  height: number;
  buffer: ArrayBuffer;
  error?: string;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  try {
    const data = new Uint8ClampedArray(msg.buffer);
    const result = processImage({
      width: msg.width,
      height: msg.height,
      data,
      algorithmId: msg.algorithmId,
      palette: msg.palette,
      scale: msg.scale,
      threshold: msg.threshold,
      serpentine: msg.serpentine,
      preEffects: msg.preEffects,
      postEffects: msg.postEffects,
    });
    const copy = new Uint8ClampedArray(result.data);
    const buffer = copy.buffer;
    const response: WorkerResponse = {
      id: msg.id,
      width: result.width,
      height: result.height,
      buffer,
    };
    (self as unknown as Worker).postMessage(response, [buffer]);
  } catch (err) {
    const response: WorkerResponse = {
      id: msg.id,
      width: msg.width,
      height: msg.height,
      buffer: new ArrayBuffer(0),
      error: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(response);
  }
};
