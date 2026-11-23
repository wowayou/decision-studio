import { ids, isBand, isOther, type Candidate, type NodeId, type NodeResult, type Qid, type Session, type Value } from './types';
import { activeIdentity, graph } from '../domain/rules';

// A projection of two real evaluations, never another source of project facts.
export function sameValue(a: Value, b: Value): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  if (isBand(a) && isBand(b)) return a.min === b.min && a.target === b.target && a.max === b.max;
  if (isOther(a) && isOther(b)) return a.other === b.other;
  return a === b;
}
export interface NodeChange { id: NodeId; before: NodeResult; after: NodeResult }
export interface CandidateChange { id: string; before: Candidate; after: Candidate; beforePosition: number; afterPosition: number }
export interface Impact {
  field: Qid; before: NodeResult; after: NodeResult; affected: NodeId[];
  nodes: NodeChange[]; candidates: CandidateChange[]; preserved: Qid[];
  beforeCount: number; afterCount: number; beforeConflicts: string[]; afterConflicts: string[]; followUps: Qid[];
}
export function impactBetween(before: Session, after: Session, field: Qid): Impact {
  const affected = graph.downstream(field);
  const nodes = affected.filter(id => id !== field).flatMap(id => {
    const a = before.result.nodes[id], b = after.result.nodes[id];
    return !sameValue(a.value, b.value) || a.status !== b.status ? [{ id, before: a, after: b }] : [];
  });
  const beforeOpen = before.result.candidates.filter(c => c.feasible !== false);
  const afterOpen = after.result.candidates.filter(c => c.feasible !== false);
  const candidates = after.result.candidates.flatMap(b => {
    const a = before.result.candidates.find(c => c.id === b.id)!;
    const beforePosition = beforeOpen.findIndex(c => c.id === b.id);
    const afterPosition = afterOpen.findIndex(c => c.id === b.id);
    const changed = a.feasible !== b.feasible || JSON.stringify(a.fit) !== JSON.stringify(b.fit)
      || JSON.stringify(a.components) !== JSON.stringify(b.components)
      || JSON.stringify(a.assumptions) !== JSON.stringify(b.assumptions)
      || JSON.stringify(a.hardFailures) !== JSON.stringify(b.hardFailures)
      || beforePosition !== afterPosition;
    return changed ? [{ id: b.id, before: a, after: b, beforePosition, afterPosition }] : [];
  });
  const preserved = ids.filter(id => {
    const a = before.project.answers[id], b = after.project.answers[id];
    return id !== field && a.source.type === 'user' && ['user_confirmed', 'user_approximate'].includes(after.result.nodes[id].status)
      && sameValue(a.value, b.value) && a.status === b.status && a.updatedAt === b.updatedAt;
  });
  return { field, before: before.result.nodes[field], after: after.result.nodes[field], affected, nodes, candidates, preserved,
    beforeCount: beforeOpen.length, afterCount: afterOpen.length, beforeConflicts: before.result.conflicts, afterConflicts: after.result.conflicts,
    followUps: activeIdentity(after.result.nodes) && (!activeIdentity(before.result.nodes) || after.result.nodes.identity.status === 'stale')
      && after.result.nodes.identity.status !== 'user_confirmed' ? ['identity'] : [] };
}
