import { ids, isBand, isOther, type Qid, type Question, type Seed, type Value, type NodeId } from '../core/types';

export const VERSION = '1.0.0';
const option = (id: string, label: string, explanation: string) => ({ id, label, explanation });
export const questions: Record<Qid, Question> = {
  editors: {
    id: 'editors', label: '内容维护者', prompt: '以后谁来更新网站内容？', kind: 'multi',
    hint: '这决定同事能否直接在后台改文案，也影响发布前需要谁配合。可以同时选择两种角色。',
    options: [option('team', '运营同事', '在网页后台改文案、替换图片，无需修改代码。'), option('dev', '开发人员', '在项目文件中维护页面，发布时需要开发人员参与。')],
    recommended: ['team'], rationale: '日常更新交给运营，可以减少改一段文字就找开发的次数。',
  },
  login: {
    id: 'login', label: '访客账户', prompt: '访客现在需要登录网站吗？', kind: 'single',
    hint: '登录后查看个人内容，需要核实身份、保存账户资料，并安排运行这些功能的服务。',
    options: [option('now', '现在需要', '会员登录后查看自己的内容。'), option('none', '无需访客账户', '访客直接浏览公开页面。运营登录编辑后台仍然可以使用。'), option('later', '以后可能需要', '当期先做公开页面，将账户能力列入后续阶段。')],
    recommended: 'none', rationale: '如果访客只看公开内容，可以先减少维护账户的工作。',
  },
  identity: {
    id: 'identity', label: '登录方式', prompt: '访客用什么方式登录？', kind: 'single', hint: '只有本期需要访客账户时才问。不同方式需要维护不同的身份服务。',
    options: [option('email', '邮箱登录', '需要验证邮件送达，并提供找回账户的方式。'), option('company', '企业统一登录', '接入现有组织的身份系统，需要对方配合配置。')],
    recommended: 'email', rationale: '普通访客通常已有邮箱，便于先验证登录流程。',
  },
  purpose: {
    id: 'purpose', label: '网站用途', prompt: '访客来网站主要做什么？', kind: 'multi', hint: '选择本期真正需要的用途，这会影响页面、内容和询盘入口。',
    options: [option('show', '了解产品或业务', '展示介绍页、案例与联系方式。'), option('publish', '阅读文章', '组织持续发布的文章，需要归档与发布流程。'), option('inquiry', '提交询盘', '通过表单联系团队，需要处理提交与垃圾消息。'), option('complex', '交易或定制业务', '订单履约、支付或独有业务流程需要单独评估。')],
    recommended: ['show'], rationale: '从访客需要完成的一件事开始，有助于控制首期范围。',
  },
  languages: {
    id: 'languages', label: '内容语言', prompt: '内容需要用哪些语言发布？', kind: 'multi', hint: '多语言页面需要翻译、独立地址和版本核对。',
    options: [option('zh', '中文', '维护一套中文页面。'), option('en', '英语', '为英文读者提供独立内容。'), option('ja', '日语', '为日语读者提供独立内容。')],
    recommended: ['zh'], rationale: '先从团队能够持续维护的语言开始。',
  },
  limits: {
    id: 'limits', label: '硬性限制', prompt: '哪些条件必须同时满足？', kind: 'multi', hint: '这些是硬约束。相互矛盾时需要你决定保留哪些，维护偏好无法抵消它们。',
    options: [option('accounts', '本期必须提供访客账户', '即使只有部分页面，也必须能识别访客。'), option('no_profiles', '禁止存储访客账户资料', '不允许网站或受托服务保存任何访客账户记录。'), option('visual', '必须有可视化编辑后台', '同事要能在网页上编辑内容。')],
    recommended: [], rationale: '如果没有不可妥协的条件，可以确认没有额外限制。',
  },
  budget: {
    id: 'budget', label: '月预算', prompt: '每月可接受的持续费用是多少？', kind: 'range', hint: '先记录理想区间，再写下最多能接受多少。费用单位为人民币元/月，需要另行核价。',
    options: [], recommended: null, rationale: '如果还没有预算，建议先选尚不确定，获得报价后再补。',
  },
  priority: {
    id: 'priority', label: '维护偏好', prompt: '你更看重哪一种取舍？', kind: 'single', hint: '这是可以折中的软偏好，只调整合格方向的展示次序。',
    options: [option('balanced', '一起权衡', '保留各有优势的方向。'), option('maintenance', '非常看重低维护', '优先展示日常维护负担较小的组合。'), option('extension', '更看重后续扩展', '优先展示能增加业务逻辑的组合。')],
    recommended: 'balanced', rationale: '还没体验具体的维护工作前，可以先对照取舍。',
  },
};
/** Guide order: high-impact capability questions first, then scope and preferences. */
export const questionOrder: readonly Qid[] = ['editors', 'login', 'identity', 'limits', 'purpose', 'languages', 'priority', 'budget'];
const base: Record<Qid, Value> = { editors: ['team'], purpose: ['show', 'inquiry'], login: null, identity: null, languages: ['zh', 'en'], limits: [], budget: null, priority: 'balanced' };
export const fixtures: Record<Seed, { name: string; summary: string; values: Record<Qid, Value> }> = {
  'b2b-site': { name: 'B2B 多语言官网', summary: '向海外客户展示产品，收集询盘。', values: { ...base } },
  blog: { name: '个人博客', summary: '独立写作、整理文章，公开发布。', values: { ...base, purpose: ['publish'], editors: ['dev'], languages: ['zh'], login: 'none' } },
  saas: { name: '带账户的 SaaS 网站', summary: '介绍软件服务，访客登录后阅读专属内容。', values: { ...base, purpose: ['show', 'publish'], login: 'now', identity: 'email' } },
  contradiction: { name: '硬约束冲突示例', summary: '同时要求本期账户和禁止保留访客账户记录。', values: { ...base, limits: ['accounts', 'no_profiles'] } },
};
export const labels: Record<NodeId, string> = {
  ...Object.fromEntries(ids.map(id => [id, questions[id].label])) as Record<Qid, string>, content: '编辑能力', membership: '本期账户能力',
  auth: '身份认证', data: '账户数据', deploy: '部署形态', publishing: '发布与询盘',
};
export function formatValue(id: NodeId, value: Value): string {
  if (value === null) return '尚不确定';
  if (isOther(value)) return `其他 · ${value.other}`;
  if (isBand(value)) return `目标 ${value.min}–${value.target} 元/月，可容忍 ${value.target}–${value.max} 元/月`;
  const options = questions[id as Qid]?.options ?? [];
  const label = (v: string) => options.find(o => o.id === v)?.label ?? v;
  return Array.isArray(value) ? value.map(label).join('、') || '没有额外限制' : label(value);
}
export function recommendation(seed: Seed, id: Qid) {
  const preset = fixtures[seed].values[id];
  if (preset !== null && seed !== 'contradiction') return { value: preset, reason: `根据「${fixtures[seed].name}」场景的起步配置，可按实际情况修改。` };
  return { value: questions[id].recommended, reason: questions[id].rationale };
}
