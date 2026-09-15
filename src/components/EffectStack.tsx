import type { EffectInstance, EffectStage } from '../types';
import { EFFECT_META, createEffect } from '../effects/effects';

interface EffectStackProps {
  stage: EffectStage;
  effects: EffectInstance[];
  onChange: (effects: EffectInstance[]) => void;
}

export function EffectStack({ stage, effects, onChange }: EffectStackProps) {
  const add = (type: EffectInstance['type']) => {
    onChange([...effects, createEffect(type)]);
  };

  const update = (id: string, patch: Partial<EffectInstance>) => {
    onChange(effects.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const updateParam = (id: string, key: string, value: number) => {
    onChange(
      effects.map((e) =>
        e.id === id ? { ...e, params: { ...e.params, [key]: value } } : e
      )
    );
  };

  const remove = (id: string) => onChange(effects.filter((e) => e.id !== id));

  const move = (index: number, dir: -1 | 1) => {
    const next = [...effects];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };

  return (
    <div className="section">
      <div className="section-header">
        {stage === 'pre' ? 'Pre-effects' : 'Post-effects'}
      </div>
      <div className="section-body">
        {effects.map((e, i) => {
          const meta = EFFECT_META.find((m) => m.type === e.type)!;
          return (
            <div key={e.id} className="effect-item">
              <div className="effect-item-header">
                <input
                  type="checkbox"
                  checked={e.enabled}
                  onChange={(ev) => update(e.id, { enabled: ev.target.checked })}
                />
                <strong>{meta.name}</strong>
                <button type="button" className="icon-btn" onClick={() => move(i, -1)} title="Up">
                  ↑
                </button>
                <button type="button" className="icon-btn" onClick={() => move(i, 1)} title="Down">
                  ↓
                </button>
                <button type="button" className="icon-btn" onClick={() => remove(e.id)} title="Remove">
                  ✕
                </button>
              </div>
              {meta.params.map((p) => (
                <label key={p.key} className="field">
                  <span>
                    {p.label}
                    <span>{e.params[p.key] ?? p.min}</span>
                  </span>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={e.params[p.key] ?? p.min}
                    onChange={(ev) => updateParam(e.id, p.key, Number(ev.target.value))}
                  />
                </label>
              ))}
            </div>
          );
        })}
        <label className="field">
          <span>Add effect</span>
          <select
            defaultValue=""
            onChange={(ev) => {
              if (ev.target.value) {
                add(ev.target.value as EffectInstance['type']);
                ev.target.value = '';
              }
            }}
          >
            <option value="" disabled>
              Choose…
            </option>
            {EFFECT_META.map((m) => (
              <option key={m.type} value={m.type}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
