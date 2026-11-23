import { compileGraph } from '../core/graph';
import { ids, isOther, type NodeId, type Nodes, type NodeResult, type Project, type Qid, type Status, type Value } from '../core/types';
import { formatValue } from './website';

export const graph = compileGraph<NodeId>({ purpose: [], editors: [], login: [], languages: [], limits: [], budget: [], priority: [],
  membership: ['login', 'limits'], identity: ['membership'], content: ['editors', 'limits'], auth: ['membership', 'identity'],
  data: ['membership'], deploy: ['membership'], publishing: ['purpose', 'languages'],
});
export const activeIdentity = (nodes: Nodes) => nodes.membership.value === '本期需要账户' && nodes.membership.status === 'rule_derived';
export function usable(node: NodeResult) {
  if (isOther(node.value) || ['unknown', 'stale', 'not_applicable', 'conflicted', 'ai_suggested'].includes(node.status)) return null;
  return node.value;
}
export const includes = (v: Value, key: string) => Array.isArray(v) && v.includes(key);
function evaluateNode(id: NodeId, p: Project, n: Nodes): NodeResult {
  const inputs = graph.inputs[id];
  function derived(value: Value, reason: string, status: Status = 'rule_derived'): NodeResult {
    return { value, status, reason, source: `website.${id}`, inputs };
  }
  if (ids.includes(id as Qid)) {
    const a = p.answers[id as Qid];
    if (id === 'identity' && !activeIdentity(n)) {
      const retain = a.value !== null && a.source.type === 'user';
      return { value: retain ? a.value : null, status: retain ? 'stale' : 'not_applicable', source: retain ? a.source.id : 'website.identity', inputs,
        reason: retain ? '本期账户条件发生变化，已保留原答。恢复账户后请重新确认。' : '只有本期明确需要账户时才选择登录方式。' };
    }
    return { value: a.value, status: a.status, reason: a.reason, source: a.source.id, inputs };
  }
  if (id === 'membership') {
    const login = usable(n.login), limits = usable(n.limits);
    const required = includes(limits, 'accounts'), forbidden = includes(limits, 'no_profiles');
    const failures: string[] = [];
    if ((required || login === 'now') && forbidden) failures.push('本期必须提供访客账户，同时禁止存储访客账户资料。');
    if (required && (login === 'none' || login === 'later')) failures.push('访客账户选择为本期无需，但硬性限制要求本期提供账户。');
    if (failures.length) return derived(failures, failures.join(' '), 'conflicted');
    if (required || login === 'now') return derived('本期需要账户', '访客需求或硬性限制要求本期提供账户。');
    if (forbidden || login === 'none' || login === 'later') return derived('本期无需账户', forbidden ? '禁止保留访客账户记录，因此当期不能启用访客账户。' : formatValue('login', login));
    return derived(null, '是否需要访客账户仍待确认，保留公开站点和应用方向。', 'unknown');
  }
  if (id === 'content') {
    const editors = usable(n.editors), visual = includes(usable(n.limits), 'visual');
    const components: string[] = [];
    if (visual || includes(editors, 'team')) components.push('可视化内容后台');
    if (includes(editors, 'dev')) components.push('开发发布流程');
    return components.length ? derived(components, '按内容维护角色与强制编辑要求合并所需能力。') : derived(null, '编辑角色与能力待确认。', 'unknown');
  }
  if (id === 'publishing') {
    const purposes = usable(n.purpose), langs = usable(n.languages);
    const components: string[] = [];
    if (includes(purposes, 'show')) components.push('业务展示页');
    if (includes(purposes, 'publish')) components.push('文章归档');
    if (includes(purposes, 'inquiry')) components.push('询盘表单与消息投递');
    if (Array.isArray(langs) && langs.length > 1) components.push('多语言地址与翻译校对');
    if (Array.isArray(langs) && langs.length === 1) components.push('单语言发布');
    return derived(components, '分别匹配网站用途和语言，合并每条命中的发布能力。', purposes === null || langs === null ? 'unknown' : 'rule_derived');
  }
  if (n.membership.status === 'conflicted') return derived(null, '账户需求存在冲突，先解决硬性限制。', 'conflicted');
  if (n.membership.value === null) return derived(null, '等待确认本期账户需求。', 'unknown');
  const accounts = activeIdentity(n);
  if (id === 'auth') {
    if (!accounts) return derived('无需访客认证', '公开页面不要求访客登录。', 'not_applicable');
    const method = usable(n.identity);
    return derived(method ? formatValue('identity', method) : '访客认证（方式待确认）', '本期账户需要核实访客身份，具体方式由登录选择决定。');
  }
  if (id === 'data') return derived(accounts ? '访客账户存储与备份' : '无需访客账户库', '账户资料与内容资料分开判断。');
  return derived(accounts ? '支持登录会话的服务端' : '可使用公开页面交付', '需要登录时，部署组合必须能够验证身份并处理会话。');
}
export function evaluateNodes(project: Project, previous?: Nodes, affected = graph.order): Nodes {
  const nodes = { ...previous } as Nodes;
  for (const id of affected) nodes[id] = evaluateNode(id, project, nodes);
  return nodes;
}
