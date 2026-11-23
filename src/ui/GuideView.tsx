import type { Qid, Session, Value } from '../core/types';
import { editableQuestion } from '../domain/inspect';
import type { QuestionDraft } from './draft';
import { Icon } from './Icon';
import { QuestionCard } from './QuestionCard';
import { Solutions } from './Solutions';

/** Navigation history only. Going back never undoes an applied answer. */
export interface GuidePosition { current: Qid | null; back: Qid[]; forward: (Qid | null)[] }

export function GuideView({ session, guide, draftFor, active, focusKey, canPrevious, onDraft, onAnswer, onPrevious, onOpenSolutions, onFocusDraft }: {
  session: Session; guide: GuidePosition; draftFor: (id: Qid) => QuestionDraft; active: boolean; focusKey: number; canPrevious: boolean;
  onDraft: (id: Qid, draft: QuestionDraft) => void; onAnswer: (id: Qid, value: Value) => string | null;
  onPrevious: () => void; onOpenSolutions: () => void; onFocusDraft: (element: HTMLElement) => void;
}) {
  const current = guide.current;
  const openCount = session.result.candidates.filter(c => c.feasible !== false).length;
  return <>
    <button className="draft-peek" onClick={onOpenSolutions}><Icon name="layers" size={16}/>
      <span>当前有条件草案 · {openCount} 个可评估方向</span><span className="draft-peek-go">查看 <Icon name="arrow" size={14}/></span></button>
    <div className="guidegrid">
      <div className="guideleft">
        {current && editableQuestion(current, session)
          ? <QuestionCard key={`guide-${current}`} session={session} id={current} draft={draftFor(current)}
            onDraft={draft => onDraft(current, draft)} onAnswer={onAnswer} onPrevious={onPrevious} canPrevious={canPrevious}
            focusKey={focusKey} active={active} onFocus={onFocusDraft}/>
          : <section className="card complete">
            <span className="iconbox accent"><Icon name="check"/></span>
            <h2>关键问题已回答，可以先看方案。</h2>
            <p>“尚不确定”仍然是开放条件；导出会明确列出未确认事项。</p>
            <div className="actions">
              <button className="button secondary" disabled={!canPrevious} onClick={onPrevious}>上一题</button>
              <button className="button primary" onClick={onOpenSolutions}>查看方案 <Icon name="arrow" size={16}/></button>
            </div>
          </section>}
        <p className="hint"><Icon name="shield" size={16}/>来源、硬约束和未知条件都会保留。“取消”只放弃当前草稿，“上一题”只是回看，不撤销答案。</p>
      </div>
      <Solutions session={session} compact onOpen={onOpenSolutions}/>
    </div>
  </>;
}
