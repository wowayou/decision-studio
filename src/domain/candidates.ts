import { ids, isOther, type Candidate, type Constraint, type Fit, type NodeId, type Nodes, type Project, type Qid, type Result, type Value } from '../core/types';
import { activeIdentity, includes, usable } from './rules';
import { formatValue, labels, questionOrder } from './website';

interface Bundle { id: string; name: string; description: string; base: string[]; accounts: boolean; visual: string; owner: string; tradeoff: string; risk: string; maintenance: Fit; extension: Fit }
const bundles: Bundle[] = [
  { id: 'static_content', name: '静态内容站', base: ['Astro 静态生成器（预先把内容生成网页）', '静态文件托管（服务商待核对）'], description: '把内容预先生成页面，访客打开即可阅读。', accounts: false, visual: 'Decap CMS 可视化内容后台（连接代码仓库的编辑界面）', owner: '开发维护构建与托管，编辑人员按流程发布。', tradeoff: '页面交付简单，引入后台后需要对接发布流程。', risk: '需核对编辑后台的访问授权与发布流程；未来加入访客账户需要改造。', maintenance: 'good', extension: 'poor' },
  { id: 'traditional_cms', name: '托管内容管理站', base: ['WordPress 内容管理系统（带编辑后台的网站软件）', 'MariaDB 内容数据库（保存内容和账户记录）', '托管运行与备份（服务商待核对）'], description: '团队在管理后台编辑，由托管方运行网站。', accounts: true, visual: 'WordPress 可视化内容后台', owner: '托管方维护运行环境，团队管理内容、扩展与权限。', tradeoff: '编辑与发布集中，复杂业务受扩展能力限制。', risk: '需核对扩展兼容性、内容权限、数据备份与托管责任。', maintenance: 'good', extension: 'mixed' },
  { id: 'application_hybrid', name: '应用型网站', base: ['Next.js 页面与应用服务（一起运行网页和业务逻辑）', 'Node.js 应用运行环境（服务商待核对）'], description: '公开页面和登录后的个人内容可以一起运行。', accounts: true, visual: 'Directus 应用配套内容后台（管理结构化内容的独立服务）', owner: '开发团队负责应用发布、运行监控及数据恢复。', tradeoff: '业务扩展空间大，首期开发与持续维护较多。', risk: '需要明确应用服务的长期维护负责人，并核对内容后台的部署与许可。', maintenance: 'poor', extension: 'good' },
];
const strings = (v: Value) => Array.isArray(v) ? v : [];
function constraintsFor(nodes: Nodes): Constraint[] {
  const list: Constraint[] = [];
  const add = (kind: Constraint['kind'], field: NodeId, value: Value, reason: string) => list.push({ id: `${field}.${kind}.${list.length}`, field, kind, value, reason, source: nodes[field].source });
  for (const limit of strings(usable(nodes.limits))) add('hard', 'limits', limit, formatValue('limits', limit));
  const login = usable(nodes.login);
  if (login !== null) add(login === 'later' ? 'deferred' : 'hard', 'login', login, formatValue('login', login));
  if (activeIdentity(nodes)) add('conditional', 'identity', usable(nodes.identity), '本期账户要求身份认证。');
  for (const [id, kind] of [['budget', 'range'], ['priority', 'soft']] as const) {
    const value = usable(nodes[id]);
    if (value !== null) add(kind, id, value, formatValue(id, value));
  }
  return list;
}
function assumptionsFor(p: Project, n: Nodes): string[] {
  const assumptions: string[] = [];
  for (const id of ids) {
    const a = n[id];
    if (a.status === 'not_applicable') continue;
    if (a.status === 'stale') assumptions.push(`${labels[id]}已失效，原答「${formatValue(id, a.value)}」保留待确认。`);
    else if (a.status === 'unknown' || isOther(a.value)) assumptions.push(`${labels[id]}待核对${isOther(a.value) ? `（补充：${a.value.other}）` : ''}。`);
    else if (a.status === 'preset') assumptions.push(`${labels[id]}采用模板默认「${formatValue(id, a.value)}」。`);
  }
  if (p.description) assumptions.push('需求原文已保存，需核对它与结构化答案是否一致。');
  return assumptions;
}
function nextQuestions(p: Project, nodes: Nodes, conflict: boolean): Qid[] {
  const open = questionOrder.filter(id => (id !== 'identity' || activeIdentity(nodes)) && (p.answers[id].source.type !== 'user' || nodes[id].status === 'stale'));
  if (conflict) return [...new Set<Qid>(['limits', 'login', ...open])];
  return open;
}
export function compare(p: Project, nodes: Nodes): Result {
  const conflicts = nodes.membership.status === 'conflicted' ? strings(nodes.membership.value) : [];
  const purpose = usable(nodes.purpose);
  const coverage = includes(purpose, 'complex') ? '规则覆盖不足：交易与定制业务需要另行评估支付、数据与履约流程。' : null;
  const limits = usable(nodes.limits);
  const visual = includes(nodes.content.value, '可视化内容后台');
  const candidates = bundles.map((bundle): Candidate => {
    const hardFailures = [...conflicts];
    if (coverage) hardFailures.push(coverage);
    if (activeIdentity(nodes) && !bundle.accounts) hardFailures.push('本期需要账户，此静态组合无法提供访客认证与账户数据服务。');
    const assumptions: string[] = [];
    if (nodes.membership.status === 'unknown') assumptions.push(bundle.accounts ? '可支持账户，是否启用及所需配置待确认。' : '以本期无需访客账户为前提。');
    if (limits === null) assumptions.push('硬性限制待明确，可能排除此方向。');
    if (purpose === null) assumptions.push('用途待明确，需核对是否在网站规则覆盖内。');
    if (usable(nodes.budget) !== null) assumptions.push('成本待核实，取得报价后再与预算上限比较。');
    const pluginCheck = activeIdentity(nodes) && bundle.id === 'traditional_cms';
    const identityCheck = activeIdentity(nodes) && (usable(nodes.identity) === 'company' || isOther(nodes.identity.value));
    if (pluginCheck) assumptions.push('会员登录扩展、专属内容权限与托管方案待核实。');
    if (identityCheck) assumptions.push('登录方式与所选身份服务的协议、扩展兼容性待核实。');
    const pending = limits === null || purpose === null || usable(nodes.budget) !== null || pluginCheck || identityCheck || (nodes.membership.status === 'unknown' && !bundle.accounts);
    const components = [...bundle.base];
    if (visual) components.push(bundle.visual);
    if (includes(nodes.content.value, '开发发布流程')) components.push('代码版本与发布流程');
    if (bundle.accounts && activeIdentity(nodes)) {
      components.push(bundle.id === 'traditional_cms' ? `WordPress 访客认证（${nodes.auth.value}，扩展待核实）` : `Auth.js 访客认证（身份验证库，${nodes.auth.value}）`,
        bundle.id === 'traditional_cms' ? '访客账户存储与备份（使用内容数据库）' : 'PostgreSQL 账户存储与备份（保存账户记录的数据库）', String(nodes.deploy.value));
    }
    components.push(...strings(nodes.publishing.value));
    const maintenance = bundle.id === 'static_content' && (visual || includes(purpose, 'inquiry')) ? 'mixed' : bundle.maintenance;
    return { id: bundle.id, name: bundle.name, description: bundle.description, components, owner: bundle.owner, risk: bundle.risk, tradeoff: bundle.tradeoff,
      feasible: hardFailures.length ? false : pending ? 'unresolved' : true, assumptions, hardFailures,
      fit: { maintenance, extension: bundle.extension, cost: 'unknown' }, ruleId: `website.bundle.${bundle.id}`, inputs: [...ids, 'membership', 'content', 'auth', 'data', 'deploy', 'publishing'] };
  });
  const pref = usable(nodes.priority);
  const metric = pref === 'maintenance' || pref === 'extension' ? pref : null;
  const weight = { good: 0, mixed: 1, poor: 2, unknown: 3 };
  const feasibilityOrder = (c: Candidate) => c.feasible === true ? 0 : c.feasible === 'unresolved' ? 1 : 2;
  candidates.sort((a, b) => feasibilityOrder(a) - feasibilityOrder(b) || (metric ? weight[a.fit[metric]] - weight[b.fit[metric]] : 0));
  const orderReason = metric ? `先看硬性条件，再按${metric === 'maintenance' ? '低维护' : '扩展'}适配度分组，同档并列。` : '同一可行性组内并列展示，各有取舍。';
  return { nodes, candidates, conflicts, coverage, constraints: constraintsFor(nodes), assumptions: assumptionsFor(p, nodes), orderReason, frontier: nextQuestions(p, nodes, !!conflicts.length) };
}
