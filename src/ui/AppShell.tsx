import { useEffect, useRef, useState } from 'react';
import { VERSION } from '../domain/website';
import { Icon, type IconName } from './Icon';
import type { SaveStatus } from './useLocalProject';

export type View = 'guide' | 'graph' | 'solutions' | 'record';
export const views: { id: View; label: string; short: string; icon: IconName; summary: string }[] = [
  { id: 'guide', label: '引导决策', short: '引导', icon: 'guide', summary: '一次确认一个关键条件。可以暂留未知，随时查看方案。' },
  { id: 'graph', label: '决策依赖图', short: '依赖图', icon: 'graph', summary: '输入节点可就地修改；规则节点可追溯影响它的条件。' },
  { id: 'solutions', label: '方案与取舍', short: '方案', icon: 'solutions', summary: '先检查硬约束，再比较维护与扩展。不给出未经验证的唯一最优方案。' },
  { id: 'record', label: '决策记录', short: '记录', icon: 'history', summary: '答案原值、来源、规则版本，以及每次修改实际重算了哪些节点。' },
];

export function Sidebar({ active, hasSession, onNavigate, onTemplates }: {
  active: View | null; hasSession: boolean; onNavigate: (view: View) => void; onTemplates: () => void;
}) {
  return <aside className="sidebar">
    <div className="sidebar-top">
      <a href="#main" className="brand"><span className="brandmark"><Icon name="studio" size={20}/></span>
        <span>Decision Studio<small>让每个选择都有依据</small></span></a>
      <button className="button ghost sidebar-templates" onClick={onTemplates}><Icon name="template" size={16}/> 场景模板</button>
    </div>
    <nav className="nav" aria-label="工作台视图">
      <div className="navlabel">工作空间</div>
      {views.map(v => <button key={v.id} className="navitem" aria-current={active === v.id ? 'page' : undefined} disabled={!hasSession} onClick={() => onNavigate(v.id)}>
        <Icon name={v.icon} size={18}/><span className="nav-full">{v.label}</span><span className="nav-short" aria-hidden="true">{v.short}</span>
      </button>)}
    </nav>
    {!hasSession && <p className="nav-locked">选择一个场景后即可使用这些视图。</p>}
    <div className="nav nav-project">
      <div className="navlabel">项目</div>
      <button className="navitem" aria-current={active === null ? 'page' : undefined} onClick={onTemplates}><Icon name="template" size={18}/>场景模板</button>
    </div>
    <div className="sidebar-foot">
      <p className="localstatus"><span className="statusdot" aria-hidden="true"/>本地优先 · 无 AI 调用</p>
      <p>规则在浏览器中求值，不上传需求。清除浏览器数据会丢失本机项目，请定期导出 JSON。</p>
      <p className="sideversion">网站规则包 {VERSION}</p>
    </div>
  </aside>;
}

export function saveText(status: SaveStatus) {
  switch (status.kind) {
    case 'saved': return `已保存到本机 · r${status.revision}`;
    case 'failed': return '保存失败';
    case 'paused': return '已暂停自动保存';
    case 'idle': return '';
  }
}

export function TopBar({ status, dirty, hasSession, onImport, onExport }: {
  status: SaveStatus; dirty: boolean; hasSession: boolean;
  onImport: (file: File | undefined) => void; onExport: (kind: 'json' | 'md') => void;
}) {
  const text = saveText(status);
  const tone = status.kind === 'failed' ? 'danger' : status.kind === 'paused' ? 'warn' : 'ok';
  return <header className="topbar">
    <div className="topbar-status">
      {hasSession && text && <span className={`savestatus ${tone}`} role="status">
        <Icon name={status.kind === 'saved' ? 'check' : 'alert'} size={15}/>{text}</span>}
      {dirty && <span className="token warn">另有未应用草稿</span>}
    </div>
    <div className="topactions">
      <label className="button secondary importbutton"><Icon name="upload" size={16}/><span className="label-wide">导入</span>
        <input className="sr" aria-label="导入 JSON 项目" type="file" accept=".json,application/json"
          onChange={e => { onImport(e.target.files?.[0]); e.target.value = ''; }}/></label>
      <ExportMenu disabled={!hasSession} onExport={onExport}/>
    </div>
  </header>;
}

function ExportMenu({ disabled, onExport }: { disabled: boolean; onExport: (kind: 'json' | 'md') => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!wrap.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const choose = (kind: 'json' | 'md') => { setOpen(false); onExport(kind); };
  return <div className="exportwrap" ref={wrap}>
    <button ref={trigger} className="button secondary" disabled={disabled} aria-expanded={open} aria-controls="export-menu" onClick={() => setOpen(!open)}>
      <Icon name="download" size={16}/><span className="label-wide">导出</span><Icon name="down" size={14}/></button>
    {open && <div className="popover" id="export-menu">
      <p>只导出已应用的答案，不含未应用草稿</p>
      <button className="menuitem" aria-label="JSON 项目备份" aria-describedby="export-json-note" onClick={() => choose('json')}>
        <Icon name="folder" size={16}/><span>JSON 项目备份<small id="export-json-note">可再次导入，恢复全部来源与记录</small></span></button>
      <button className="menuitem" aria-label="Markdown 草案" aria-describedby="export-md-note" onClick={() => choose('md')}>
        <Icon name="layers" size={16}/><span>Markdown 草案<small id="export-md-note">给人阅读的有条件方案与待核实清单</small></span></button>
    </div>}
  </div>;
}
