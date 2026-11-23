import { useState } from 'react';
import { capabilityIds, statusText, type Session } from '../core/types';
import { feasibilityText, fitText } from '../domain/report';
import { formatValue, labels, VERSION } from '../domain/website';
import { Icon } from './Icon';

export function Solutions({ session, compact = false, onOpen }: { session: Session; compact?: boolean; onOpen?: () => void }) {
  const [showAssumptions, setShowAssumptions] = useState(!compact);
  const r = session.result, open = r.candidates.filter(c => c.feasible !== false), excluded = r.candidates.filter(c => c.feasible === false);
  return <section className={compact ? 'card draft' : 'solutions'} aria-label="方案草案">
    {compact ? <div className="cardhead"><span className="iconbox green"><Icon name="layers"/></span><h2>方案草案</h2><span className="token amber">有条件</span></div> : <div className="sectionheading"><div><h2>多个方向，明确的取舍</h2><p className="muted">先检查硬约束，再比较维护与扩展。这里不会给出未经验证的唯一最优方案。</p></div><span className="token amber">有条件草案</span></div>}
    <div className={compact ? 'draftbody' : ''}>
      <p className="orderreason">{r.orderReason}</p>
      {!open.length && <div className="warning"><Icon name="shield"/><div><b>当前没有可继续评估的方案</b><p>请先解决冲突或缩小网站范围。系统不会放宽你的硬约束。</p></div></div>}
      <div className="candidategrid">{open.map((c) => <article key={c.id} className="candidate" data-testid={`candidate-${c.id}`}>
        <div className="candidatehead"><span className="direction"><Icon name={c.id === 'static_content' ? 'globe' : c.id === 'traditional_cms' ? 'layers' : 'terminal'} size={15}/></span><div><h3>{c.name}</h3><span className={c.feasible === true ? 'feasibility' : 'feasibility pending'}>{feasibilityText(c)}</span></div><Icon name={c.id === 'static_content' ? 'globe' : c.id === 'traditional_cms' ? 'layers' : 'terminal'}/></div>
        <p>{c.description}</p><div className="fitrow"><span>低维护 <b>{fitText[c.fit.maintenance]}</b></span><span>扩展 <b>{fitText[c.fit.extension]}</b></span><span>成本 <b>待核实</b></span></div>
        {!compact && <><div className="candidatecontent"><h4>本期组件 <span className="token">规则组合</span></h4><ul>{c.components.map(s => <li key={s}>{s}</li>)}</ul><p className="sourceline">来源 {c.ruleId} @ {VERSION}</p><h4>取舍</h4><p>{c.tradeoff}</p><h4>谁来维护</h4><p>{c.owner}</p><h4>关键风险</h4><p>{c.risk}</p></div><details><summary>适用前提与输入依据</summary><ul>{c.assumptions.map(a => <li key={a}>{a}</li>)}<li>所有系统默认与未知条件仍需核对。</li></ul><p className="sourceline">输入：{c.inputs.map(id => labels[id]).join('、')}</p></details></>}
        {compact && c.assumptions[0] && <p className="candidateassumption">{c.assumptions[0]}</p>}
      </article>)}</div>
      <div className="assumptions"><button className="disclosure" onClick={() => setShowAssumptions(!showAssumptions)} aria-expanded={showAssumptions}><Icon name="info" size={16}/><span>{r.assumptions.length} 项默认或待核对事项</span><Icon name={showAssumptions ? 'down' : 'right'} size={14}/></button>
        {showAssumptions && <ul>{r.assumptions.map(s => <li key={s}>{s}</li>)}</ul>}
      </div>
      {!!excluded.length && <details className="excluded"><summary>已排除的方向（{excluded.length}）</summary>{excluded.map(c => <div key={c.id}><b>{c.name}</b><ul>{c.hardFailures.map(s => <li key={s}>{s}</li>)}</ul></div>)}</details>}
      {!compact && <section className="card capabilitylist"><div className="cardhead"><Icon name="branch"/><h2>自动补全的能力与配置</h2><span className="token">可追溯</span></div><div className="capabilitybody">{capabilityIds.map(id => { const n = r.nodes[id]; return <div key={id} className="capability" data-testid={`capability-${id}`}><span className={`token status-${n.status}`}>{statusText[n.status]}</span><div><h4>{labels[id]} · {formatValue(id, n.value)}</h4><p>{n.reason}</p><small>来源 {n.source} @ {VERSION} · 输入 {n.inputs.map(input => labels[input]).join('、')}</small></div></div>; })}</div></section>}
      {!compact && <section className="card phases"><h3>当前与未来分开考虑</h3><p>本期只构建已选方向所需的组件；任何默认配置都需在实际实施前核对。</p><p>{session.project.answers.login.value === 'later' ? '未来可能增加：访客账户、身份认证与数据服务。未列为本期必做。' : '未来需求变化时，重新评估账户、数据与维护责任。'}</p><p className="muted">没有实时服务价格，不能断言符合预算。导出中包含待核实清单。</p></section>}
      {compact && <button className="secondary full" onClick={onOpen}>查看方案与依据 <Icon name="arrow" size={15}/></button>}
    </div>
  </section>;
}
