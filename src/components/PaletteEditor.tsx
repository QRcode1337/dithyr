import type { Palette, RGB } from '../types';
import { BUILTIN_PALETTES, exportPaletteJson, importPaletteJson } from '../dither/palettes';
import { downloadJson } from '../utils/export';
import { Section } from './Section';

interface PaletteEditorProps {
  paletteId: string;
  customPalette: Palette | null;
  activeColors: RGB[];
  onSelectBuiltin: (id: string) => void;
  onCustomChange: (palette: Palette) => void;
  onExtract: (method: 'median-cut' | 'k-means') => void;
  open: boolean;
  onToggle: () => void;
}
function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function PaletteEditor({ paletteId, customPalette, activeColors, onSelectBuiltin, onCustomChange, onExtract, open, onToggle }: PaletteEditorProps) {
  const working: Palette = customPalette ?? BUILTIN_PALETTES.find((p) => p.id === paletteId) ?? BUILTIN_PALETTES[0];
  const ensureCustom = (colors: RGB[], name?: string): Palette => {
    const p: Palette = { id: customPalette?.id ?? `custom-${Date.now()}`, name: name ?? (customPalette?.name || working.name + ' (edit)'), colors };
    onCustomChange(p);
    return p;
  };
  return (
    <Section id="palette" title="Palette" open={open} onToggle={onToggle} badge={<span className="chip">{activeColors.length} swatches</span>}>
      <article className="explain-card"><p className="algo-description">Every dithered pixel lands on one of these colors. Fewer swatches = harsher pattern. Extract pulls 8 colors from the current frame.</p></article>
      <label className="field"><span>Built-in</span>
        <select value={customPalette ? 'custom' : paletteId} onChange={(e) => { if (e.target.value !== 'custom') onSelectBuiltin(e.target.value); }}>
          {BUILTIN_PALETTES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          {customPalette && <option value="custom">{customPalette.name}</option>}
        </select>
      </label>
      <div className="swatches">
        {activeColors.map((c, i) => (
          <button key={i} type="button" className="swatch" style={{ background: rgbToHex(c) }} title={rgbToHex(c)}>
            <input type="color" value={rgbToHex(c)} onChange={(e) => { const next = [...activeColors]; next[i] = hexToRgb(e.target.value); ensureCustom(next); }} />
          </button>
        ))}
        <button type="button" className="swatch swatch-add" onClick={() => ensureCustom([...activeColors, [157, 129, 225]])}>+</button>
      </div>
      <div className="row">
        <button type="button" className="btn btn-block" onClick={() => onExtract('median-cut')}>Extract \u00b7 median-cut</button>
        <button type="button" className="btn btn-block" onClick={() => onExtract('k-means')}>Extract \u00b7 k-means</button>
      </div>
      <p className="hint-muted">Median-cut is the safer historian. K-means chases dominant hues.</p>
      <div className="row">
        <button type="button" className="btn btn-block" onClick={() => downloadJson(exportPaletteJson({ ...working, colors: activeColors }), 'palette.json')}>Export JSON</button>
        <button type="button" className="btn btn-block" onClick={() => {
          const input = document.createElement('input');
          input.type = 'file'; input.accept = 'application/json,.json';
          input.onchange = async () => { const file = input.files?.[0]; if (!file) return; onCustomChange(importPaletteJson(await file.text())); };
          input.click();
        }}>Import JSON</button>
      </div>
    </Section>
  );
}
