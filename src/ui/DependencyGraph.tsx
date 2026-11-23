import { useLayoutEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { ids, statusText, type NodeId, type Session } from '../core/types';
import { graph } from '../domain/rules';
import { labels } from '../domain/website';
import { editableQuestion, nodeValue } from './DecisionInspector';
import { Icon } from './Icon';

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
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const levels = {} as Record<NodeId, number>;
  for (const id of graph.order) levels[id] = graph.inputs[id].length ? Math.max(...graph.inputs[id].map(p => levels[p])) + 1 : 0;
  const columns = Math.max(...Object.values(levels)) + 1;
  const width = Math.max(760, Math.min(availableWidth, 1000));
  const gap = 24, nodeWidth = (width - 40 - gap * (columns - 1)) / columns, nodeHeight = 78;
  const height = 660, positions = {} as Record<NodeId, { x: number; y: number }>;
  for (let col = 0; col < columns; col++) {
    const column = graph.order.filter(id => levels[id] === col);
    column.forEach((id, i) => { positions[id] = { x: 20 + col * (nodeWidth + gap), y: 48 + i * (height - 96) / Math.max(column.length, 1) }; });
  }
  return <div className="graphsection">
    <div className="sectionheading"><div><h2>选择节点，就地调整条件</h2><p className="muted">输入节点可直接修改；规则节点可追溯上游。应用后自动重算，不用重新走引导。</p></div>
      <button className="secondary" aria-expanded={detailsOpen} onClick={onToggleDetails}>{detailsOpen ? '收起详情' : '展开详情'}</button>
    </div>
    <div className={`graph-workspace ${detailsOpen ? 'with-inspector' : ''}`}>
      <div className="card graphcard"><div className="graphscroll" ref={scroll} tabIndex={0} aria-label="决策依赖图，可横向滚动"
        onScroll={e => { scrollPosition.current = { left: e.currentTarget.scrollLeft, top: e.currentTarget.scrollTop }; }}>
        <div className="graphcanvas" style={{ width, height }}>
          {['你的输入', '所需能力', '条件与运行', '认证'].slice(0, columns).map((text, i) => <span className="columnlabel" key={text} style={{ left: 20 + i * (nodeWidth + gap) }}>{text}</span>)}
          <svg width={width} height={height} aria-hidden="true"><defs><marker id="edge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#a3b1a9"/></marker></defs>
            {graph.order.flatMap(id => graph.inputs[id].map(parent => {
              const a = positions[parent], b = positions[id], from = a.x + nodeWidth, to = b.x;
              const highlighted = selected === id || selected === parent;
              return <path key={`${parent}-${id}`} d={`M${from} ${a.y + nodeHeight / 2} C${(from + to) / 2} ${a.y + nodeHeight / 2}, ${(from + to) / 2} ${b.y + nodeHeight / 2}, ${to} ${b.y + nodeHeight / 2}`}
                fill="none" stroke={highlighted ? '#56866a' : '#d1d9d2'} strokeWidth={highlighted ? 2 : 1.2} markerEnd="url(#edge-arrow)"/>;
            }))}
          </svg>
          {graph.order.map(id => {
            const n = session.result.nodes[id], input = ids.includes(id as typeof ids[number]);
            const editable = editableQuestion(id, session), updated = changed.includes(id);
            return <button key={id} className={`graphnode ${selected === id ? 'active' : ''} ${updated ? 'recent-change' : ''} status-${n.status}`}
              style={{ left: positions[id].x, top: positions[id].y, width: nodeWidth, minHeight: nodeHeight }}
              onClick={e => onSelect(id, e.currentTarget)} aria-pressed={selected === id} data-testid={`node-${id}`}>
              <span className="nodeline"><b>{labels[id]}</b><span className="nodestatus">{statusText[n.status]}</span></span>
              <span className="nodevalue">{nodeValue(id, n)}</span>
              <span className="node-action">{editable ? <><Icon name="edit" size={10}/> 点击修改</> : input ? '查看条件' : '规则推导'}{updated && <b>本次更新</b>}</span>
            </button>;
          })}
        </div>
      </div><p className="graphhint"><Icon name="info" size={14}/> Tab / Enter 可选择节点。窄屏可横向浏览，也可用「全部关键决策」修改。</p></div>
      {detailsOpen && <aside ref={panel} className="graph-inspector" aria-label="决策详情侧栏">{inspector}</aside>}
    </div>
  </div>;
}
