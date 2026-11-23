import { ids, isBand, TEXT_LIMITS, type Answer, type Project, type Qid, type Seed, type Session, type Value } from './types';
import { fixtures, VERSION } from '../domain/website';
import { activeIdentity, evaluateNodes, graph } from '../domain/rules';
import { compare } from '../domain/candidates';
import { validValue } from '../domain/validation';
import { newId } from './id';

export function evaluate(project: Project): Session {
  return { project, result: compare(project, evaluateNodes(project)) };
}
export function create(seed: Seed, description = '', at = new Date().toISOString(), id: string = newId()): Session {
  if (description.length > TEXT_LIMITS.description) throw new Error(`需求描述请控制在 ${TEXT_LIMITS.description} 字符内。`);
  const answers = {} as Project['answers'];
  for (const questionId of ids) {
    const value = structuredClone(fixtures[seed].values[questionId]);
    answers[questionId] = { questionId, value, status: value === null ? 'unknown' : 'preset', source: { type: 'preset', id: seed },
      reason: value === null ? '此场景没有预设答案。' : `来自「${fixtures[seed].name}」模板，等待用户核对。`, updatedAt: at };
  }
  return evaluate({ id, schemaVersion: '1', domainPackId: 'website', domainPackVersion: VERSION, seed, description, createdAt: at, answers, revision: 0, log: [] });
}
export function answer(session: Session, field: Qid, value: Value, at = new Date().toISOString()): Session {
  if (!validValue(field, value)) throw new Error('请检查选项或预算，目标下限 ≤ 目标上限 ≤ 可容忍上限。');
  if (field === 'identity' && !activeIdentity(session.result.nodes)) throw new Error('确认本期需要账户后才能选择登录方式。');
  const before = session.project.answers[field];
  const after: Answer = { questionId: field, value: structuredClone(value), source: { type: 'user', id: '本机用户' }, updatedAt: at,
    status: value === null ? 'unknown' : isBand(value) ? 'user_approximate' : 'user_confirmed',
    reason: value === null ? '用户选择尚不确定，保留为开放条件。' : isBand(value) ? '用户提供的月预算范围，实际费用待核实。' : '用户在问题卡中明确确认。' };
  const project = { ...session.project, answers: { ...session.project.answers, [field]: after }, revision: session.project.revision + 1 };
  const affected = graph.downstream(field);
  let nodes = evaluateNodes(project, session.result.nodes, affected);
  const stale: Qid[] = [];
  const identity = project.answers.identity;
  if (affected.includes('identity') && !activeIdentity(nodes) && identity.source.type === 'user' && identity.value !== null && identity.status !== 'stale') {
    project.answers.identity = { ...identity, status: 'stale', reason: '本期账户条件已改变，原登录方式保留，请重新确认。' };
    stale.push('identity');
    nodes = evaluateNodes(project, nodes, graph.downstream('identity'));
  }
  project.log = [...project.log, { revision: project.revision, at, field, before, after, affected, stale }];
  return { project, result: compare(project, nodes) };
}
