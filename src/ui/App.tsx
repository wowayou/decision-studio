import { useEffect, useRef, useState } from 'react';
import { answer, create } from '../core/session';
import { impactBetween, sameValue, type Impact } from '../core/impact';
import { type NodeId, type Qid, type Seed, type Session, type Value } from '../core/types';
import { editableQuestion, isQuestion } from '../domain/inspect';
import { fixtures } from '../domain/website';
import { markdown } from '../domain/report';
import { jsonBackup, MAX_BYTES, restore } from '../storage/project';
import { download, errorText, peekLocal, readLocalRaw } from '../storage/browser';
import { Sidebar, TopBar, views, type View } from './AppShell';
import { ConfirmDialog, type ConfirmRequest } from './ConfirmDialog';
import { DecisionInspector } from './DecisionInspector';
import { DecisionOverview } from './DecisionOverview';
import { DependencyGraph } from './DependencyGraph';
import { draftChanged, draftFromValue, type QuestionDraft } from './draft';
import { GuideView, type GuidePosition } from './GuideView';
import { Icon } from './Icon';
import { ImpactSummary } from './ImpactSummary';
import { Modal } from './Modal';
import { ExternalChangeNotice, Notice, ProjectNotices } from './Notices';
import { QuestionCard } from './QuestionCard';
import { RecordView } from './RecordView';
import { Solutions } from './Solutions';
import { TemplatePicker } from './TemplatePicker';
import { useLocalProject } from './useLocalProject';

const WIDE_GRAPH = '(min-width: 1380px) and (min-height: 700px)';
const firstStep = (s: Session | null): GuidePosition => ({ current: s?.result.frontier[0] ?? null, back: [], forward: [] });

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const list = matchMedia(query);
    const change = () => setMatches(list.matches);
    list.addEventListener('change', change);
    return () => list.removeEventListener('change', change);
  }, [query]);
  return matches;
}

