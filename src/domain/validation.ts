import { ids, isBand, isOther, type Qid, type Value } from '../core/types';
import { questions } from './website';

export function validValue(id: Qid, value: Value): boolean {
  if (!ids.includes(id)) return false;
  if (value === null) return true;
  if (isOther(value)) return typeof value.other === 'string' && !!value.other.trim() && value.other.length <= 500;
  const q = questions[id];
  if (q.kind === 'range') return isBand(value) && [value.min, value.target, value.max].every(n => Number.isFinite(n) && n >= 0) && value.min <= value.target && value.target <= value.max;
  const values = Array.isArray(value) ? value : [value];
  return (q.kind === 'multi') === Array.isArray(value) && (values.length > 0 || id === 'limits') && new Set(values).size === values.length && values.every(v => q.options.some(o => o.id === v));
}
