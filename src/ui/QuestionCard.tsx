import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { answer } from '../core/session';
import { impactBetween, sameValue } from '../core/impact';
import { ids, statusText, type Qid, type Session, type Value } from '../core/types';
import { formatValue, questions, recommendation } from '../domain/website';
import { draftChanged, draftFromValue, readDraft, type QuestionDraft } from './draft';
import { ImpactSummary } from './ImpactSummary';
import { Icon } from './Icon';

interface Props {
  session: Session; id: Qid; draft: QuestionDraft; mode?: 'guide' | 'edit';
  onDraft: (draft: QuestionDraft) => void; onAnswer: (id: Qid, value: Value) => string | null;
  onPrevious?: () => void; canPrevious?: boolean; onCancel?: () => void;
  active?: boolean; focusKey?: number; onFocus?: (element: HTMLElement) => void;
}
export function QuestionCard({ session, id, draft, mode = 'guide', onDraft, onAnswer, onPrevious,
  canPrevious, onCancel, active = true, focusKey = 0, onFocus }: Props) {
  const q = questions[id], a = session.project.answers[id], n = session.result.nodes[id];
  const rec = recommendation(session.project.seed, id);
  const parsed = readDraft(id, draft);
  const dirty = draftChanged(id, draft, a.value);
  const needsConfirmation = a.source.type !== 'user' || n.status === 'stale';
  const [error, setError] = useState('');
  const [errorFocus, setErrorFocus] = useState<number | 'other' | 'choices' | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const prefix = `${mode}-${id}`;
  // Move focus only on an explicit step transition/mount, not when a draft changes.
  useLayoutEffect(() => {
    if (active) {
      title.current?.focus({ preventScroll: true });
      if (mode === 'guide') title.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [id, focusKey]);
  const preview = useMemo(() => {
    const value = readDraft(id, draft);
    if (!value.ok || (!dirty && !needsConfirmation)) return null;
    try {
      // Preview stays in memory. It cannot write sources, logs or storage.
      return impactBetween(session, answer(session, id, value.value, session.project.createdAt), id);
    } catch { return null; }
  }, [session, id, draft, dirty, needsConfirmation]);
  function update(next: QuestionDraft) { setError(''); setErrorFocus(null); onDraft(next); }
  function pick(option: string) {
    const choices = Array.isArray(draft.choice) ? draft.choice : [];
    update({ ...draft, mode: 'answer', choice: q.kind === 'single' ? option
      : choices.includes(option) ? choices.filter(v => v !== option) : [...choices, option] });
  }
  function submit() {
    const value = readDraft(id, draft);
    if (!value.ok) {
      setError(value.error); setErrorFocus(value.focus);
      requestAnimationFrame(() => {
        const selector = typeof value.focus === 'number' ? `[data-range="${value.focus}"]`
          : value.focus === 'other' ? 'textarea' : 'fieldset input';
        form.current?.querySelector<HTMLElement>(selector)?.focus();
      });
      return;
    }
    const failure = onAnswer(id, value.value);
    if (failure) setError(failure);
  }
  const recommendationSelected = parsed.ok && sameValue(parsed.value, rec.value);
  return <section className={`card question ${mode === 'edit' ? 'editing' : ''}`} aria-label={mode === 'edit' ? '修改决策' : '关键问题卡'}>
    <div className="cardhead"><span className="iconbox violet"><Icon name="branch"/></span>
      <h2>{mode === 'edit' ? `修改：${q.label}` : '当前关键问题'}</h2>
      <span className="token">{q.kind === 'multi' ? '可多选' : q.kind === 'range' ? '区间' : '单选'}</span>
      {onCancel && <button type="button" className="iconbutton" aria-label="取消修改" onClick={onCancel}><Icon name="x" size={18}/></button>}
    </div>
    <form ref={form} onFocusCapture={e => onFocus?.(e.target as HTMLElement)} onSubmit={event => { event.preventDefault(); submit(); }}>
      <div className="questionbody">
        <div className="kicker">{q.label} <span> / Q{String(ids.indexOf(id) + 1).padStart(2, '0')}</span></div>
        <h3 ref={title} tabIndex={-1} id={`${prefix}-title`} data-dialog-focus>{q.prompt}</h3>
        <p className="muted" id={`${prefix}-hint`}>{q.hint}</p>
        <p className="applied-answer"><span className={`token status-${n.status}`}>{statusText[n.status]}</span><b>{n.status === 'stale' ? '保留的原答：' : '已应用：'}</b>{formatValue(id, a.value)}</p>
        <div className="suggest"><Icon name="spark" size={16}/><div><b>系统建议</b> {formatValue(id, rec.value)}<small>{rec.reason}</small></div>
          {recommendationSelected ? <span className="suggest-match">与选项一致</span> : <button type="button" className="textbutton" onClick={() => update(draftFromValue(rec.value))}>填入建议</button>}
        </div>
        <p className="selectionsource">选项预填不代表用户确认。选择只改变草稿，{mode === 'edit' ? '应用修改' : '确认并继续'}后自动重算。</p>
        <fieldset aria-describedby={`${prefix}-hint${error ? ` ${prefix}-error` : ''}`}>
          <legend className="sr">{q.prompt}</legend>
          {q.options.map(o => {
            const selected = draft.mode === 'answer' && (draft.choice === o.id || (Array.isArray(draft.choice) && draft.choice.includes(o.id)));
            return <label className={`option ${selected ? 'selected' : ''}`} key={o.id}>
              <input type={q.kind === 'multi' ? 'checkbox' : 'radio'} name={prefix} checked={selected} onChange={() => pick(o.id)}/>
              <span><b>{o.label}</b><small>{o.explanation}</small></span>
            </label>;
          })}
          {id === 'limits' && <label className={`option ${draft.mode === 'answer' && Array.isArray(draft.choice) && !draft.choice.length ? 'selected' : ''}`}>
            <input type="checkbox" checked={draft.mode === 'answer' && Array.isArray(draft.choice) && !draft.choice.length} onChange={() => update({ ...draft, mode: 'answer', choice: [] })}/><b>没有额外限制</b>
          </label>}
          {q.kind === 'range' && <div className="band">{['目标下限', '目标上限', '可容忍上限'].map((label, i) => <label key={label}>{label}
            <input aria-label={label} aria-invalid={errorFocus === i || undefined} aria-describedby={error ? `${prefix}-error` : undefined} data-range={i}
              type="number" min="0" step="any" value={draft.range[i]} onChange={e => {
                const range = [...draft.range] as QuestionDraft['range']; range[i] = e.target.value;
                update({ ...draft, mode: 'answer', range });
              }}/>
          </label>)}</div>}
        </fieldset>
        <div className="alternatives">
          <button type="button" aria-pressed={draft.mode === 'unknown'} className={draft.mode === 'unknown' ? 'selected' : ''} onClick={() => update({ ...draft, mode: 'unknown' })}>尚不确定</button>
          <button type="button" aria-expanded={draft.mode === 'other'} aria-pressed={draft.mode === 'other'} className={draft.mode === 'other' ? 'selected' : ''} onClick={() => update({ ...draft, mode: draft.mode === 'other' ? 'answer' : 'other' })}>其他情况</button>
        </div>
        {draft.mode === 'other' && <label className="field">补充实际情况<textarea maxLength={500} value={draft.other} aria-invalid={errorFocus === 'other' || undefined}
          aria-describedby={error ? `${prefix}-error` : undefined} onChange={e => update({ ...draft, other: e.target.value })}/><small>作为待核对条件保留，不擅自推断为已有选项。</small></label>}
        {error && <p role="alert" id={`${prefix}-error`} className="error">{error}</p>}
        {preview && <ImpactSummary impact={preview} preview/>}
        {!parsed.ok && dirty && !error && <p className="draft-hint">填完有效答案后，会显示应用前的影响预览。</p>}
        <details className="answer-source"><summary>当前答案的来源与理由</summary><p>{n.reason}</p><small>{n.source} · 规则包 {session.project.domainPackVersion} · {a.updatedAt}</small></details>
      </div>
      <div className="questionfoot">
        <div className="questionfoot-left">
          {mode === 'guide' && onPrevious && <button type="button" className="secondary" disabled={!canPrevious} onClick={onPrevious}><Icon name="arrow" size={15} style={{ transform: 'rotate(180deg)' }}/> 上一题</button>}
          {onCancel && <button type="button" className="secondary" onClick={onCancel}>取消</button>}
          <small>{dirty ? '有未应用修改' : needsConfirmation ? '尚未确认' : '与已应用答案一致'}</small>
        </div>
        <button type="submit" className="primary" disabled={mode === 'edit' && !dirty && !needsConfirmation}>
          {mode === 'edit' ? '应用修改' : !dirty && !needsConfirmation ? '继续下一题' : '确认并继续'} <Icon name="arrow" size={16}/>
        </button>
      </div>
    </form>
  </section>;
}
