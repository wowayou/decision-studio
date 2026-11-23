import { capabilityIds, ids, statusText, type Candidate, type Session } from '../core/types';
import { fixtures, formatValue, labels, VERSION } from './website';
export const fitText = { good: '好', mixed: '有取舍', poor: '弱', unknown: '待核实' };
export const feasibilityText = (c: Candidate) => c.feasible === true ? '满足已知硬条件' : c.feasible === false ? '已排除' : '前提待核实';
const literal = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_\[\]#|!]/g, '\\$&').replace(/\s*\n\s*/g, ' ');
export function markdown({ project: p, result: r }: Session): string {
  const open = r.candidates.filter(c => c.feasible !== false);
  const lines = [`# ${fixtures[p.seed].name} · 有条件方案草案`, '', `网站规则包 ${VERSION} · 项目格式 ${p.schemaVersion} · 修订 ${p.revision}`, '',
    '## 执行摘要', `${open.length} 个方向可继续评估。${r.orderReason} 成本待核实。`,
    ...r.conflicts.map(s => `- 阻塞：${s}`), ...(r.coverage ? [r.coverage] : []), ...(p.description ? [`需求原文（用户提供，待逐项核对）：${literal(p.description)}`] : []), '', '## 决策依据'];
  for (const id of ids) {
    const n = r.nodes[id];
    lines.push(`- ${labels[id]} · ${statusText[n.status]} · ${literal(formatValue(id, n.value))}（${n.source}，${n.reason}）`);
  }
  lines.push('', '## 能力与来源');
  for (const id of capabilityIds) {
    const n = r.nodes[id];
    lines.push(`- ${labels[id]} · ${statusText[n.status]} · ${literal(formatValue(id, n.value))}。${n.reason} 依据 ${n.inputs.map(i => labels[i]).join('、')} / ${n.source}`);
  }
  lines.push('', '## 未确认假设与待核实条件', ...r.assumptions.map(s => `- ${literal(s)}`), '- 根据服务报价、用量和维护人工核对成本。', '', '## 方案与组件');
  for (const c of r.candidates) {
    lines.push(`### ${c.name} · ${feasibilityText(c)}`);
    if (c.feasible === false) lines.push(...c.hardFailures.map(s => `- 排除原因：${s}`));
    else lines.push(c.description, `- 当前构建：${c.components.join('、')}`, `- 取舍：${c.tradeoff}`, `- 维护责任：${c.owner}`, `- 风险：${c.risk}`,
      `- 低维护适配：${fitText[c.fit.maintenance]}；扩展适配：${fitText[c.fit.extension]}；成本待核实。`, ...c.assumptions.map(s => `- 前提：${s}`));
    lines.push(`- 组合规则：${c.ruleId} @ ${VERSION}`, '');
  }
  lines.push('## 分期与实施清单', '- [ ] 先处理硬性冲突，逐项核对未知条件与模板默认值。', '- [ ] 选定方向后，为当期组件指定内容、发布与维护负责人。',
    '- [ ] 核对服务报价、数据处理和备份恢复，再决定上线。', p.answers.login.value === 'later' ? '- 后续阶段：重新评估访客账户、认证与数据需求。' : '- 后续阶段：需求变更时重新评估开户与维护条件。',
    '', '## 变更记录', ...p.log.map(e => `- r${e.revision} ${e.at} ${labels[e.field]}：${literal(formatValue(e.field, e.before.value))} → ${literal(formatValue(e.field, e.after.value))}。影响 ${e.affected.map(i => labels[i]).join('、')}${e.stale.length ? '；原登录方式已失效' : ''}。`));
  return `${lines.join('\n')}\n`;
}
