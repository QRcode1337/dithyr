import { useMemo, useState } from 'react';
import type { EffectInstance, Palette, RGB } from '../types';
import { ALGORITHMS } from '../dither/registry';
import { PaletteEditor } from './PaletteEditor';
import { EffectStack } from './EffectStack';
import { Section } from './Section';

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
  {
    id: 'error-diffusion',
    label: 'Error Diffusion',
    help: 'Spreads quantization error to neighbors — organic photo grain.',
  },
  {
    id: 'ordered',
    label: 'Ordered',
    help: 'Repeating threshold matrices — stable patterns and screens.',
  },
  {
    id: 'threshold',
    label: 'Threshold / Noise',
    help: 'Per-pixel cuts and noise fields — posterize to sparkle.',
  },
  {
    id: 'specialty',
    label: 'Dithyr Specialty',
    help: 'House recipes — weaves, spirals, meshes, and experimental grain.',
  },
] as const;

type SectionKey = 'algorithm' | 'scale' | 'palette' | 'pre' | 'post';

export function Inspector(props: InspectorProps) {
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    algorithm: true,
    scale: true,
    palette: true,
    pre: false,
    post: false,
  });

  const toggle = (key: SectionKey) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALGORITHMS.filter((a) => {
      if (catFilter !== 'all' && a.category !== catFilter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        (a.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [query, catFilter]);

  const grouped = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: filtered.filter((a) => a.category === cat.id),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const selected = useMemo(
    () => ALGORITHMS.find((a) => a.id === props.algorithmId) ?? ALGORITHMS[0],
    [props.algorithmId]
  );

  const activeCatHelp =
    catFilter === 'all'
      ? null
      : CATEGORIES.find((c) => c.id === catFilter)?.help;

  return (
    <aside className="inspector">
      <div className="inspector-scroll">
        <Section
          id="algorithm"
          title="Algorithm"
          open={open.algorithm}
          onToggle={() => toggle('algorithm')}
          badge={<span className="chip">{props.algorithmCount}</span>}
        >
          <div className="algo-toolbar">
            <input
              className="search-input"
              type="search"
              placeholder="Search algorithms…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search algorithms"
            />
            <div className="seg-tabs" role="tablist" aria-label="Algorithm category">
              <button
                type="button"
                className={`seg-tab${catFilter === 'all' ? ' is-active' : ''}`}
                onClick={() => setCatFilter('all')}
                title="Show every algorithm"
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`seg-tab${catFilter === c.id ? ' is-active' : ''}`}
                  onClick={() => setCatFilter(c.id)}
                  title={c.help}
                >
                  {c.label.split(' ')[0]}
                </button>
              ))}
            </div>
            {activeCatHelp && <p className="hint-muted">{activeCatHelp}</p>}
          </div>

          <label className="field">
            <span>Dither method</span>
            <select
              value={props.algorithmId}
              onChange={(e) => props.onAlgorithm(e.target.value)}
            >
              {grouped.map((cat) => (
                <optgroup key={cat.id} label={cat.label}>
                  {cat.items.map((a) => (
                    <option key={a.id} value={a.id} title={a.description}>
                      {a.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {selected?.description && (
            <p className="algo-description" title={selected.description}>
              {selected.description}
            </p>
          )}

          {filtered.length === 0 && (
            <p className="hint-muted">No algorithms match “{query}”.</p>
          )}
        </Section>

        <Section
          id="scale"
          title="Scale & threshold"
          open={open.scale}
          onToggle={() => toggle('scale')}
        >
          <label className="field">
            <span>
              Pixel scale
              <span className="field-value">{props.scale}×</span>
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
              <span className="field-value">{props.threshold.toFixed(2)}</span>
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
          <p className="hint-muted">
            Scale downsamples before dither, then nearest-upsamples — resolution stays, grain grows.
          </p>
        </Section>

        <PaletteEditor
          paletteId={props.paletteId}
          customPalette={props.customPalette}
          activeColors={props.activeColors}
          onSelectBuiltin={props.onSelectBuiltin}
          onCustomChange={props.onCustomChange}
          onExtract={props.onExtract}
          open={open.palette}
          onToggle={() => toggle('palette')}
        />

        <EffectStack
          stage="pre"
          effects={props.preEffects}
          onChange={props.onPreEffects}
          open={open.pre}
          onToggle={() => toggle('pre')}
        />
        <EffectStack
          stage="post"
          effects={props.postEffects}
          onChange={props.onPostEffects}
          open={open.post}
          onToggle={() => toggle('post')}
        />
      </div>
    </aside>
  );
}
