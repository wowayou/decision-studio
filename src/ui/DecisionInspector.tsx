import { useLayoutEffect, useRef } from 'react';
import { ids, statusText, type NodeId, type NodeResult, type Qid, type Session } from '../core/types';
import { activeIdentity, graph } from '../domain/rules';
import { formatValue, labels, VERSION } from '../domain/website';
import { Icon } from './Icon';

export function editableQuestion(id: NodeId, session: Session): boolean {
  return ids.includes(id as Qid) && (id !== 'identity' || activeIdentity(session.result.nodes));
}
export function upstreamQuestions(id: NodeId): Qid[] {
  const seen = new Set<NodeId>();
  function visit(key: NodeId) {
    if (seen.has(key)) return;
    seen.add(key); graph.inputs[key].forEach(visit);
  }
  visit(id);
  return ids.filter(key => seen.has(key));
}
export function nodeValue(id: NodeId, node: NodeResult): string {
  return node.status === 'not_applicable' && node.value === null ? '本期无需选择' : formatValue(id, node.value);
}
export function DecisionInspector({ session, selected, onSelect, onEdit, focus = false }: {
  session: Session; selected: NodeId; onSelect: (id: NodeId, trigger: HTMLElement) => void;
  onEdit: (id: Qid, trigger: HTMLElement) => void; focus?: boolean;
}) {
  const n = session.result.nodes[selected];
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => { if (focus) heading.current?.focus({ preventScroll: true }); }, [selected, focus]);
  const downstream = graph.downstream(selected).filter(id => id !== selected);
  return <section className="card inspector" aria-label="节点依据">
    <div className="cardhead"><Icon name="branch"/><h2 id="node-info-title" ref={heading} tabIndex={-1} data-dialog-focus>{labels[selected]}</h2><span className={`token status-${n.status}`}>{statusText[n.status]}</span></div>
    <div className="inspectbody"><h3>{nodeValue(selected, n)}</h3><p>{n.reason}</p>
      {editableQuestion(selected, session) ? <button className="secondary" onClick={e => onEdit(selected as Qid, e.currentTarget)}><Icon name="edit" size={15}/> 修改这个答案</button>
        : <div className="upstream-edit"><h4>从影响它的条件调整</h4>{upstreamQuestions(selected).map(id => <button key={id} className="secondary" disabled={!editableQuestion(id, session)} onClick={e => onEdit(id, e.currentTarget)}>{labels[id]} <Icon name="edit" size={13}/></button>)}
          {selected === 'identity' && <p className="muted">先确定本期账户需求，再确认登录方式。原答不会删除。</p>}
        </div>}
      <details className="node-evidence" open><summary>来源与依赖</summary><dl className="metadata">
        <div><dt>来源</dt><dd>{n.source} · 规则包 {VERSION}</dd></div>
        <div><dt>依赖于</dt><dd>{n.inputs.length ? n.inputs.map(id => <button className="textbutton" key={id} onClick={e => onSelect(id, e.currentTarget)}>{labels[id]}</button>) : '用户输入或模板默认'}</dd></div>
        <div><dt>可能影响</dt><dd>{downstream.length ? downstream.map(id => <button className="textbutton" key={id} onClick={e => onSelect(id, e.currentTarget)}>{labels[id]}</button>) : '没有下游节点'}</dd></div>
      </dl></details>
    </div>
  </section>;
}
