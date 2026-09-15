import type { EffectInstance, Palette, RGB } from '../types';
import { ALGORITHMS } from '../dither/registry';
import { PaletteEditor } from './PaletteEditor';
import { EffectStack } from './EffectStack';

interface InspectorProps {
  algorithmId: string;
  onAlgorithm: (id: string) => void;
  paletteId: string;
  customPalette: Palette | null;
  activeColors: RGB[];
  onSelectBuiltin: (id: string) => void;
  onCustomChange: (p: Palette) => void;
  onExtract: (method: 'median-cut' | 'k-means') => void;
  scale: number;
  onScale: (v: number) => void;
  threshold: number;
  onThreshold: (v: number) => void;
  preEffects: EffectInstance[];
  postEffects: EffectInstance[];
  onPreEffects: (e: EffectInstance[]) => void;
  onPostEffects: (e: EffectInstance[]) => void;
  algorithmCount: number;
}

const CATEGORIES = [
  { id: 'error-diffusion', label: 'Error Diffusion' },
  { id: 'ordered', label: 'Ordered' },
  { id: 'threshold', label: 'Threshold / Noise' },
  { id: 'specialty', label: 'Dithyr Specialty' },
] as const;

export function Inspector(props: InspectorProps) {
  return (
    <aside className="inspector">
      <div className="section">
        <div className="section-header">
          Algorithm <span className="chip">{props.algorithmCount}</span>
        </div>
        <div className="section-body">
          <label className="field">
            <span>Dither method</span>
            <select
              value={props.algorithmId}
              onChange={(e) => props.onAlgorithm(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <optgroup key={cat.id} label={cat.label}>
                  {ALGORITHMS.filter((a) => a.category === cat.id).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="field">
            <span>
              Pixel scale
              <span>{props.scale}×</span>
            </span>
            <input
              type="range"
              min={1}
              max={16}
              step={1}
              value={props.scale}
              onChange={(e) => props.onScale(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>
              Threshold
              <span>{props.threshold.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={props.threshold}
              onChange={(e) => props.onThreshold(Number(e.target.value))}
            />
          </label>
          <p className="status" style={{ margin: 0 }}>
            Scale downsamples before dither, then nearest-upsamples — resolution stays, grain grows.
          </p>
        </div>
      </div>

      <PaletteEditor
        paletteId={props.paletteId}
        customPalette={props.customPalette}
        activeColors={props.activeColors}
        onSelectBuiltin={props.onSelectBuiltin}
        onCustomChange={props.onCustomChange}
        onExtract={props.onExtract}
      />

      <EffectStack
        stage="pre"
        effects={props.preEffects}
        onChange={props.onPreEffects}
      />
      <EffectStack
        stage="post"
        effects={props.postEffects}
        onChange={props.onPostEffects}
      />
    </aside>
  );
}
