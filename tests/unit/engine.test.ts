import { describe, expect, test } from 'vitest';
import { compileGraph } from '../../src/core/graph';
import { answer, create, evaluate } from '../../src/core/session';
import { ids, type Qid, type Seed, type Value } from '../../src/core/types';
import { fixtures, formatValue, questions } from '../../src/domain/website';
import { graph } from '../../src/domain/rules';
import { markdown } from '../../src/domain/report';
import { validValue } from '../../src/domain/validation';

const at = '2026-11-22T12:00:00.000Z', id = 'a994cf01-577d-4ffa-9083-9d26006196c8';
const seed = (key: Seed = 'b2b-site') => create(key, '', at, id);
const put = (s: ReturnType<typeof seed>, q: Qid, v: Value) => answer(s, q, v, at);

describe('P0 网站规则闭环', () => {
  test.each(Object.keys(fixtures) as Seed[])('%s 种子可确定性求值', key => {
    const s = seed(key);
    expect(s.result).toEqual(evaluate(s.project).result);
    expect(s.project.domainPackVersion).toBe('1.0.0');
  });
  test('AC01：B2B 默认值与未知值均有来源，立即有草案和关键问题', () => {
    const s = seed();
    expect(s.project.answers.editors.status).toBe('preset');
    expect(s.project.answers.editors.source).toEqual({ type: 'preset', id: 'b2b-site' });
    expect(s.result.nodes.login.status).toBe('unknown');
    expect(s.result.frontier[0]).toBe('editors');
    expect(s.result.candidates.filter(c => c.feasible !== false)).toHaveLength(3);
    expect(s.result.assumptions.length).toBeGreaterThan(0);
  });
  test('AC02：8 个问题均有中文解释、推荐理由、选项注释', () => {
    expect(ids).toHaveLength(8);
    for (const q of Object.values(questions)) {
      expect(q.prompt).toMatch(/[\u4e00-\u9fff]/);
      expect(q.hint.length).toBeGreaterThan(10);
      expect(q.rationale.length).toBeGreaterThan(10);
      for (const o of q.options) expect(o.explanation.length).toBeGreaterThan(5);
    }
  });
  test('AC03：运营和开发可共存，合并所有命中规则而非取第一条', () => {
    const s = put(seed(), 'editors', ['team', 'dev']);
    expect(s.project.answers.editors.value).toEqual(['team', 'dev']);
    expect(s.result.nodes.content.value).toEqual(['可视化内容后台', '开发发布流程']);
    for (const c of s.result.candidates) {
      expect(c.components).toContain('代码版本与发布流程');
      expect(c.components.join(' ')).toMatch(/可视化内容后台|应用配套内容后台/);
    }
  });
  test('AC04：预算范围不伪装成报价，不擅自声称符合上限', () => {
    const s = put(put(seed(), 'login', 'none'), 'budget', { min: 100, target: 300, max: 500 });
    expect(s.project.answers.budget.status).toBe('user_approximate');
    expect(s.result.constraints).toContainEqual(expect.objectContaining({ kind: 'range', value: { min: 100, target: 300, max: 500 } }));
    for (const c of s.result.candidates) {
      expect(c.feasible).toBe('unresolved'); expect(c.fit.cost).toBe('unknown');
      expect(c.assumptions.join(' ')).toContain('成本待核实');
    }
    expect(markdown(s)).toContain('目标 100–300 元/月，可容忍 300–500 元/月');
  });
  test('AC05：主动未知不等于否，并且不会强迫重复回答', () => {
    const s = put(seed(), 'login', null);
    expect(s.result.nodes.membership.status).toBe('unknown');
    expect(s.result.nodes.membership.value).toBeNull();
    for (const key of ['auth', 'data', 'deploy'] as const) expect(s.result.nodes[key].status).toBe('unknown');
    expect(s.result.candidates.find(c => c.id === 'static_content')?.feasible).toBe('unresolved');
    expect(s.result.frontier).not.toContain('login');
    expect(s.result.frontier).not.toContain('identity');
  });
  test('有账户前提才启用登录问题，推导数据和部署不再问技术配置', () => {
    const s = put(seed(), 'login', 'now');
    expect(s.result.frontier).toContain('identity');
    expect(s.result.nodes.data.value).toBe('访客账户存储与备份');
    expect(s.result.nodes.deploy.value).toBe('支持登录会话的服务端');
    expect(() => put(seed(), 'identity', 'email')).toThrow('确认本期需要账户');
    expect(s.result.candidates.filter(c => c.feasible !== false)).toHaveLength(2);
  });
  test('AC06：账户变化只求值后继，语言与编辑事实以及节点引用保留', () => {
    const previous = put(put(put(seed(), 'languages', ['zh', 'en', 'ja']), 'editors', ['team', 'dev']), 'login', 'none');
    const copied = structuredClone(previous);
    const s = put(previous, 'login', 'now');
    expect(s.project.answers.languages).toBe(previous.project.answers.languages);
    expect(s.project.answers.editors).toBe(previous.project.answers.editors);
    expect(s.result.nodes.languages).toBe(previous.result.nodes.languages);
    expect(s.result.nodes.content).toBe(previous.result.nodes.content);
    expect(s.project.log.at(-1)?.affected).toEqual(graph.downstream('login'));
    expect(s.project.log.at(-1)?.affected).toEqual(expect.arrayContaining(['login', 'membership', 'identity', 'auth', 'data', 'deploy']));
    expect(s.project.log.at(-1)?.affected).not.toContain('publishing');
    expect(previous).toEqual(copied);
    expect(s.result).toEqual(evaluate(s.project).result);
  });
  test('AC07：失效原答不丢弃，恢复上游后也不自动重新确认', () => {
    const previous = put(seed('saas'), 'identity', 'company');
    const s = put(previous, 'login', 'none');
    expect(s.project.answers.identity).toEqual({ ...previous.project.answers.identity, status: 'stale', reason: expect.any(String) });
    expect(s.result.nodes.identity.status).toBe('stale');
    expect(s.result.nodes.identity.value).toBe('company');
    expect(s.result.nodes.auth.status).toBe('not_applicable');
    expect(s.project.log.at(-1)?.stale).toEqual(['identity']);
    const reopened = put(s, 'login', 'now');
    expect(reopened.result.nodes.identity.status).toBe('stale');
    expect(reopened.result.nodes.auth.value).toContain('方式待确认');
    const reconfirmed = put(reopened, 'identity', 'company');
    expect(reconfirmed.result.nodes.identity.status).toBe('user_confirmed');
    expect(reconfirmed.result.nodes.auth.value).toBe('企业统一登录');
  });
  test('仍兼容的下游选择保留确认状态', () => {
    const s = put(put(seed('saas'), 'identity', 'email'), 'limits', ['visual']);
    expect(s.project.answers.identity.status).toBe('user_confirmed');
    expect(s.result.nodes.auth.value).toBe('邮箱登录');
    expect(s.result).toEqual(evaluate(s.project).result);
  });
  test('AC08：冲突硬约束显式报告，软偏好无法补偿', () => {
    const s = put(seed('contradiction'), 'priority', 'maintenance');
    expect(s.result.conflicts[0]).toContain('禁止存储访客账户资料');
    expect(s.result.constraints.filter(c => c.kind === 'hard')).toHaveLength(2);
    for (const c of s.result.candidates) { expect(c.feasible).toBe(false); expect(c.hardFailures).toEqual(s.result.conflicts); }
    expect(s.result.frontier[0]).toBe('limits');
    expect(s.project.answers.limits.value).toEqual(['accounts', 'no_profiles']);
  });
  test('本期无需账户与本期必须账户也构成条件冲突', () => {
    const s = put(put(seed(), 'limits', ['accounts']), 'login', 'later');
    expect(s.result.conflicts.join(' ')).toContain('本期无需');
    expect(s.result.candidates.every(c => c.feasible === false)).toBe(true);
    expect(s.result.constraints.some(c => c.kind === 'deferred')).toBe(true);
  });
  test('AC09：合法方向各有取舍，不断言唯一最优', () => {
    const s = put(seed(), 'login', 'none');
    expect(s.result.candidates.every(c => c.feasible === true)).toBe(true);
    expect(s.result.orderReason).toContain('并列');
    expect(s.result.candidates.map(c => [c.fit.maintenance, c.fit.extension])).toEqual([['mixed', 'poor'], ['good', 'mixed'], ['poor', 'good']]);
  });
  test('偏好只排序合格组；未知指标不伪造分数', () => {
    const base = put(seed(), 'login', 'none');
    const s = put(base, 'priority', 'maintenance');
    expect(s.result.candidates[0]!.id).toBe('traditional_cms');
    expect(s.result.candidates.map(c => [c.id, c.hardFailures]).sort()).toEqual(base.result.candidates.map(c => [c.id, c.hardFailures]).sort());
    expect(s.result.orderReason).toContain('同档并列');
    expect(s.result.candidates.every(c => c.fit.cost === 'unknown')).toBe(true);
  });
  test('技术默认值来自许可的组合；会员权限与企业身份兼容性不作保证', () => {
    const publicSite = put(seed(), 'login', 'none');
    expect(publicSite.result.candidates.find(c => c.id === 'static_content')?.components.join(' ')).toContain('Astro');
    expect(publicSite.result.candidates.find(c => c.id === 'traditional_cms')?.components.join(' ')).toContain('WordPress');
    expect(publicSite.result.candidates.find(c => c.id === 'application_hybrid')?.components.join(' ')).toContain('Next.js');
    const accounts = put(seed(), 'login', 'now');
    expect(accounts.result.candidates.find(c => c.id === 'traditional_cms')?.feasible).toBe('unresolved');
    expect(accounts.result.candidates.find(c => c.id === 'static_content')?.feasible).toBe(false);
    const company = put(accounts, 'identity', 'company');
    expect(company.result.candidates.filter(c => c.feasible !== false).every(c => c.feasible === 'unresolved')).toBe(true);
    expect(company.result.candidates.find(c => c.id === 'application_hybrid')?.assumptions.join(' ')).toContain('兼容性待核实');
  });
  test('未来账户不偷换成当期配置', () => {
    const s = put(seed(), 'login', 'later');
    expect(s.result.nodes.data.value).toBe('无需访客账户库');
    expect(s.result.candidates.every(c => !c.components.some(s => /访客认证|账户存储/.test(s)))).toBe(true);
    expect(markdown(s)).toContain('后续阶段：重新评估访客账户');
  });
  test('AC12：同一快照反复全量求值结果一致', () => {
    const s = put(put(seed(), 'login', 'now'), 'identity', 'email');
    expect(evaluate(s.project)).toEqual(evaluate(s.project));
    expect(evaluate(s.project)).toEqual(s);
  });
  test('AC12：局部重算幂等，不因重复确认改变规则结果', () => {
    const s = put(put(seed(), 'login', 'now'), 'identity', 'email');
    const same = answer(s, 'login', 'now', '2026-11-22T13:00:00.000Z');
    expect(same.result).toEqual(s.result);
    expect(same.project.answers.identity).toBe(s.project.answers.identity);
    expect(same.project.log.at(-1)?.stale).toEqual([]);
  });
  test('连续变更后，每个局部结果都与全量结果相同', () => {
    const actions: [Qid, Value][] = [['languages', ['en', 'zh']], ['login', 'now'], ['identity', 'email'], ['editors', ['team', 'dev']], ['limits', ['no_profiles']], ['login', 'none'], ['limits', []], ['login', 'now'], ['identity', 'company'], ['budget', { min: 0, target: 300, max: 600 }], ['purpose', ['show', 'publish']], ['priority', 'extension'], ['login', null]];
    let s = seed();
    for (const [q, v] of actions) { s = put(s, q, v); expect(s.result).toEqual(evaluate(s.project).result); }
  });
  test('覆盖不足不假装完整评估复杂业务', () => {
    const s = put(seed(), 'purpose', ['show', 'complex']);
    expect(s.result.coverage).toContain('规则覆盖不足');
    expect(s.result.candidates.every(c => c.feasible === false)).toBe(true);
  });
  test('其他情况保留原文，但不当作已知能力值', () => {
    const s = put(seed(), 'purpose', { other: '内部审批网站' });
    expect(s.project.answers.purpose.value).toEqual({ other: '内部审批网站' });
    expect(s.result.nodes.publishing.status).toBe('unknown');
    expect(s.result.candidates.every(c => c.feasible === 'unresolved')).toBe(true);
    expect(s.result.assumptions.join(' ')).toContain('内部审批网站');
  });
  test('报告区分用户事实、模板、规则和未知，并引用规则版本', () => {
    const s = put(seed(), 'editors', ['team']);
    const md = markdown(s);
    expect(md).toContain('用户确认'); expect(md).toContain('模板默认'); expect(md).toContain('待确认'); expect(md).toContain('规则推导');
    expect(md).toContain('website.bundle.static_content @ 1.0.0');
    expect(md).toContain('实施清单');
    expect(formatValue('budget', { min: 100, target: 300, max: 500 })).toContain('可容忍 300–500');
  });
  test('依赖只支持已定义节点且拒绝循环', () => {
    expect(() => compileGraph({ a: ['b'], b: ['a'] })).toThrow('成环');
    expect(() => compileGraph({ a: ['missing'] } as Record<string, string[]>)).toThrow('不存在');
  });
});

describe('输入边界', () => {
  test.each<[Qid, Value]>([['editors', 'team'], ['editors', ['team', 'team']], ['login', ['now']], ['login', 'random'], ['purpose', []], ['budget', { min: -1, target: 300, max: 500 }], ['budget', { min: 100, target: 300, max: 200 }], ['budget', { min: 100, target: NaN, max: 500 }], ['priority', { other: '' }]])('%s 拒绝非法值 %j', (q, v) => {
    expect(validValue(q, v)).toBe(false);
    const s = seed(); const before = structuredClone(s);
    expect(() => put(s, q, v)).toThrow(); expect(s).toEqual(before);
  });
  test('预算零下限、空硬约束及未知均合法', () => {
    expect(validValue('budget', { min: 0, target: 0, max: 0 })).toBe(true);
    expect(validValue('limits', [])).toBe(true);
    for (const id of ids) expect(validValue(id, null)).toBe(true);
  });
});
