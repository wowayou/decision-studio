import { useLayoutEffect, useRef } from 'react';
import { statusText, type NodeId, type Qid, type Session } from '../core/types';
import { graph } from '../domain/rules';
import { editableQuestion, isQuestion, nodeValue, upstreamQuestions } from '../domain/inspect';
import { labels, VERSION } from '../domain/website';
import { Icon } from './Icon';

export function DecisionInspector({ session, selected, onSelect, onEdit, focus = false }: {
  session: Session; selected: NodeId; onSelect: (id: NodeId, trigger: HTMLElement) => void;
  onEdit: (id: Qid, trigger: HTMLElement) => void; focus?: boolean;
}) {
  const n = session.result.nodes[selected];
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => { if (focus) heading.current?.focus({ preventScroll: true }); }, [selected, focus]);
  const downstream = graph.downstream(selected).filter(id => id !== selected);
  return <section className="card inspector" aria-label="节点依据">
    <div className="cardhead"><Icon name="branch"/><h2 id="node-info-title" ref={heading} tabIndex={-1} data-dialog-focus>{labels[selected]}</h2>
      <span className={`token status-${n.status}`}>{statusText[n.status]}</span></div>
    <div className="inspectbody">
      <h3>{nodeValue(selected, n)}</h3>
      <p>{n.reason}</p>
      {isQuestion(selected) && editableQuestion(selected, session)
        ? <button className="button secondary" onClick={e => onEdit(selected, e.currentTarget)}><Icon name="edit" size={16}/> 修改这个答案</button>
        : <div className="upstream-edit"><h4>从影响它的条件调整</h4>
          <div className="chips">{upstreamQuestions(selected).map(id => <button key={id} className="button secondary small" disabled={!editableQuestion(id, session)} onClick={e => onEdit(id, e.currentTarget)}>{labels[id]} <Icon name="edit" size={14}/></button>)}</div>
          {selected === 'identity' && <p className="muted">先确定本期账户需求，再确认登录方式。原答不会删除。</p>}
        </div>}
      <details className="node-evidence" open><summary>来源与依赖</summary><dl className="metadata">
        <div><dt>来源</dt><dd>{n.source} · 规则包 {VERSION}</dd></div>
        <div><dt>依赖于</dt><dd>{n.inputs.length ? n.inputs.map(id => <button className="linkbutton" key={id} onClick={e => onSelect(id, e.currentTarget)}>{labels[id]}</button>) : '用户输入或模板默认'}</dd></div>
        <div><dt>可能影响</dt><dd>{downstream.length ? downstream.map(id => <button className="linkbutton" key={id} onClick={e => onSelect(id, e.currentTarget)}>{labels[id]}</button>) : '没有下游节点'}</dd></div>
      </dl></details>
    </div>
  </section>;
}
