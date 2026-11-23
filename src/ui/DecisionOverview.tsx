import { useState, type ReactNode } from 'react';
import { ids, statusText, type Qid, type Session } from '../core/types';
import { editableQuestion, guideProgress } from '../domain/inspect';
import { formatValue, labels } from '../domain/website';
import { Icon } from './Icon';

/** Progress plus a shortcut to every raw decision; editing from here returns to the current view. */
export function DecisionOverview({ session, onEdit, actions }: {
  session: Session; onEdit: (id: Qid, trigger: HTMLElement) => void; actions?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const progress = guideProgress(session, null);
  const pending = session.result.assumptions.length;
  return <section className="card overview" aria-label="决策进度">
    <div className="overview-head">
      <div className="overview-progress">
        <p><b>已确认 {progress.confirmed} / {progress.total}</b> 项关键条件{pending ? ` · ${pending} 项待核对` : ''}</p>
        <progress value={progress.confirmed} max={progress.total} aria-label="已确认的关键条件"/>
      </div>
      {actions && <div className="overview-actions">{actions}</div>}
    </div>
    <button className="disclosure" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="all-decisions">
      <Icon name={open ? 'down' : 'right'} size={16}/><b>全部关键决策</b><span>随时修改任一答案，完成后回到当前页面</span>
    </button>
    {open && <div className="allquestions" id="all-decisions">{ids.map(id => {
      const n = session.result.nodes[id], a = session.project.answers[id];
      return <button key={id} disabled={!editableQuestion(id, session)} onClick={e => onEdit(id, e.currentTarget)}>
        <span className="allquestions-text">{labels[id]}<small>{formatValue(id, a.value)}</small></span>
        <span className={`token status-${n.status}`}>{n.status === 'unknown' && a.source.type === 'user' ? '已暂留未知' : statusText[n.status]}</span>
        <Icon name="edit" size={15}/>
      </button>;
    })}</div>}
  </section>;
}
