import type { Palette, RGB } from '../types';
import { BUILTIN_PALETTES, exportPaletteJson, importPaletteJson } from '../dither/palettes';
import { downloadJson } from '../utils/export';

interface PaletteEditorProps {
  paletteId: string;
  customPalette: Palette | null;
  activeColors: RGB[];
  onSelectBuiltin: (id: string) => void;
  onCustomChange: (palette: Palette) => void;
  onExtract: (method: 'median-cut' | 'k-means') => void;
}

function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function PaletteEditor({
  paletteId,
  customPalette,
  activeColors,
  onSelectBuiltin,
  onCustomChange,
  onExtract,
}: PaletteEditorProps) {
  const working: Palette =
    customPalette ??
    BUILTIN_PALETTES.find((p) => p.id === paletteId) ??
    BUILTIN_PALETTES[0];

  const ensureCustom = (colors: RGB[], name?: string): Palette => {
    const p: Palette = {
      id: customPalette?.id ?? `custom-${Date.now()}`,
      name: name ?? (customPalette?.name || working.name + ' (edit)'),
      colors,
    };
    onCustomChange(p);
    return p;
  };

  return (
    <div className="section">
      <div className="section-header">Palette</div>
      <div className="section-body">
        <label className="field">
          <span>Built-in</span>
          <select
            value={customPalette ? 'custom' : paletteId}
            onChange={(e) => {
              if (e.target.value === 'custom') return;
              onSelectBuiltin(e.target.value);
            }}
          >
            {BUILTIN_PALETTES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            {customPalette && <option value="custom">{customPalette.name}</option>}
          </select>
        </label>

        <div className="swatches">
          {activeColors.map((c, i) => (
            <button
              key={i}
              type="button"
              className="swatch"
              style={{ background: rgbToHex(c) }}
              title={rgbToHex(c)}
            >
              <input
                type="color"
                value={rgbToHex(c)}
                onChange={(e) => {
                  const next = [...activeColors];
                  next[i] = hexToRgb(e.target.value);
                  ensureCustom(next);
                }}
              />
            </button>
          ))}
          <button
            type="button"
            className="btn"
            style={{ padding: '4px 8px' }}
            onClick={() => ensureCustom([...activeColors, [128, 128, 128]])}
          >
            +
          </button>
        </div>

        <div className="row">
          <button type="button" className="btn" onClick={() => onExtract('median-cut')}>
            Extract (median-cut)
          </button>
          <button type="button" className="btn" onClick={() => onExtract('k-means')}>
            Extract (k-means)
          </button>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={() =>
              downloadJson(exportPaletteJson({ ...working, colors: activeColors }), 'palette.json')
            }
          >
            Export JSON
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'application/json,.json';
              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                const text = await file.text();
                onCustomChange(importPaletteJson(text));
              };
              input.click();
            }}
          >
            Import JSON
          </button>
        </div>
      </div>
    </div>
  );
}
