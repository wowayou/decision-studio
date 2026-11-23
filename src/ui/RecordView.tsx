import { ids, statusText, type Qid, type Session } from '../core/types';
import { editableQuestion } from '../domain/inspect';
import { fixtures, formatValue, labels } from '../domain/website';
import { Icon } from './Icon';

const when = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('zh-CN', { hour12: false });
};

export function RecordView({ session, onEdit, onClear }: {
  session: Session; onEdit: (id: Qid, trigger: HTMLElement) => void; onClear: () => void;
}) {
  const p = session.project, r = session.result;
  return <>
    <section className="card record">
      <div className="cardhead"><Icon name="history"/><h2>输入与来源</h2><span className="token">修订 {p.revision}</span></div>
      <div className="recordbody">
        <p className="meta">项目格式 {p.schemaVersion} · 网站规则包 {p.domainPackVersion} · AI 未启用</p>
        {p.description && <blockquote className="description"><b>需求原文</b>{p.description}</blockquote>}
        {ids.map(id => {
          const n = r.nodes[id], a = p.answers[id];
          return <div className="recordrow" key={id}>
            <div>
              <b>{labels[id]}</b>
              <p>{formatValue(id, a.value)}</p>
              <small>{n.reason}</small>
              <small>来源 {n.source} · <time dateTime={a.updatedAt}>{when(a.updatedAt)}</time></small>
              {a.source.type === 'user' && <small>模板起步值：{formatValue(id, fixtures[p.seed].values[id])}</small>}
            </div>
            <div className="record-actions">
              <span className={`token status-${n.status}`}>{statusText[n.status]}</span>
              <button className="button ghost small" disabled={!editableQuestion(id, session)} onClick={e => onEdit(id, e.currentTarget)}>修改 <Icon name="edit" size={14}/></button>
            </div>
          </div>;
        })}
      </div>
    </section>
    <section className="card record">
      <div className="cardhead"><Icon name="branch"/><h2>变更与传播记录</h2><span className="token">确定性规则</span></div>
      <div className="recordbody">
        {!p.log.length && <p className="muted">还没有用户修改。当前答案来自场景模板。</p>}
        <ol className="timeline">{p.log.slice().reverse().map(e => <li className="logentry" key={e.revision}>
          <span className="logrevision">r{e.revision}</span>
          <div>
            <b>{labels[e.field]}：{formatValue(e.field, e.before.value)} → {formatValue(e.field, e.after.value)}</b>
            <p>重算节点：{e.affected.map(id => labels[id]).join('、')}</p>
            {!!e.stale.length && <p className="warn-text">已失效但保留原答：{e.stale.map(id => labels[id]).join('、')}</p>}
            <small><time dateTime={e.at}>{when(e.at)}</time></small>
          </div>
        </li>)}</ol>
      </div>
    </section>
    <section className="danger-zone">
      <div><b>本机数据</b><p>项目保存在当前浏览器，不是云端备份。清除浏览器数据可能丢失项目，请定期导出 JSON。</p></div>
      <button className="button danger" onClick={onClear}><Icon name="trash" size={16}/> 清空本机项目</button>
    </section>
  </>;
}
