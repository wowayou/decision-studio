import { useState } from 'react';
import { TEXT_LIMITS, type Seed } from '../core/types';
import { fixtures } from '../domain/website';
import { Icon, type IconName } from './Icon';

const starters: { seed: Seed; icon: IconName; fits: string }[] = [
  { seed: 'b2b-site', icon: 'globe', fits: '展示产品、收集询盘，可能多语言' },
  { seed: 'blog', icon: 'edit', fits: '个人或小团队写作，公开阅读' },
  { seed: 'saas', icon: 'terminal', fits: '访客需要登录查看专属内容' },
];

export function TemplatePicker({ onStart, replacing }: { onStart: (seed: Seed, description: string) => void; replacing: boolean }) {
  const [description, setDescription] = useState('');
  return <section className="card welcome" aria-labelledby="welcome-title">
    <span className="token accent">网站架构选型 · 本地规则</span>
    <h2 id="welcome-title">{replacing ? '选择新的起步场景' : '先说目标，再做取舍。'}</h2>
    <p className="lead">不需要懂技术框架。选一个最接近的场景，系统补全起步配置；你只需确认几个关键条件，就能得到带依据的方案草案。</p>
    <ol className="welcome-steps">
      <li><b>选场景</b><span>得到起步配置和第一版草案</span></li>
      <li><b>确认关键条件</b><span>每题有解释和建议，可以选“尚不确定”</span></li>
      <li><b>比较方案并导出</b><span>保留前提、风险和待核实事项</span></li>
    </ol>
    <label className="field">需求描述 <span className="muted">（可选）</span>
      <textarea placeholder="例如：做一个多语言企业官网，运营更新内容，访客可以提交询盘。" maxLength={TEXT_LIMITS.description}
        value={description} onChange={e => setDescription(e.target.value)} aria-describedby="description-note"/>
      <small id="description-note">原文只保存在本机，用来对照核对。当前不会自动分析这段文字，请在后续问题中确认实际需求。</small>
    </label>
    <div className="templategrid">{starters.map(s => <button key={s.seed} className="template" onClick={() => onStart(s.seed, description)}>
      <span className="iconbox accent"><Icon name={s.icon}/></span>
      <b>{fixtures[s.seed].name}</b>
      <span>{fixtures[s.seed].summary}</span>
      <span className="template-fit">适合：{s.fits}</span>
      <span className="templatelink">使用此模板 <Icon name="arrow" size={15}/></span>
    </button>)}</div>
    <div className="templatefoot">
      <button className="linkbutton" onClick={() => onStart('contradiction', description)}>打开硬约束冲突示例 <Icon name="right" size={14}/></button>
      <span>不创建网站 · 不部署 · 不产生 API 费用</span>
    </div>
    {replacing && <p className="hint warn"><Icon name="alert" size={16}/>此版本一次保存一个项目。开始新场景会覆盖本机项目，建议先导出 JSON 备份。</p>}
  </section>;
}
