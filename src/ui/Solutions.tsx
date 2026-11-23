import { useState, type ReactNode } from 'react';
import { capabilityIds, statusText, type Candidate, type Fit, type Session } from '../core/types';
import { feasibilityText, fitText } from '../domain/report';
import { formatValue, labels, VERSION } from '../domain/website';
import { Icon, type IconName } from './Icon';

const candidateIcon = (id: string): IconName => id === 'static_content' ? 'globe' : id === 'traditional_cms' ? 'layers' : 'terminal';
const feasibilityTone = (c: Candidate) => c.feasible === true ? 'ok' : c.feasible === false ? 'danger' : 'warn';

function FitChip({ label, fit }: { label: string; fit: Fit }) {
  return <span className={`fit fit-${fit}`}>{label}<b>{fitText[fit]}</b></span>;
}
function Feasibility({ candidate }: { candidate: Candidate }) {
  return <span className={`token ${feasibilityTone(candidate)}`}>{feasibilityText(candidate)}</span>;
}

/** Side-by-side view of the open directions. Discrete fit levels only, no invented scores. */
function Comparison({ open }: { open: Candidate[] }) {
  const rows: { label: string; cell: (c: Candidate) => ReactNode }[] = [
    { label: '硬条件', cell: c => <Feasibility candidate={c}/> },
    { label: '低维护', cell: c => <span className={`fit-text fit-${c.fit.maintenance}`}>{fitText[c.fit.maintenance]}</span> },
    { label: '后续扩展', cell: c => <span className={`fit-text fit-${c.fit.extension}`}>{fitText[c.fit.extension]}</span> },
    { label: '成本', cell: () => <span className="fit-text fit-unknown">待核实</span> },
    { label: '主要取舍', cell: c => c.tradeoff },
    { label: '谁来维护', cell: c => c.owner },
  ];
  return <div className="comparison-scroll" tabIndex={0} role="region" aria-label="方案对比表，可横向滚动">
    <table className="comparison">
      <caption className="sr">可继续评估方向的对比</caption>
      <thead><tr><th scope="col"><span className="sr">比较项</span></th>{open.map(c => <th scope="col" key={c.id}><Icon name={candidateIcon(c.id)} size={16}/> {c.name}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th>{open.map(c => <td key={c.id}>{row.cell(c)}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

export function Solutions({ session, compact = false, onOpen }: { session: Session; compact?: boolean; onOpen?: () => void }) {
  const [showAssumptions, setShowAssumptions] = useState(!compact);
  const r = session.result, open = r.candidates.filter(c => c.feasible !== false), excluded = r.candidates.filter(c => c.feasible === false);
  return <section className={compact ? 'card draft' : 'solutions'} aria-label="方案草案">
    {compact && <div className="cardhead"><span className="iconbox accent"><Icon name="layers"/></span><h2>方案草案</h2><span className="token warn">有条件</span></div>}
    <div className={compact ? 'draftbody' : 'solutions-body'}>
      <p className="orderreason"><Icon name="info" size={15}/>{r.orderReason}</p>
      {!open.length && <div className="empty-state"><Icon name="shield"/><div><b>当前没有可继续评估的方案</b><p>请先解决冲突或缩小网站范围。系统不会放宽你的硬约束。</p></div></div>}
      {!compact && open.length > 1 && <Comparison open={open}/>}
      <div className="candidategrid">{open.map(c => <article key={c.id} className="candidate" data-testid={`candidate-${c.id}`} aria-labelledby={`candidate-${c.id}-${compact ? 'c' : 'f'}`}>
        <div className="candidatehead">
          <span className="iconbox accent small"><Icon name={candidateIcon(c.id)} size={16}/></span>
          <div><h3 id={`candidate-${c.id}-${compact ? 'c' : 'f'}`}>{c.name}</h3><Feasibility candidate={c}/></div>
        </div>
        <p className="candidate-description">{c.description}</p>
        <div className="fitrow"><FitChip label="低维护" fit={c.fit.maintenance}/><FitChip label="扩展" fit={c.fit.extension}/><FitChip label="成本" fit="unknown"/></div>
        {!compact && <div className="candidatecontent">
          <h4>本期组件 <span className="token">规则组合</span></h4>
          <ul>{c.components.map(s => <li key={s}>{s}</li>)}</ul>
          <h4>取舍</h4><p>{c.tradeoff}</p>
          <h4>谁来维护</h4><p>{c.owner}</p>
          <h4>关键风险</h4><p>{c.risk}</p>
          <details><summary>适用前提与规则依据</summary>
            <ul>{c.assumptions.map(a => <li key={a}>{a}</li>)}<li>所有系统默认与未知条件仍需核对。</li></ul>
            <p className="sourceline">组合规则 {c.ruleId} @ {VERSION}</p>
            <p className="sourceline">输入：{c.inputs.map(id => labels[id]).join('、')}</p>
          </details>
        </div>}
        {compact && c.assumptions[0] && <p className="candidateassumption">{c.assumptions[0]}</p>}
      </article>)}</div>
      <div className="assumptions">
        <button className="disclosure" onClick={() => setShowAssumptions(!showAssumptions)} aria-expanded={showAssumptions}>
          <Icon name={showAssumptions ? 'down' : 'right'} size={16}/><b>{r.assumptions.length} 项默认或待核对事项</b>
        </button>
        {showAssumptions && <ul>{r.assumptions.map(s => <li key={s}>{s}</li>)}</ul>}
      </div>
      {!!excluded.length && <details className="excluded"><summary>已排除的方向（{excluded.length}）</summary>
        {excluded.map(c => <div key={c.id}><b>{c.name}</b><ul>{c.hardFailures.map(s => <li key={s}>{s}</li>)}</ul></div>)}</details>}
      {!compact && <section className="card capabilitylist" aria-labelledby="capability-title">
        <div className="cardhead"><Icon name="branch"/><h2 id="capability-title">自动补全的能力与配置</h2><span className="token">可追溯</span></div>
        <div className="capabilitybody">{capabilityIds.map(id => { const n = r.nodes[id]; return <div key={id} className="capability" data-testid={`capability-${id}`}>
          <span className={`token status-${n.status}`}>{statusText[n.status]}</span>
          <div><h4>{labels[id]} · {formatValue(id, n.value)}</h4><p>{n.reason}</p>
            <small>来源 {n.source} @ {VERSION} · 输入 {n.inputs.map(input => labels[input]).join('、')}</small></div>
        </div>; })}</div>
      </section>}
      {!compact && <section className="card phases"><h3>当前与未来分开考虑</h3>
        <p>本期只构建已选方向所需的组件；任何默认配置都需在实际实施前核对。</p>
        <p>{session.project.answers.login.value === 'later' ? '未来可能增加：访客账户、身份认证与数据服务。未列为本期必做。' : '未来需求变化时，重新评估账户、数据与维护责任。'}</p>
        <p className="muted">没有实时服务价格，不能断言符合预算。导出中包含待核实清单。</p></section>}
      {compact && <button className="button secondary full" onClick={onOpen}>查看方案与依据 <Icon name="arrow" size={16}/></button>}
    </div>
  </section>;
}
