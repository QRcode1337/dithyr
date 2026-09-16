import type { EffectStage, EffectType } from '../types';

export const EFFECT_COPY: Record<
  EffectType,
  { description: string; pre: string; post: string }
> = {
  'epsilon-glow': {
    description: 'Soft neighbor bloom \u2014 lifts midtones into a violet-adjacent haze.',
    pre: 'Pre: fatten values so the dither kernel has more midtones to chew. Glowy source, creamier grain.',
    post: 'Post: bloom already-quantized dots. Halos sit on top of the pattern instead of feeding it.',
  },
  'jpeg-glitch': {
    description: 'Block-quantize like a hostile JPEG. Macroblocks, banding, cheap-cam energy.',
    pre: 'Pre: the dither then tries to hide (or decorate) the 8-ish-pixel wounds.',
    post: 'Post: stamps blocks over the finished dither.',
  },
  'chromatic-aberration': {
    description: 'Splits red/blue off the green axis. Cheap lens fringe.',
    pre: 'Pre: the kernel dithers already-split channels.',
    post: 'Post: fringes the finished dots.',
  },
  'film-grain': {
    description: 'Luma hiss from a hash field. Analog pepper, not Bayer structure.',
    pre: 'Pre: extra noise for the kernel to quantize.',
    post: 'Post: hiss laid over locked palette colors.',
  },
  scanlines: {
    description: 'Darkens every Nth row. CRT / broadcast look.',
    pre: 'Pre: grain concentrates in the bright rows.',
    post: 'Post: classic overlay. Usually what you want.',
  },
  pixelate: {
    description: 'Averages cells. Mosaic crush.',
    pre: 'Pre: dither runs on already-blocked color.',
    post: 'Post: mosaics the finished dither.',
  },
  'contrast-brightness': {
    description: 'Pivot contrast around 128 and slide brightness.',
    pre: 'Pre: highest-leverage grade before quantize.',
    post: 'Post: grades locked swatches.',
  },
  'hue-shift': {
    description: 'Rotates hue and scales saturation in HSL.',
    pre: 'Pre: remaps which palette slot wins.',
    post: 'Post: spins already-chosen swatches.',
  },
};

export function describeEffect(type: EffectType, stage?: EffectStage): string {
  const copy = EFFECT_COPY[type];
  if (!copy) return '';
  if (stage === 'pre') return copy.pre;
  if (stage === 'post') return copy.post;
  return copy.description;
}
