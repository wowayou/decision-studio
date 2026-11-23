import type { ReactNode } from 'react';
import { ids, type Qid, type Session } from '../core/types';
import { activeIdentity } from '../domain/rules';
import { Icon, type IconName } from './Icon';
import type { ExternalChange } from './useLocalProject';

export function Notice({ tone, icon, title, children, label, live = 'alert', className = '', onDismiss }: {
  tone: 'danger' | 'warn' | 'info'; icon?: IconName; title?: ReactNode; children?: ReactNode;
  label?: string; live?: 'alert' | 'status'; className?: string; onDismiss?: () => void;
}) {
  return <section className={`notice ${tone} ${className}`} role={live} aria-label={label}>
    <Icon name={icon ?? (tone === 'info' ? 'info' : 'alert')} size={18}/>
    <div className="notice-body">{title && <b>{title}</b>}{children}</div>
    {onDismiss && <button className="iconbutton" aria-label="关闭提示" onClick={onDismiss}><Icon name="x" size={16}/></button>}
  </section>;
}

/** Project-level blockers and reminders derived from the current evaluation, never from the last log entry. */
export function ProjectNotices({ session, onEdit }: { session: Session; onEdit: (id: Qid, trigger: HTMLElement) => void }) {
  const r = session.result;
  const stale = ids.some(id => r.nodes[id].status === 'stale');
  const accounts = activeIdentity(r.nodes);
  return <>
    {!!r.conflicts.length && <Notice tone="danger" icon="shield" label="硬约束冲突" title="硬约束冲突 · 暂不能选定方案">
      {r.conflicts.map(s => <p key={s}>{s}</p>)}
      <button className="linkbutton" onClick={e => onEdit('limits', e.currentTarget)}>检查硬性限制 <Icon name="arrow" size={14}/></button>
    </Notice>}
    {r.coverage && <Notice tone="danger" icon="info"><p>{r.coverage}</p></Notice>}
    {stale && <Notice tone="warn" live="status" className="stale-notice"
      title={accounts ? '原登录方式仍待重新确认，原值已保留。' : '已确认的登录方式现在不适用，原值已保留。'}>
      <p>{accounts ? '本期账户已启用，原登录方式仍需要重新确认。' : '再次启用本期账户后，原登录方式也需要重新确认。'}</p>
      <button className="linkbutton" onClick={e => onEdit(accounts ? 'identity' : 'login', e.currentTarget)}>
        {accounts ? '重新确认登录方式' : '调整访客账户'} <Icon name="arrow" size={14}/></button>
    </Notice>}
  </>;
}

export function ExternalChangeNotice({ change, hasSession, onLoad, onKeep }: {
  change: ExternalChange; hasSession: boolean; onLoad: () => void; onKeep: () => void;
}) {
  const cleared = change.raw === null;
  return <Notice tone="warn" icon="refresh" title={cleared ? '另一个标签页清空了本机项目' : '另一个标签页修改了本机项目'}>
    <p>{hasSession ? '为避免互相覆盖，此页已暂停自动保存；暂停期间应用的修改只保存在此页内存中。请选择保留哪一份。' : '可以载入那份项目继续工作。'}</p>
    <div className="actions">
      <button className="button secondary" onClick={onLoad}>{cleared ? '同步清空此页' : '载入最新版本'}</button>
      {hasSession && <button className="button secondary" onClick={onKeep}>{cleared ? '保留此页并重新保存' : '保留此页并覆盖'}</button>}
    </div>
  </Notice>;
}