export function App() {
  const store = useLocalProject();
  const { session } = store;
  const [view, setView] = useState<View>('guide');
  const [templates, setTemplates] = useState(!session);
  const [guide, setGuide] = useState<GuidePosition>(() => firstStep(session));
  const [drafts, setDrafts] = useState<Partial<Record<Qid, QuestionDraft>>>({});
  const [editor, setEditor] = useState<Qid | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeId>('membership');
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [graphInfoOpen, setGraphInfoOpen] = useState(false);
  const [feedback, setFeedback] = useState<Impact | null>(null);
  const [pendingLeave, setPendingLeave] = useState<{ action: () => void } | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const [error, setError] = useState(store.initialError);
  const [hiddenSaveFailure, setHiddenSaveFailure] = useState<typeof store.status | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const lastDraftFocus = useRef<HTMLElement | null>(null);
  const graphScroll = useRef({ left: 0, top: 0 });
  const wideGraph = useMediaQuery(WIDE_GRAPH);

  const modalEditor = editor !== null && (view !== 'graph' || !wideGraph);
  const modalInfo = view === 'graph' && !wideGraph && graphInfoOpen && editor === null;
  const mainHidden = modalEditor || modalInfo || pendingLeave !== null || confirmRequest !== null;
  const draftFor = (id: Qid) => drafts[id] ?? draftFromValue(session!.project.answers[id].value);
  const activeId = editor ?? (view === 'guide' && !templates ? guide.current : null);
  const activeDraft = activeId ? drafts[activeId] : undefined;
  const dirty = !!(session && activeId && activeDraft && draftChanged(activeId, activeDraft, session.project.answers[activeId].value));
  const saveFailed = store.status.kind === 'failed';

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
  /** Run a context switch, first asking what to do with an unapplied draft. */
  function leave(action: () => void) {
    const transition = () => { setDrafts({}); setEditor(null); setGraphInfoOpen(false); action(); };
    if (dirty) setPendingLeave({ action: transition }); else transition();
  }
  function stay() {
    setPendingLeave(null);
    requestAnimationFrame(() => { if (lastDraftFocus.current?.isConnected) lastDraftFocus.current.focus({ preventScroll: true }); });
  }
  function navigate(next: View) {
    if (next === view && !templates && !editor) return;
    leave(() => { setView(next); setTemplates(false); });
  }
  function openEdit(id: Qid, trigger: HTMLElement) {
    if (!session || !editableQuestion(id, session) || editor === id) return;
    leave(() => { returnFocus.current = trigger; setEditor(id); if (view === 'graph') { setDetailsOpen(true); setGraphInfoOpen(true); } });
  }
  function selectNode(id: NodeId, trigger: HTMLElement) {
    if (id === selectedNode && editor === id) return;
    const choose = () => {
      returnFocus.current = trigger; setSelectedNode(id); setDetailsOpen(true); setGraphInfoOpen(true);
      if (session && isQuestion(id) && editableQuestion(id, session)) setEditor(id);
    };
    if (editor === id) { setSelectedNode(id); setDetailsOpen(true); } else leave(choose);
  }
  function moveNext(s: Session) {
    setGuide(position => {
      const forwardIndex = s.result.conflicts.length ? -1 : position.forward.findIndex(id => id === null || editableQuestion(id, s));
      const next = forwardIndex >= 0 ? position.forward[forwardIndex] ?? null : s.result.frontier[0] ?? null;
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
        while (index >= 0 && !editableQuestion(position.back[index]!, session)) index--;
        const target = position.back[index];
        return target === undefined ? position : { current: target, back: position.back.slice(0, index), forward: [position.current, ...position.forward] };
      });
      setFocusKey(k => k + 1);
    });
  }
  /** Commit one answer. Returns an error message, or null when applied. */
  function apply(id: Qid, value: Value, guided: boolean): string | null {
    if (!session) return '项目尚未初始化。';
    try {
      const a = session.project.answers[id];
      const unchanged = a.source.type === 'user' && session.result.nodes[id].status !== 'stale' && sameValue(a.value, value);
      const next = unchanged ? session : answer(session, id, value);
      if (!unchanged) { jsonBackup(next); setFeedback(impactBetween(session, next, id)); store.commit(next); }
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
  function resetView(next: Session | null) {
    setGuide(firstStep(next)); setDrafts({}); setEditor(null); setFeedback(null);
    setSelectedNode('membership'); graphScroll.current = { left: 0, top: 0 };
    setGraphInfoOpen(false); setTemplates(!next); setView('guide'); setError('');
  }
  /** `storedText`: `next` was restored from exactly this stored text, so it needs no rewrite. */
  function replaceProject(next: Session | null, storedText?: string | null) { store.replace(next, storedText); resetView(next); }
  function askToReplace(request: Omit<ConfirmRequest, 'tone' | 'cancelLabel'>) {
    if (session || readLocalRaw() !== null) setConfirmRequest({ ...request, tone: 'danger' });
    else request.onConfirm();
  }
  function start(seed: Seed, description: string) {
    askToReplace({ title: '开始新的场景？', body: '此版本一次只保存一个项目。新场景会覆盖当前本机项目，建议先导出 JSON 备份。', confirmLabel: '覆盖并开始',
      onConfirm: () => { try { replaceProject(create(seed, description.trim())); } catch (e) { setError(errorText(e)); } } });
  }
  function exportFile(kind: 'json' | 'md') {
    if (!session) return;
    try {
      download(`decision-${session.project.seed}-r${session.project.revision}.${kind}`, kind === 'json' ? 'application/json' : 'text/markdown;charset=utf-8',
        kind === 'json' ? jsonBackup(session) : markdown(session));
    } catch (e) { setError(errorText(e)); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_BYTES) throw new Error('项目超过 4 MiB 大小限制。');
      const next = restore(await file.text());
      askToReplace({ title: '用导入的文件替换当前项目？', body: `将载入「${fixtures[next.project.seed].name}」（修订 ${next.project.revision}），并替换当前本机项目。替换前请确认已导出需要保留的备份。`,
        confirmLabel: '替换项目', onConfirm: () => leave(() => replaceProject(next)) });
    } catch (e) { setError(`未导入，当前项目未改变：${errorText(e)}`); }
  }
  function clear() {
    const body = `此操作不能撤销。清空前请先导出 JSON 备份。${store.external ? '另一个标签页刚保存的版本也会一并清空。' : ''}`;
    setConfirmRequest({ title: '清空本机项目？', body, confirmLabel: '清空项目', tone: 'danger',
      onConfirm: () => { try { store.clear(); resetView(null); } catch (e) { setError(`未能清空项目：${errorText(e)}`); } } });
  }
  function loadExternal() {
    // Read storage when the load actually happens: more changes may land while a dialog is open.
    const load = () => leave(() => {
      const raw = peekLocal();
      if (raw === undefined) { setError('无法读取本机存储，未载入另一标签页的版本。'); return; }
      if (raw === null) { replaceProject(null, null); return; }
      try { replaceProject(restore(raw), raw); }
      catch (e) { setError(`未能载入另一标签页的版本：${errorText(e)}`); }
    });
    if (store.hasUnsavedEdits()) setConfirmRequest({ title: '载入另一个标签页的版本？', tone: 'danger', confirmLabel: '载入并放弃此页修改',
      body: '此页在暂停保存期间应用的修改还没有写入本机，载入后会丢失。如需保留，请先取消并导出 JSON 备份。', onConfirm: load });
    else load();
  }

  const editorCard = session && editor ? <QuestionCard key={`edit-${editor}`} session={session} id={editor} draft={draftFor(editor)} mode="edit"
    onDraft={draft => setDrafts(d => ({ ...d, [editor]: draft }))} onAnswer={(id, value) => apply(id, value, false)} onCancel={() => closeEditor()}
    onFocus={element => { lastDraftFocus.current = element; }}/> : null;
  const inspector = session ? <>
    <DecisionInspector session={session} selected={selectedNode} onSelect={selectNode} onEdit={openEdit} focus={modalInfo}/>
    {feedback && <ImpactSummary impact={feedback} onEdit={openEdit}/>}
  </> : null;
  const returnToGraph = () => { setGraphInfoOpen(false); restoreFocus(); };
  const modalSaveWarning = saveFailed ? <Notice tone="danger"><p>本机保存失败。已应用数据仍在内存中，请导出 JSON 备份。</p></Notice> : null;
  const saveFailure = saveFailed && store.status !== hiddenSaveFailure && store.status.kind === 'failed'
    ? `修改已应用，但未能保存到本机：${store.status.message} 请立即导出备份。` : '';
  const current = views.find(v => v.id === view)!;

  return <>
    <div className="app" inert={mainHidden} aria-hidden={mainHidden || undefined}>
      <Sidebar active={templates ? null : view} hasSession={!!session} onNavigate={navigate} onTemplates={() => leave(() => { setTemplates(true); setView('guide'); })}/>
      <div className="workspace">
        <TopBar status={store.status} dirty={dirty} hasSession={!!session} onImport={file => { void importFile(file); }} onExport={exportFile}/>
        <main id="main" className="main">
          <header className="pageheading">
            <p className="eyebrow">{templates ? '新建项目' : current.label}</p>
            <h1>{templates ? '把建站需求，变成清晰的方案' : session ? fixtures[session.project.seed].name : '网站架构选型'}</h1>
            <p>{templates ? '规则先行，少量确认，保留你的不确定与取舍。' : current.summary}</p>
          </header>
          {store.external && <ExternalChangeNotice change={store.external} hasSession={!!session} onLoad={loadExternal} onKeep={store.keepThisTab}/>}
          {(error || saveFailure) && <Notice tone="danger" onDismiss={() => { setError(''); setHiddenSaveFailure(store.status); }}>
            {error && <p>{error}</p>}{saveFailure && <p>{saveFailure}</p>}
            {store.unrestoredRaw && !session && <button className="linkbutton" onClick={() => download('unrestored-project.json', 'application/json', store.unrestoredRaw!)}>下载原始本机备份</button>}
          </Notice>}
          {templates || !session ? <TemplatePicker onStart={start} replacing={!!session || !!store.unrestoredRaw}/> : <>
            <DecisionOverview key={session.project.id} session={session} onEdit={openEdit} actions={view === 'guide' && <>
              <button className="button secondary small" onClick={() => navigate('solutions')}>先看方案 <Icon name="arrow" size={14}/></button>
              <button className="button ghost small" onClick={() => exportFile('md')}><Icon name="download" size={14}/> 导出已应用草案</button>
            </>}/>
            <ProjectNotices session={session} onEdit={openEdit}/>
            {feedback && view !== 'graph' && <ImpactSummary impact={feedback} onEdit={openEdit}/>}
            {view === 'guide' && <GuideView session={session} guide={guide} draftFor={draftFor} active={!mainHidden} focusKey={focusKey}
              canPrevious={guide.back.some(id => editableQuestion(id, session))}
              onDraft={(id, draft) => setDrafts(d => ({ ...d, [id]: draft }))} onAnswer={(id, value) => apply(id, value, true)}
              onPrevious={previous} onOpenSolutions={() => navigate('solutions')} onFocusDraft={element => { lastDraftFocus.current = element; }}/>}
            {view === 'graph' && <DependencyGraph session={session} selected={selectedNode} onSelect={selectNode}
              inspector={modalEditor || modalInfo ? null : editor && wideGraph ? editorCard : inspector}
              detailsOpen={detailsOpen} onToggleDetails={() => leave(() => setDetailsOpen(!detailsOpen))}
              changed={feedback ? [feedback.field, ...feedback.nodes.map(n => n.id)] : []} scrollPosition={graphScroll}/>}
            {view === 'solutions' && <Solutions session={session}/>}
            {view === 'record' && <RecordView session={session} onEdit={openEdit} onClear={clear}/>}
          </>}
          <footer className="footer"><span>本地规则 · 无远端部署 · 无 AI 调用</span><span>方案为有条件草案，实施前请核实费用、许可与服务能力。</span></footer>
        </main>
      </div>
    </div>
    {modalEditor && editorCard && <Modal titleId={`edit-${editor}-title`} onCancel={() => closeEditor()}>{modalSaveWarning}{editorCard}</Modal>}
    {modalInfo && <Modal titleId="node-info-title" onCancel={returnToGraph}>{modalSaveWarning}{inspector}
      <div className="dialog-return">
        {saveFailed && <button className="button primary" onClick={() => { returnToGraph(); exportFile('json'); }}>导出 JSON 备份</button>}
        <button className="button secondary" onClick={returnToGraph}>返回决策图</button>
      </div></Modal>}
    {pendingLeave && <Modal titleId="discard-title" className="confirm-dialog" onCancel={stay}>
      <div className="confirm-content">
        <span className="iconbox accent"><Icon name="info"/></span>
        <h2 id="discard-title" tabIndex={-1} data-dialog-focus>当前修改还没有应用</h2>
        <p>已保存的答案和方案没有改变。继续编辑，或明确放弃这份草稿再离开。</p>
        <div className="actions end">
          <button className="button secondary" onClick={stay}>继续编辑</button>
          <button className="button primary" onClick={() => { const action = pendingLeave.action; setPendingLeave(null); action(); }}>放弃并离开</button>
        </div>
      </div>
    </Modal>}
    {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)}/>}
  </>;
}
