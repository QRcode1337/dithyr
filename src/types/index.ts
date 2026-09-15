export type RGB = [number, number, number];

export interface Palette {
  id: string;
  name: string;
  colors: RGB[];
}

export interface DitherAlgorithm {
  id: string;
  name: string;
  category: 'error-diffusion' | 'ordered' | 'threshold' | 'specialty';
  description?: string;
}

export type EffectType =
  | 'epsilon-glow'
  | 'jpeg-glitch'
  | 'chromatic-aberration'
  | 'film-grain'
  | 'scanlines'
  | 'pixelate'
  | 'contrast-brightness'
  | 'hue-shift';

export interface EffectInstance {
  id: string;
  type: EffectType;
  enabled: boolean;
  params: Record<string, number>;
}

export type EffectStage = 'pre' | 'post';

export interface PipelineSettings {
  algorithmId: string;
  paletteId: string;
  customPalette: Palette | null;
  scale: number;
  threshold: number;
  serpentine: boolean;
  preEffects: EffectInstance[];
  postEffects: EffectInstance[];
}

export interface ProcessRequest {
  width: number;
  height: number;
  imageData: ArrayBuffer;
  settings: PipelineSettings;
  paletteColors: RGB[];
}

export interface ProcessResponse {
  width: number;
  height: number;
  imageData: ArrayBuffer;
}

export type MediaKind = 'image' | 'video' | 'gif';

export interface LoadedMedia {
  kind: MediaKind;
  name: string;
  width: number;
  height: number;
  imageData: ImageData;
  videoEl?: HTMLVideoElement;
  duration?: number;
  currentTime?: number;
}
