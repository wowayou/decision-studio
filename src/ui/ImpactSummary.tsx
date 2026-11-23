import { statusText, type Qid, type Seed } from '../core/types';
import { type Impact } from '../core/impact';
import { fixtures, formatValue, labels } from '../domain/website';
import { feasibilityText } from '../domain/report';
import { Icon } from './Icon';

const sourceLabel = (source: string) => fixtures[source as Seed]?.name ? `模板：${fixtures[source as Seed].name}` : source === '本机用户' ? '用户主动回答' : source;

/** A projection of two real evaluations (before/after); it never stores facts of its own. */
export function ImpactSummary({ impact, preview = false, onEdit }: { impact: Impact; preview?: boolean; onEdit?: (id: Qid, trigger: HTMLElement) => void }) {
  const valueChanged = formatValue(impact.field, impact.before.value) !== formatValue(impact.field, impact.after.value);
  const changedNames = impact.nodes.map(n => labels[n.id]);
  return <section className={`impact ${preview ? 'preview' : 'applied'}`} aria-label={preview ? '影响预览' : '变更影响'}>
    <div className="impact-heading">
      <Icon name={preview ? 'branch' : 'check'} size={16}/>
      <b>{preview ? '应用前预览' : `${labels[impact.field]}已应用`}</b>
      <span className="token">{preview ? '尚未应用' : '结果已更新'}</span>
    </div>
    <p className="impact-answer">{valueChanged
      ? <>{formatValue(impact.field, impact.before.value)} <span aria-hidden="true">→</span><span className="sr">改为</span> {formatValue(impact.field, impact.after.value)}</>
      : <>答案保持「{formatValue(impact.field, impact.after.value)}」{impact.before.status !== impact.after.status && `，状态 ${statusText[impact.before.status]} → ${statusText[impact.after.status]}`}</>}</p>
    <p className="impact-brief">{changedNames.length
      ? `${changedNames.slice(0, 3).join('、')}${changedNames.length > 3 ? `等 ${changedNames.length} 项` : ''}更新`
      : '下游结果没有变化'} · 可评估方向 {impact.beforeCount} → {impact.afterCount}</p>
    {!!impact.afterConflicts.length && <p className="impact-conflict"><Icon name="alert" size={14}/>{preview ? '应用后仍有' : '仍有'}硬约束冲突，不能据此选定方案。</p>}
    {!!impact.followUps.length && <div className="impact-followups">{preview
      ? <span>还会开放待确认项：{impact.followUps.map(id => labels[id]).join('、')}</span>
      : onEdit && impact.followUps.map(id => <button key={id} className="linkbutton" onClick={e => onEdit(id, e.currentTarget)}>可接着确认：{labels[id]} <Icon name="arrow" size={14}/></button>)}</div>}
    <details><summary>查看{preview ? '将发生的' : '本次'}变化与保留项</summary>
      <div className="impact-details">
        <p>答案状态：{statusText[impact.before.status]} → {statusText[impact.after.status]}</p>
        <p>来源：{sourceLabel(impact.before.source)} → {sourceLabel(impact.after.source)}</p>
        <p>参与重算 {impact.affected.length} 个节点；实际改变 {impact.nodes.length} 项下游结果。</p>
        {!!impact.nodes.length && <ul>{impact.nodes.map(n => <li key={n.id}><b>{labels[n.id]}</b>：{formatValue(n.id, n.before.value)} → {formatValue(n.id, n.after.value)}
          {n.before.status !== n.after.status && <small>（{statusText[n.before.status]} → {statusText[n.after.status]}）</small>}</li>)}</ul>}
        {!!impact.candidates.length && <><h4>方案变化</h4><ul>{impact.candidates.map(c => <li key={c.id}><b>{c.after.name}</b>：
          {c.before.feasible !== c.after.feasible ? `${feasibilityText(c.before)} → ${feasibilityText(c.after)}` : '组件、前提或适配发生变化'}
          {c.beforePosition >= 0 && c.afterPosition >= 0 && c.beforePosition !== c.afterPosition ? `；展示次序 ${c.beforePosition + 1} → ${c.afterPosition + 1}` : ''}</li>)}</ul>
          <small>次序变化不代表唯一最优，所有方向仍需核对实施前提与成本。</small></>}
        {!!impact.preserved.length && <p>保留已确认答案：{impact.preserved.map(id => labels[id]).join('、')}。</p>}
        {!!impact.beforeConflicts.length && !impact.afterConflicts.length && <p>原有硬约束冲突已解除。</p>}
      </div>
    </details>
  </section>;
}
