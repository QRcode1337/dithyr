import { useEffect, useMemo, useState } from 'react';
import type { EffectInstance, Palette, RGB } from '../types';
import { ALGORITHMS } from '../dither/registry';
import { describeAlgorithm } from '../dither/algoCopy';
import { PaletteEditor } from './PaletteEditor';
import { EffectStack } from './EffectStack';
import { Section } from './Section';
import { Explain } from './Explain';

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
  { id: 'error-diffusion', label: 'Error Diffusion', help: 'Spreads quantization error to neighbors.' },
  { id: 'ordered', label: 'Ordered', help: 'Repeating threshold matrices \u2014 stable under animation.' },
  { id: 'threshold', label: 'Threshold / Noise', help: 'Per-pixel cuts and noise fields.' },
  { id: 'specialty', label: 'Dithyr Specialty', help: 'House recipes \u2014 weaves, spirals, meshes.' },
] as const;

type SectionKey = 'algorithm' | 'scale' | 'palette' | 'pre' | 'post';
const DEFAULT_OPEN: Record<SectionKey, boolean> = { algorithm: true, scale: true, palette: true, pre: true, post: true };
const OPEN_STORAGE_KEY = 'dithyr.inspector.open.v1';

function loadOpen(): Record<SectionKey, boolean> {
  try {
    const raw = localStorage.getItem(OPEN_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OPEN };
    return { ...DEFAULT_OPEN, ...(JSON.parse(raw) as Partial<Record<SectionKey, boolean>>) };
  } catch {
    return { ...DEFAULT_OPEN };
  }
}

export function Inspector(props: InspectorProps) {
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [open, setOpen] = useState<Record<SectionKey, boolean>>(loadOpen);

  useEffect(() => {
    try { localStorage.setItem(OPEN_STORAGE_KEY, JSON.stringify(open)); } catch { /* ignore */ }
  }, [open]);

  const toggle = (key: SectionKey) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALGORITHMS.filter((a) => {
      if (catFilter !== 'all' && a.category !== catFilter) return false;
      if (!q) return true;
      const copy = describeAlgorithm(a.id, a.description);
      return a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || copy.toLowerCase().includes(q);
    });
  }, [query, catFilter]);

  const grouped = useMemo(
    () => CATEGORIES.map((cat) => ({ ...cat, items: filtered.filter((a) => a.category === cat.id) })).filter((g) => g.items.length > 0),
    [filtered]
  );

  const selected = useMemo(() => ALGORITHMS.find((a) => a.id === props.algorithmId) ?? ALGORITHMS[0], [props.algorithmId]);
  const selectedCopy = describeAlgorithm(selected.id, selected.description);
  const selectedCat = CATEGORIES.find((c) => c.id === selected.category);

  return (
    <aside className="inspector">
      <div className="inspector-scroll">
        <Section id="algorithm" title="Algorithm" open={open.algorithm} onToggle={() => toggle('algorithm')} badge={<span className="chip">{props.algorithmCount}</span>}>
          <div className="algo-toolbar">
            <input className="search-input" type="search" placeholder="Search algorithms\u2026" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search algorithms" />
            <div className="seg-tabs" role="tablist" aria-label="Algorithm category">
              <button type="button" className={`seg-tab${catFilter === 'all' ? ' is-active' : ''}`} onClick={() => setCatFilter('all')}>All</button>
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button" className={`seg-tab${catFilter === c.id ? ' is-active' : ''}`} onClick={() => setCatFilter(c.id)} title={c.help}>{c.label.split(' ')[0]}</button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Dither method</span>
            <select value={props.algorithmId} onChange={(e) => props.onAlgorithm(e.target.value)}>
              {grouped.map((cat) => (
                <optgroup key={cat.id} label={cat.label}>
                  {cat.items.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <Explain label={selected.name}>
            <p className="algo-description">{selectedCopy}</p>
            {selectedCat && <p className="hint-muted">{selectedCat.help}</p>}
          </Explain>
          {filtered.length === 0 && <p className="hint-muted">No algorithms match \u201c{query}\u201d.</p>}
        </Section>
        <Section id="scale" title="Scale & threshold" open={open.scale} onToggle={() => toggle('scale')}>
          <label className="field"><span>Pixel scale<span className="field-value">{props.scale}\u00d7</span></span><input type="range" min={1} max={16} step={1} value={props.scale} onChange={(e) => props.onScale(Number(e.target.value))} /></label>
          <label className="field"><span>Threshold<span className="field-value">{props.threshold.toFixed(2)}</span></span><input type="range" min={0} max={1} step={0.01} value={props.threshold} onChange={(e) => props.onThreshold(Number(e.target.value))} /></label>
          <Explain label="About scale">
            <p className="algo-description">Scale runs before the kernel: downsample, quantize, nearest-neighbor back up. Threshold is the cut for threshold/noise methods; error diffusion mostly ignores it.</p>
          </Explain>
        </Section>
        <PaletteEditor paletteId={props.paletteId} customPalette={props.customPalette} activeColors={props.activeColors} onSelectBuiltin={props.onSelectBuiltin} onCustomChange={props.onCustomChange} onExtract={props.onExtract} open={open.palette} onToggle={() => toggle('palette')} />
        <EffectStack stage="pre" effects={props.preEffects} onChange={props.onPreEffects} open={open.pre} onToggle={() => toggle('pre')} />
        <EffectStack stage="post" effects={props.postEffects} onChange={props.onPostEffects} open={open.post} onToggle={() => toggle('post')} />
      </div>
    </aside>
  );
}
