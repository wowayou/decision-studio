import { isBand, isOther, type Qid, type Value } from '../core/types';
import { sameValue } from '../core/impact';
import { validValue } from '../domain/validation';
import { questions } from '../domain/website';

export interface QuestionDraft {
  mode: 'answer' | 'unknown' | 'other'; choice: Value; other: string; range: [string, string, string];
}
export function draftFromValue(value: Value): QuestionDraft {
  return { mode: value === null ? 'unknown' : isOther(value) ? 'other' : 'answer',
    choice: structuredClone(value), other: isOther(value) ? value.other : '',
    range: isBand(value) ? [String(value.min), String(value.target), String(value.max)] : ['', '', ''] };
}
export type DraftValue = { ok: true; value: Value } | { ok: false; error: string; focus: number | 'other' | 'choices' };
export function readDraft(id: Qid, draft: QuestionDraft): DraftValue {
  if (draft.mode === 'unknown') return { ok: true, value: null };
  if (draft.mode === 'other') {
    if (!draft.other.trim()) return { ok: false, error: '请补充实际情况，或选择尚不确定。', focus: 'other' };
    const value = { other: draft.other.trim() };
    return validValue(id, value) ? { ok: true, value } : { ok: false, error: '补充说明请控制在 500 字符内。', focus: 'other' };
  }
  if (questions[id].kind === 'range') {
    const values = draft.range.map(Number);
    const blank = draft.range.findIndex(s => !s.trim());
    const invalid = values.findIndex(n => !Number.isFinite(n) || n < 0);
    const [min, target, max] = values;
    const focus = blank >= 0 ? blank : invalid >= 0 ? invalid : target < min ? 1 : 2;
    const value = { min, target, max };
    if (blank >= 0 || !validValue(id, value)) return { ok: false, error: '请填写三个非负数，目标下限 ≤ 目标上限 ≤ 可容忍上限。', focus };
    return { ok: true, value };
  }
  return validValue(id, draft.choice) && draft.choice !== null && !isOther(draft.choice)
    ? { ok: true, value: draft.choice }
    : { ok: false, error: '请选择至少一个适用选项，或选择尚不确定。', focus: 'choices' };
}
export function draftChanged(id: Qid, draft: QuestionDraft, applied: Value): boolean {
  const parsed = readDraft(id, draft);
  return parsed.ok ? !sameValue(parsed.value, applied) : JSON.stringify(draft) !== JSON.stringify(draftFromValue(applied));
}
