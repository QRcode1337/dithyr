import type { EffectInstance, EffectStage } from '../types';
import { EFFECT_META, createEffect } from '../effects/effects';
import { describeEffect } from '../effects/effectCopy';
import { Section } from './Section';
import { Explain } from './Explain';

interface EffectStackProps {
  stage: EffectStage;
  effects: EffectInstance[];
  onChange: (effects: EffectInstance[]) => void;
  open: boolean;
  onToggle: () => void;
}

export function EffectStack({ stage, effects, onChange, open, onToggle }: EffectStackProps) {
  const add = (type: EffectInstance['type']) => onChange([...effects, createEffect(type)]);
  const update = (id: string, patch: Partial<EffectInstance>) =>
    onChange(effects.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const updateParam = (id: string, key: string, value: number) =>
    onChange(effects.map((e) => (e.id === id ? { ...e, params: { ...e.params, [key]: value } } : e)));
  const remove = (id: string) => onChange(effects.filter((e) => e.id !== id));
  const move = (index: number, dir: -1 | 1) => {
    const next = [...effects];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };
  const title = stage === 'pre' ? 'Pre-effects' : 'Post-effects';
  const stageHint =
    stage === 'pre'
      ? 'Runs on the source before scale + dither.'
      : 'Runs after palette quantize. Finishes the look.';
  return (
    <Section id={stage === 'pre' ? 'pre-effects' : 'post-effects'} title={title} open={open} onToggle={onToggle} badge={<span className="chip">{effects.length}</span>}>
      {effects.map((e, i) => {
        const meta = EFFECT_META.find((m) => m.type === e.type)!;
        const blurb = describeEffect(e.type, stage);
        return (
          <div key={e.id} className={`effect-item${e.enabled ? '' : ' is-disabled'}`}>
            <div className="effect-item-header">
              <input type="checkbox" checked={e.enabled} onChange={(ev) => update(e.id, { enabled: ev.target.checked })} aria-label={`Enable ${meta.name}`} />
              <strong>{meta.name}</strong>
              <span className={`badge${e.enabled ? ' badge-on' : ' badge-off'}`}>{e.enabled ? 'on' : 'off'}</span>
              <div className="effect-actions">
                <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0}>\u2191</button>
                <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === effects.length - 1}>\u2193</button>
                <button type="button" className="icon-btn danger" onClick={() => remove(e.id)}>\u2715</button>
              </div>
            </div>
            {blurb && <Explain label="About">{blurb}</Explain>}
            {e.enabled && meta.params.map((p) => (
              <label key={p.key} className="field">
                <span>{p.label}<span className="field-value">{Number(e.params[p.key] ?? p.min).toFixed(p.step < 1 ? 2 : 0)}</span></span>
                <input type="range" min={p.min} max={p.max} step={p.step} value={e.params[p.key] ?? p.min} onChange={(ev) => updateParam(e.id, p.key, Number(ev.target.value))} />
              </label>
            ))}
          </div>
        );
      })}
      <label className="field">
        <span>Add effect</span>
        <select defaultValue="" onChange={(ev) => { if (ev.target.value) { add(ev.target.value as EffectInstance['type']); ev.target.value = ''; } }}>
          <option value="" disabled>Choose...</option>
          {EFFECT_META.map((m) => <option key={m.type} value={m.type}>{m.name}</option>)}
        </select>
      </label>
      <Explain label={stage === 'pre' ? 'About pre-effects' : 'About post-effects'}>{stageHint}</Explain>
    </Section>
  );
}
