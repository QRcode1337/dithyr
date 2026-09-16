import type { EffectInstance, EffectStage } from '../types';
import { EFFECT_META, createEffect } from '../effects/effects';
import { EFFECT_COPY, describeEffect } from '../effects/effectCopy';
import { Section } from './Section';

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
      ? 'Run on the source, before scale + dither. Shape luminance, color, and damage the kernel will digest.'
      : 'Run after palette quantize. Finish the look without changing which swatch won.';
  return (
    <Section id={stage === 'pre' ? 'pre-effects' : 'post-effects'} title={title} open={open} onToggle={onToggle} badge={<span className="chip">{effects.length}</span>}>
      <article className="explain-card"><p className="algo-description">{stageHint}</p></article>
      {effects.length === 0 && <p className="hint-muted">Empty stack \u2014 add an effect below. Order is top \u2192 bottom.</p>}
      {effects.map((e, i) => {
        const meta = EFFECT_META.find((m) => m.type === e.type)!;
        const blurb = describeEffect(e.type, stage);
        return (
          <div key={e.id} className={`effect-item${e.enabled ? '' : ' is-disabled'}`}>
            <div className="effect-item-header">
              <span className="drag-handle" aria-hidden>\u283F</span>
              <input type="checkbox" checked={e.enabled} onChange={(ev) => update(e.id, { enabled: ev.target.checked })} aria-label={`Enable ${meta.name}`} />
              <div className="effect-title-block">
                <strong>{meta.name}</strong>
                {blurb && <span className="effect-blurb">{blurb}</span>}
              </div>
              <span className={`badge${e.enabled ? ' badge-on' : ' badge-off'}`}>{e.enabled ? 'on' : 'off'}</span>
              <div className="effect-actions">
                <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0}>\u2191</button>
                <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === effects.length - 1}>\u2193</button>
                <button type="button" className="icon-btn danger" onClick={() => remove(e.id)}>\u2715</button>
              </div>
            </div>
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
          <option value="" disabled>Choose\u2026</option>
          {EFFECT_META.map((m) => <option key={m.type} value={m.type} title={describeEffect(m.type, stage)}>{m.name}</option>)}
        </select>
      </label>
      <ul className="effect-catalog">
        {EFFECT_META.map((m) => (
          <li key={m.type}>
            <button type="button" className="effect-catalog-add" onClick={() => add(m.type)}>+ {m.name}</button>
            <span className="hint-muted">{EFFECT_COPY[m.type].description}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
