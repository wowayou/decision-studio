import { useEffect, useRef, useState } from 'react';
import { answer, create } from '../core/session';
import { impactBetween, sameValue, type Impact } from '../core/impact';
import { ids, statusText, type NodeId, type Qid, type Seed, type Session, type Value } from '../core/types';
import { activeIdentity } from '../domain/rules';
import { fixtures, formatValue, labels, VERSION } from '../domain/website';
import { markdown } from '../domain/report';
import { download, jsonBackup, KEY, MAX_BYTES, restore, save } from '../storage/project';
import { DependencyGraph } from './DependencyGraph';
import { DecisionInspector, editableQuestion } from './DecisionInspector';
import { draftChanged, draftFromValue, type QuestionDraft } from './draft';
import { ImpactSummary } from './ImpactSummary';
import { Modal } from './Modal';
import { Icon, type IconName } from './Icon';
import { QuestionCard } from './QuestionCard';
import { Solutions } from './Solutions';

type View = 'guide' | 'graph' | 'solutions' | 'record';
interface GuidePosition { current: Qid | null; back: Qid[]; forward: (Qid | null)[] }
const tabs: { id: View; label: string; icon: IconName }[] = [
  { id: 'guide', label: '引导决策', icon: 'guide' }, { id: 'graph', label: '决策依赖图', icon: 'graph' },
  { id: 'solutions', label: '方案与取舍', icon: 'solutions' }, { id: 'record', label: '决策记录', icon: 'history' },
];
const errorText = (e: unknown) => e instanceof Error ? e.message : '操作失败，请保留备份并重试。';
const firstStep = (s: Session | null): GuidePosition => ({ current: s?.result.frontier[0] ?? null, back: [], forward: [] });
function loadLocal() {
  let text: string | null = null;
  try { text = localStorage.getItem(KEY); return { session: text ? restore(text) : null, error: '', raw: null }; }
  catch (e) { return { session: null, error: `本机项目未恢复：${errorText(e)}`, raw: text }; }
}
function useWideGraph() {
  const [wide, setWide] = useState(() => matchMedia('(min-width: 1380px) and (min-height: 700px)').matches);
  useEffect(() => {
    const query = matchMedia('(min-width: 1380px) and (min-height: 700px)');
    const change = () => setWide(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  return wide;
}
function Templates({ onStart, existing }: { onStart: (seed: Seed, description: string) => void; existing: boolean }) {
  const [description, setDescription] = useState('');
  return <section className="card welcome"><span className="token green">网站架构选型 · 本地规则</span><h2>{existing ? '选择新的起步场景' : '先说目标，再做取舍。'}</h2><p>不需要输入技术框架名称。从相近的场景开始，系统补全起步配置，你来确认关键条件。</p>
    <label className="field">需求描述 <span className="muted">（可选）</span><textarea placeholder="例如：做一个多语言企业官网，运营更新内容，访客可以提交询盘。" maxLength={2000} value={description} onChange={e => setDescription(e.target.value)}/><small>原文只保存于本机。当前无 AI 提取，请用后续选项核对实际需求。</small></label>
    <div className="templategrid">{(['b2b-site', 'blog', 'saas'] as Seed[]).map((seed, i) => <button key={seed} className="template" onClick={() => onStart(seed, description)}><span className="iconbox green"><Icon name={['globe', 'edit', 'terminal'][i] as IconName}/></span><b>{fixtures[seed].name}</b><span>{fixtures[seed].summary}</span><span className="templatelink">使用此模板 <Icon name="arrow" size={15}/></span></button>)}</div>
    <div className="templatefoot"><button className="textbutton" onClick={() => onStart('contradiction', description)}>打开硬约束冲突示例 <Icon name="right" size={13}/></button><span>不创建网站 · 不部署 · 不产生 API 费用</span></div>
    {existing && <p className="warningline">此版本一次保存一个项目。切换场景会覆盖本机项目，建议先导出 JSON 备份。</p>}
  </section>;
}

export function App() {
  const [initial] = useState(loadLocal);
  const [session, setSession] = useState<Session | null>(initial.session);
  const [view, setView] = useState<View>('guide');
  const [guide, setGuide] = useState<GuidePosition>(() => firstStep(initial.session));
  const [drafts, setDrafts] = useState<Partial<Record<Qid, QuestionDraft>>>({});
  const [editor, setEditor] = useState<Qid | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeId>('membership');
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [graphInfoOpen, setGraphInfoOpen] = useState(false);
  const [feedback, setFeedback] = useState<Impact | null>(null);
  const [pendingLeave, setPendingLeave] = useState<{ action: () => void } | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const [templates, setTemplates] = useState(!initial.session);
  const [error, setError] = useState(initial.error);
  const [saveState, setSaveState] = useState('');
  const [saveError, setSaveError] = useState('');
  const [exportMenu, setExportMenu] = useState(false);
  const [allQuestions, setAllQuestions] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const lastDraftFocus = useRef<HTMLElement | null>(null);
  const graphScroll = useRef({ left: 0, top: 0 });
  const wideGraph = useWideGraph();
  const modalEditor = editor !== null && (view !== 'graph' || !wideGraph);
  const modalInfo = view === 'graph' && !wideGraph && graphInfoOpen && editor === null;
  const mainHidden = modalEditor || modalInfo || pendingLeave !== null;
  const draftFor = (id: Qid) => drafts[id] ?? draftFromValue(session!.project.answers[id].value);
  const activeId = editor ?? (view === 'guide' && !templates ? guide.current : null);
  const dirty = !!(session && activeId && drafts[activeId] && draftChanged(activeId, drafts[activeId]!, session.project.answers[activeId].value));

  useEffect(() => {
    if (!session) return;
    try { save(localStorage, session); setSaveState(`已保存到本机 · r${session.project.revision}`); setSaveError(''); }
    catch (e) { setSaveState('保存失败'); setSaveError(`修改已应用，但未能保存到本机：${errorText(e)} 请立即导出备份。`); }
  }, [session]);
  function clearDraft(id: Qid) { setDrafts(current => { const next = { ...current }; delete next[id]; return next; }); }
  function restoreFocus() {
    requestAnimationFrame(() => {
      const element = returnFocus.current;
      if (element?.isConnected) element.focus({ preventScroll: true });
      else document.querySelector<HTMLElement>(`[data-testid="node-${selectedNode}"]`)?.focus({ preventScroll: true });
    });
  }
  function closeEditor(closeInfo = true) {
    if (editor) clearDraft(editor);
    setEditor(null); if (closeInfo) setGraphInfoOpen(false);
    restoreFocus();
  }
  function leave(action: () => void) {
    const transition = () => { setDrafts({}); setEditor(null); setGraphInfoOpen(false); action(); };
    if (dirty) setPendingLeave({ action: transition }); else transition();
  }
  function stay() {
    setPendingLeave(null);
    requestAnimationFrame(() => lastDraftFocus.current?.isConnected && lastDraftFocus.current.focus({ preventScroll: true }));
  }
  function navigate(next: View) {
    if (next === view && !templates && !editor) return;
    leave(() => { setView(next); setTemplates(false); setExportMenu(false); });
  }
  function openEdit(id: Qid, trigger: HTMLElement) {
    if (!session || !editableQuestion(id, session)) return;
    if (editor === id) return;
    leave(() => { returnFocus.current = trigger; setEditor(id); if (view === 'graph') { setDetailsOpen(true); setGraphInfoOpen(true); } });
  }
  function selectNode(id: NodeId, trigger: HTMLElement) {
    if (id === selectedNode && editor === id) return;
    const choose = () => {
      returnFocus.current = trigger; setSelectedNode(id); setDetailsOpen(true); setGraphInfoOpen(true);
      if (session && editableQuestion(id, session)) setEditor(id as Qid);
    };
    if (editor === id) { setSelectedNode(id); setDetailsOpen(true); } else leave(choose);
  }
  function moveNext(s: Session) {
    setGuide(position => {
      const forwardIndex = s.result.conflicts.length ? -1 : position.forward.findIndex(id => id === null || editableQuestion(id, s));
      const next = forwardIndex >= 0 ? position.forward[forwardIndex] : s.result.frontier[0] ?? null;
      if (next === position.current) return position;
      return { current: next, back: position.current ? [...position.back, position.current] : position.back,
        forward: forwardIndex >= 0 ? position.forward.slice(forwardIndex + 1) : [] };
    });
    setFocusKey(k => k + 1);
  }
  function previous() {
    if (!session) return;
    leave(() => {
      setGuide(position => {
        let index = position.back.length - 1;
        while (index >= 0 && !editableQuestion(position.back[index], session)) index--;
        return index < 0 ? position : { current: position.back[index], back: position.back.slice(0, index), forward: [position.current, ...position.forward] };
      });
      setFocusKey(k => k + 1);
    });
  }
  function apply(id: Qid, value: Value, guided: boolean): string | null {
    if (!session) return '项目尚未初始化。';
    try {
      const a = session.project.answers[id];
      const unchanged = a.source.type === 'user' && session.result.nodes[id].status !== 'stale' && sameValue(a.value, value);
      const next = unchanged ? session : answer(session, id, value);
      if (!unchanged) { jsonBackup(next); setFeedback(impactBetween(session, next, id)); setSession(next); }
      clearDraft(id); setError('');
      if (guided) moveNext(next);
      else {
        setEditor(null);
        setGuide(position => position.current && !editableQuestion(position.current, next) ? firstStep(next) : position);
        if (view === 'graph' && !wideGraph) {
          setGraphInfoOpen(true);
          requestAnimationFrame(() => document.querySelector<HTMLElement>('#node-info-title')?.focus({ preventScroll: true }));
        } else { setGraphInfoOpen(false); restoreFocus(); }
      }
      return null;
    } catch (e) { return `此变更未应用：${errorText(e)}`; }
  }
  function resetProject(next: Session) {
    setSession(next); setGuide(firstStep(next)); setDrafts({}); setEditor(null); setFeedback(null);
    setSelectedNode('membership'); graphScroll.current = { left: 0, top: 0 };
    setGraphInfoOpen(false); setTemplates(false); setView('guide'); setError(''); setAllQuestions(false);
  }
  function start(seed: Seed, description: string) {
    if ((session || initial.raw) && !window.confirm('切换将覆盖当前本机项目。确认已备份并开始新场景？')) return;
    resetProject(create(seed, description.trim()));
  }
  function exportFile(kind: 'json' | 'md') {
    if (!session) return;
    try { download(`decision-${session.project.seed}-r${session.project.revision}.${kind}`, kind === 'json' ? 'application/json' : 'text/markdown;charset=utf-8', kind === 'json' ? jsonBackup(session) : markdown(session)); setExportMenu(false); }
    catch (e) { setError(errorText(e)); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_BYTES) throw new Error('项目超过 4 MiB 大小限制。');
      const next = restore(await file.text());
      if ((session || initial.raw) && !window.confirm('导入将替换当前本机项目。确认继续？')) return;
      leave(() => resetProject(next));
    } catch (e) { setError(`未导入，当前项目未改变：${errorText(e)}`); }
  }
  function clear() {
    if (!window.confirm('清空本机项目？此操作不能撤销，请先导出 JSON 备份。')) return;
    try { localStorage.removeItem(KEY); setSession(null); setTemplates(true); setSaveState(''); setSaveError(''); setView('guide'); setDrafts({}); setEditor(null); setFeedback(null); setError(''); }
    catch (e) { setError(`未能清空项目：${errorText(e)}`); }
  }
  const canPrevious = !!session && guide.back.some(id => editableQuestion(id, session));
  const answered = session ? ids.filter(id => ['user_confirmed', 'user_approximate'].includes(session.result.nodes[id].status)).length : 0;
  const staleIds = session ? ids.filter(id => session.result.nodes[id].status === 'stale') : [];
  const openCount = session?.result.candidates.filter(c => c.feasible !== false).length ?? 0;
  const editorCard = session && editor ? <QuestionCard key={`edit-${editor}`} session={session} id={editor} draft={draftFor(editor)} mode="edit"
    onDraft={draft => setDrafts(d => ({ ...d, [editor]: draft }))} onAnswer={(id, value) => apply(id, value, false)} onCancel={() => closeEditor()}
    onFocus={element => { lastDraftFocus.current = element; }}/>: null;
  const inspector = session ? <>
    <DecisionInspector session={session} selected={selectedNode} onSelect={selectNode} onEdit={openEdit} focus={modalInfo}/>
    {feedback && <ImpactSummary impact={feedback} onEdit={openEdit}/>}
  </> : null;

  const modalSaveWarning = saveState === '保存失败' ? <div className="alert error" role="alert"><Icon name="info"/><p>本机保存失败。已应用数据仍在内存中，关闭编辑后请导出 JSON 备份。</p></div> : null;
  const visibleError = error || saveError;
  return <>
    <div className="app" inert={mainHidden} aria-hidden={mainHidden || undefined}>
      <aside className="sidebar"><a href="#main" className="brand"><span className="brandmark"><Icon name="studio" size={22}/></span><span>Decision Studio<small>让每个选择都有依据</small></span></a>
        <div className="navgroup"><div className="navlabel">工作空间</div><nav aria-label="工作台视图">{tabs.map(t => <button key={t.id} className={`navitem ${view === t.id && !templates ? 'active' : ''}`} aria-current={view === t.id && !templates ? 'page' : undefined} disabled={!session} onClick={() => navigate(t.id)}><Icon name={t.icon}/>{t.label}{view === t.id && !templates && <span className="navdot"/>}</button>)}</nav></div>
        <div className="navgroup"><div className="navlabel">项目</div><button className="navitem" onClick={() => leave(() => { setTemplates(true); setView('guide'); })}><Icon name="template"/>场景模板</button></div>
        <div className="sidebarfoot"><div className="localstatus"><span className="statusdot"/> 本地优先 · 无 AI</div><p>核心规则不调用外部服务。浏览器数据清除后，本机项目可能丢失。</p><div className="sideversion">网站规则包 {VERSION} <span>P0</span></div></div>
      </aside>
      <div className="workspace"><header className="topbar"><span className="breadcrumb"><Icon name="folder" size={16}/> 我的工作空间 <span>/</span> 网站选型</span>
        <div className="topactions"><label className="importbutton"><Icon name="upload" size={15}/> 导入<input className="sr" aria-label="导入 JSON 项目" type="file" accept=".json,application/json" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }}/></label>
          <div className="exportwrap"><button className="secondary" disabled={!session} aria-expanded={exportMenu} onClick={() => setExportMenu(!exportMenu)}><Icon name="download" size={15}/> 导出 <Icon name="down" size={13}/></button>{exportMenu && <div className="exportmenu"><p>仅导出已应用答案</p><button onClick={() => exportFile('json')}>JSON 项目备份</button><button onClick={() => exportFile('md')}>Markdown 草案</button></div>}</div>
        </div>
      </header>
        <main id="main" className="main">
          <div className="pageheading"><div><div className="eyebrow">WEBSITE ARCHITECTURE</div><h1>{templates ? '把建站需求，变成清晰的方案' : session ? fixtures[session.project.seed].name : '网站架构选型'}</h1><p>{templates ? '规则先行，少量确认，保留你的不确定与取舍。' : '应用答案后自动更新相关能力与方案。查看、取消或返回，不会改写已确认事实。'}</p></div>
            {session && !templates && <div className="savegroup"><div className="savestatus" role="status"><Icon name={saveState === '保存失败' ? 'info' : 'check'} size={15}/>{saveState}</div>{dirty && <span className="token amber">另有未应用草稿</span>}</div>}
          </div>
          {visibleError && <div role="alert" className="alert error"><Icon name="info"/><div>{visibleError}{initial.raw && !session && <button className="textbutton" onClick={() => download('unrestored-project.json', 'application/json', initial.raw!)}>下载原始本机备份</button>}</div><button className="iconbutton" aria-label="关闭提示" onClick={() => { setError(''); setSaveError(''); }}><Icon name="x" size={16}/></button></div>}
          {templates ? <Templates onStart={start} existing={!!session || !!initial.raw}/> : session && <>
            <section className="card questionlist decision-shortcuts"><button className="disclosure" onClick={() => setAllQuestions(!allQuestions)} aria-expanded={allQuestions}><Icon name="guide" size={16}/><b>全部关键决策</b><span>{answered} 项已确认 · {session.result.assumptions.length} 项待核对</span><Icon name={allQuestions ? 'down' : 'right'} size={14}/></button>
              {allQuestions && <div className="allquestions">{ids.map(id => { const n = session.result.nodes[id], a = session.project.answers[id]; return <button key={id} disabled={!editableQuestion(id, session)} onClick={e => openEdit(id, e.currentTarget)}><span>{labels[id]}<small>{formatValue(id, a.value)}</small></span><span className={`token status-${n.status}`}>{n.status === 'unknown' && a.source.type === 'user' ? '已暂留未知' : statusText[n.status]}</span><Icon name="edit" size={13}/></button>; })}</div>}
            </section>
            {!!session.result.conflicts.length && <section className="alert error" role="alert" aria-label="硬约束冲突"><Icon name="shield"/><div><b>硬约束冲突 · 暂不能选定方案</b>{session.result.conflicts.map(s => <p key={s}>{s}</p>)}<button className="textbutton" onClick={e => openEdit('limits', e.currentTarget)}>检查硬性限制 <Icon name="arrow" size={14}/></button></div></section>}
            {session.result.coverage && <section className="alert error" role="alert"><Icon name="info"/>{session.result.coverage}</section>}
            {!!staleIds.length && <section className="alert amber stale-notice" role="status"><Icon name="info"/><div><b>{activeIdentity(session.result.nodes) ? '原登录方式仍待重新确认，原值已保留。' : '已确认的登录方式现在不适用，原值已保留。'}</b><p>{activeIdentity(session.result.nodes) ? '本期账户已启用，原登录方式仍需要重新确认。' : '再次启用本期账户后，原登录方式也需要重新确认。'}</p><button className="textbutton" onClick={e => openEdit(activeIdentity(session.result.nodes) ? 'identity' : 'login', e.currentTarget)}>{activeIdentity(session.result.nodes) ? '重新确认登录方式' : '调整访客账户'} <Icon name="arrow" size={14}/></button></div></section>}
            {feedback && view !== 'graph' && <ImpactSummary impact={feedback} onEdit={openEdit}/>}
            {view === 'guide' && <>
              <div className="journey"><div><span className="step active"><b>01</b> 确认关键条件</span><Icon name="right" size={14}/><button className="step stepbutton" onClick={() => navigate('solutions')}><b>02</b> 先看方案</button><Icon name="right" size={14}/><button className="step stepbutton" onClick={() => exportFile('md')}><b>03</b> 导出已应用草案</button></div><small>可以暂留未知，不必答完才能看方案</small></div>
              <button className="draft-peek" onClick={() => navigate('solutions')}><Icon name="layers" size={16}/><span>当前有条件草案 · {openCount} 个可评估方向</span><span>查看 <Icon name="arrow" size={14}/></span></button>
              <div className="guidegrid"><div className="guideleft">
                {guide.current && editableQuestion(guide.current, session) ? <QuestionCard key={`guide-${guide.current}`} session={session} id={guide.current} draft={draftFor(guide.current)}
                  onDraft={draft => setDrafts(d => ({ ...d, [guide.current!]: draft }))} onAnswer={(id, value) => apply(id, value, true)}
                  onPrevious={previous} canPrevious={canPrevious} focusKey={focusKey} active={!mainHidden}
                  onFocus={element => { lastDraftFocus.current = element; }}/>
                  : <section className="card complete"><span className="iconbox green"><Icon name="check"/></span><h2>关键问题已回答，可以先看方案。</h2><p>“尚不确定”仍然是开放条件；导出会明确列出未确认事项。</p><div className="complete-actions"><button className="secondary" disabled={!canPrevious} onClick={previous}>上一题</button><button className="primary" onClick={() => navigate('solutions')}>查看方案 <Icon name="arrow" size={16}/></button></div></section>}
                <div className="hintline"><Icon name="shield" size={16}/><p>来源、硬约束和未知条件都保留。取消只放弃当前草稿，上一题只是回看，不撤销答案。</p></div>
              </div><Solutions session={session} compact onOpen={() => navigate('solutions')}/></div>
            </>}
            {view === 'graph' && <DependencyGraph session={session} selected={selectedNode} onSelect={selectNode} inspector={modalEditor || modalInfo ? null : editor && wideGraph ? editorCard : inspector}
              detailsOpen={detailsOpen} onToggleDetails={() => leave(() => setDetailsOpen(!detailsOpen))}
              changed={feedback ? [feedback.field, ...feedback.nodes.map(n => n.id)] : []} scrollPosition={graphScroll}/>}
            {view === 'solutions' && <Solutions session={session}/>}
            {view === 'record' && <>
              <section className="card record"><div className="cardhead"><Icon name="history"/><h2>输入与来源</h2><span className="token">修订 {session.project.revision}</span></div><div className="recordbody"><p className="muted">项目格式 {session.project.schemaVersion} · 网站规则包 {session.project.domainPackVersion} · AI 未启用</p>{session.project.description && <p className="description">需求原文：{session.project.description}</p>}
                {ids.map(id => { const n = session.result.nodes[id], a = session.project.answers[id]; return <div className="recordrow" key={id}><div><b>{labels[id]}</b><p>{formatValue(id, a.value)}</p><small>{n.reason} · 来源 {n.source} · {a.updatedAt}</small>{a.source.type === 'user' && <small>模板起步值：{formatValue(id, fixtures[session.project.seed].values[id])}</small>}</div><div className="record-actions"><span className={`token status-${n.status}`}>{statusText[n.status]}</span><button className="textbutton" disabled={!editableQuestion(id, session)} onClick={e => openEdit(id, e.currentTarget)}>修改 <Icon name="edit" size={13}/></button></div></div>; })}
              </div></section>
              <section className="card record"><div className="cardhead"><Icon name="branch"/><h2>变更与传播记录</h2><span className="token">确定性规则</span></div><div className="recordbody">{!session.project.log.length && <p className="muted">还没有用户修改。当前答案来自场景模板。</p>}{session.project.log.slice().reverse().map(e => <div className="logentry" key={e.revision}><span className="logrevision">r{e.revision}</span><div><b>{labels[e.field]}：{formatValue(e.field, e.before.value)} → {formatValue(e.field, e.after.value)}</b><p>重算节点：{e.affected.map(id => labels[id]).join('、')}</p>{!!e.stale.length && <p className="warningline">已失效但保留原答：{e.stale.map(id => labels[id]).join('、')}</p>}<small>{e.at}</small></div></div>)}</div></section>
              <section className="localnotice"><p>项目保存在当前浏览器，不是云端备份。清除浏览器数据可能丢失项目，请定期导出 JSON。</p><button className="danger" onClick={clear}>清空本机项目</button></section>
            </>}
          </>}
          <footer className="footer"><span>Decision Studio · 决策正确性优先</span><span>本地规则 · 无远端部署 · 无 AI 调用</span></footer>
        </main>
      </div>
    </div>
    {modalEditor && editorCard && <Modal titleId={`edit-${editor}-title`} onCancel={() => closeEditor()}>{modalSaveWarning}{editorCard}</Modal>}
    {modalInfo && <Modal titleId="node-info-title" onCancel={() => { setGraphInfoOpen(false); restoreFocus(); }}>{modalSaveWarning}{inspector}<div className="dialog-return">{saveState === '保存失败' && <button className="primary" onClick={() => { setGraphInfoOpen(false); restoreFocus(); exportFile('json'); }}>导出 JSON 备份</button>}<button className="secondary" onClick={() => { setGraphInfoOpen(false); restoreFocus(); }}>返回决策图</button></div></Modal>}
    {pendingLeave && <Modal titleId="discard-title" className="discard-dialog" onCancel={stay}><div className="discard-content"><Icon name="info" size={24}/><h2 id="discard-title" tabIndex={-1} data-dialog-focus>当前修改还没有应用</h2><p>已保存的答案和方案没有改变。继续编辑，或明确放弃这份草稿再离开。</p><div><button className="secondary" onClick={stay}>继续编辑</button><button className="primary" onClick={() => { const action = pendingLeave.action; setPendingLeave(null); action(); }}>放弃并离开</button></div></div></Modal>}
  </>;
}
