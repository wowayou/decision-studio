import { useLayoutEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { statusText, type NodeId, type Session, type Status } from '../core/types';
import { graph } from '../domain/rules';
import { editableQuestion, isQuestion, nodeValue } from '../domain/inspect';
import { labels } from '../domain/website';
import { Icon } from './Icon';

const legend: Status[] = ['user_confirmed', 'preset', 'rule_derived', 'unknown', 'stale', 'conflicted', 'not_applicable'];
const columnLabels = ['你的输入', '所需能力', '条件与运行', '认证'];
const NODE_HEIGHT = 84, ROW_GAP = 14, COLUMN_GAP = 24, PAD_X = 16, PAD_TOP = 44, PAD_BOTTOM = 20;

// Levels come from the compiled dependency table, so the picture cannot disagree with evaluation.
const levels = {} as Record<NodeId, number>;
for (const id of graph.order) levels[id] = graph.inputs[id].length ? Math.max(...graph.inputs[id].map(p => levels[p])) + 1 : 0;
const columns = Math.max(...Object.values(levels)) + 1;
const columnNodes = Array.from({ length: columns }, (_, col) => graph.order.filter(id => levels[id] === col));
const tallest = Math.max(...columnNodes.map(c => c.length));
const HEIGHT = PAD_TOP + tallest * NODE_HEIGHT + (tallest - 1) * ROW_GAP + PAD_BOTTOM;

export function DependencyGraph({ session, selected, onSelect, inspector, detailsOpen, onToggleDetails, changed = [], scrollPosition }: {
  session: Session; selected: NodeId; onSelect: (id: NodeId, trigger: HTMLElement) => void;
  inspector: ReactNode; detailsOpen: boolean; onToggleDetails: () => void; changed?: NodeId[];
  scrollPosition: MutableRefObject<{ left: number; top: number }>;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  function fitPanel() {
    const element = panel.current;
    if (element) element.style.maxHeight = `${Math.max(220, innerHeight - Math.max(18, element.getBoundingClientRect().top) - 18)}px`;
  }
  useLayoutEffect(fitPanel);
  useLayoutEffect(() => {
    window.addEventListener('scroll', fitPanel, { passive: true });
    window.addEventListener('resize', fitPanel);
    return () => { window.removeEventListener('scroll', fitPanel); window.removeEventListener('resize', fitPanel); };
  }, []);
  const [availableWidth, setAvailableWidth] = useState(1000);
  useLayoutEffect(() => {
    const element = scroll.current!;
    element.scrollTo(scrollPosition.current.left, scrollPosition.current.top);
    const observer = new ResizeObserver(([entry]) => { if (entry) setAvailableWidth(entry.contentRect.width); });
    observer.observe(element);
    return () => observer.disconnect();
  }, [scrollPosition]);

  const width = Math.max(720, Math.min(availableWidth, 1040));
  const nodeWidth = (width - PAD_X * 2 - COLUMN_GAP * (columns - 1)) / columns;
  const positions = {} as Record<NodeId, { x: number; y: number }>;
  columnNodes.forEach((column, col) => {
    const slot = (HEIGHT - PAD_TOP - PAD_BOTTOM + ROW_GAP) / column.length;
    column.forEach((id, i) => { positions[id] = { x: PAD_X + col * (nodeWidth + COLUMN_GAP), y: PAD_TOP + i * slot + (slot - ROW_GAP - NODE_HEIGHT) / 2 }; });
  });
  const mid = NODE_HEIGHT / 2;

  return <div className="graphsection">
    <div className="graph-toolbar">
      <ul className="legend" aria-label="节点状态图例">{legend.map(s => <li key={s}><span className={`legend-dot status-${s}`} aria-hidden="true"/>{statusText[s]}</li>)}</ul>
      <button className="button secondary small" aria-expanded={detailsOpen} onClick={onToggleDetails}>{detailsOpen ? '收起详情' : '展开详情'}</button>
    </div>
    <div className={`graph-workspace ${detailsOpen ? 'with-inspector' : ''}`}>
      <div className="card graphcard">
        <p className="graphhint"><Icon name="info" size={15}/> 点击或用 Tab / Enter 选择节点。输入节点可就地修改；窄屏可横向滑动，也可用「全部关键决策」修改。</p>
        <div className="graphscroll" ref={scroll} role="group" aria-label="决策依赖图，可横向滚动"
          onScroll={e => { scrollPosition.current = { left: e.currentTarget.scrollLeft, top: e.currentTarget.scrollTop }; }}>
          <div className="graphcanvas" style={{ width, height: HEIGHT }}>
            {columnLabels.slice(0, columns).map((text, i) => <span className="columnlabel" key={text} style={{ left: PAD_X + i * (nodeWidth + COLUMN_GAP) }}>{text}</span>)}
            <svg width={width} height={HEIGHT} aria-hidden="true">
              <defs><marker id="edge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path className="edge-marker" d="M0 0 10 5 0 10z"/></marker></defs>
              {graph.order.flatMap(id => graph.inputs[id].map(parent => {
                const a = positions[parent], b = positions[id], from = a.x + nodeWidth, to = b.x, bend = (from + to) / 2;
                return <path key={`${parent}-${id}`} className={`edge ${selected === id || selected === parent ? 'active' : ''}`} markerEnd="url(#edge-arrow)"
                  d={`M${from} ${a.y + mid} C${bend} ${a.y + mid}, ${bend} ${b.y + mid}, ${to} ${b.y + mid}`}/>;
              }))}
            </svg>
            {graph.order.map(id => {
              const n = session.result.nodes[id], input = isQuestion(id);
              const editable = editableQuestion(id, session), updated = changed.includes(id), active = selected === id;
              return <button key={id} className={`graphnode status-${n.status} ${active ? 'active' : ''} ${updated ? 'recent-change' : ''} ${input ? 'input' : 'derived'}`}
                style={{ left: positions[id].x, top: positions[id].y, width: nodeWidth, height: NODE_HEIGHT }}
                onClick={e => onSelect(id, e.currentTarget)} aria-pressed={active} data-testid={`node-${id}`}>
                <span className="nodeline"><b>{labels[id]}</b>{updated && <span className="node-badge" title="本次修改影响了此节点">已更新</span>}</span>
                <span className="nodevalue">{nodeValue(id, n)}</span>
                <span className="node-action"><span className={`token status-${n.status}`}>{statusText[n.status]}</span>
                  {editable ? <><Icon name="edit" size={13}/><span className="sr">可修改</span></> : input && <span className="sr">需先满足前提</span>}</span>
              </button>;
            })}
          </div>
        </div>
      </div>
      {detailsOpen && <aside ref={panel} className="graph-inspector" aria-label="决策详情侧栏">{inspector}</aside>}
    </div>
  </div>;
}
