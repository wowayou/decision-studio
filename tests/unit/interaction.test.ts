import { expect, test } from 'vitest';
import { create, answer } from '../../src/core/session';
import { impactBetween, sameValue } from '../../src/core/impact';
import { draftChanged, draftFromValue, readDraft } from '../../src/ui/draft';
import { editableQuestion, nodeValue, upstreamQuestions } from '../../src/domain/inspect';
import { jsonBackup } from '../../src/storage/project';

const at = '2026-11-22T12:00:00.000Z';
const seed = () => create('b2b-site', '', at, 'a994cf01-577d-4ffa-9083-9d26006196c8');

test('草稿值和界面修改不改变项目、来源、记录或备份', () => {
  const before = seed(), copy = structuredClone(before), backup = jsonBackup(before, at);
  const draft = draftFromValue(before.project.answers.login.value);
  draft.mode = 'answer'; draft.choice = 'now';
  const parsed = readDraft('login', draft);
  expect(parsed).toEqual({ ok: true, value: 'now' });
  expect(draftChanged('login', draft, before.project.answers.login.value)).toBe(true);
  const simulated = answer(before, 'login', 'now', at);
  expect(impactBetween(before, simulated, 'login').afterCount).toBe(2);
  expect(before).toEqual(copy);
  expect(jsonBackup(before, at)).toBe(backup);
});
test('未知和空限制是不同值，不隐式转为否', () => {
  expect(readDraft('login', draftFromValue(null))).toEqual({ ok: true, value: null });
  expect(readDraft('limits', draftFromValue([]))).toEqual({ ok: true, value: [] });
  expect(sameValue(null, 'none')).toBe(false);
  expect(sameValue(null, [])).toBe(false);
});
test('多选语义与范围键顺序相同，不制造重复修订', () => {
  expect(sameValue(['en', 'zh'], ['zh', 'en'])).toBe(true);
  expect(sameValue({ min: 1, target: 2, max: 3 }, { max: 3, target: 2, min: 1 })).toBe(true);
  expect(draftChanged('languages', draftFromValue(['en', 'zh']), ['zh', 'en'])).toBe(false);
});
test('范围保留未完成输入，校验后焦点能定位到错误字段', () => {
  const draft = draftFromValue(null);
  draft.mode = 'answer'; draft.range = ['100', '300', ''];
  expect(readDraft('budget', draft)).toMatchObject({ ok: false, focus: 2 });
  expect(draftChanged('budget', draft, null)).toBe(true);
  draft.range = ['100', '300', '200'];
  expect(readDraft('budget', draft)).toMatchObject({ ok: false, focus: 2 });
  draft.range[2] = '500';
  expect(readDraft('budget', draft)).toEqual({ ok: true, value: { min: 100, target: 300, max: 500 } });
});
test('其他草稿需要说明，保留为开放字段而不是自动选项映射', () => {
  const draft = draftFromValue({ other: '待核对需求' });
  expect(readDraft('editors', draft)).toEqual({ ok: true, value: { other: '待核对需求' } });
  draft.other = ' ';
  expect(readDraft('editors', draft)).toMatchObject({ ok: false, focus: 'other' });
});
test('模板默认升格为确认也算变化，但没有虚假的下游改变', () => {
  const before = seed(), after = answer(before, 'editors', ['team'], at);
  const impact = impactBetween(before, after, 'editors');
  expect(impact.before.status).toBe('preset'); expect(impact.after.status).toBe('user_confirmed');
  expect(impact.nodes).toEqual([]); expect(impact.candidates).toEqual([]);
  expect(impact.affected).toContain('content');
});
test('真实影响区分重算、节点变化与保留的用户事实', () => {
  const before = answer(answer(seed(), 'languages', ['zh', 'en'], at), 'login', 'none', at);
  const after = answer(before, 'login', 'now', at), impact = impactBetween(before, after, 'login');
  expect(impact.affected).toHaveLength(6);
  expect(impact.nodes.map(n => n.id)).toEqual(expect.arrayContaining(['membership', 'auth', 'data', 'deploy']));
  expect(impact.preserved).toContain('languages');
  expect(impact.followUps).toEqual(['identity']);
  expect(impact.afterCount).toBe(2);
  expect(impact.candidates.find(c => c.id === 'static_content')?.after.feasible).toBe(false);
});
test('恢复上游不能掩盖仍需重新确认的下游原答', () => {
  let before = answer(seed(), 'login', 'now', at);
  before = answer(before, 'identity', 'email', at);
  before = answer(before, 'login', 'none', at);
  const after = answer(before, 'login', 'now', at);
  expect(impactBetween(before, after, 'login').followUps).toEqual(['identity']);
  expect(after.project.answers.identity.status).toBe('stale');
});
test('冲突前后摘要不绕开硬约束', () => {
  const before = seed(), after = answer(before, 'limits', ['accounts', 'no_profiles'], at);
  const impact = impactBetween(before, after, 'limits');
  expect(impact.beforeConflicts).toEqual([]);
  expect(impact.afterConflicts).toHaveLength(1);
  expect(impact.afterCount).toBe(0);
});
test('不适用和未知在图中有不同说明，显示映射不改变原始未知值', () => {
  const before = seed(), after = answer(before, 'login', 'none', at);
  expect(nodeValue('membership', before.result.nodes.membership)).toBe('尚不确定');
  expect(nodeValue('identity', after.result.nodes.identity)).toBe('本期无需选择');
  expect(after.result.nodes.identity.value).toBeNull();
});

test('能力节点不能直接编辑，条件未启用的原始节点也有边界', () => {
  const s = seed();
  expect(editableQuestion('data', s)).toBe(false);
  expect(editableQuestion('identity', s)).toBe(false);
  expect(editableQuestion('login', s)).toBe(true);
  expect(editableQuestion('identity', answer(s, 'login', 'now', at))).toBe(true);
  expect(upstreamQuestions('auth')).toEqual(expect.arrayContaining(['login', 'identity', 'limits']));
});
