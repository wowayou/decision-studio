import { ids, type NodeId, type NodeResult, type Qid, type Session } from '../core/types';
import { activeIdentity, graph } from './rules';
import { formatValue, questionOrder } from './website';

// Read-only queries over an evaluated session. They never create facts; every view
// (guide, graph, records) asks the same questions so the answers cannot drift apart.

export const isQuestion = (id: NodeId): id is Qid => ids.includes(id as Qid);

/** Only raw inputs are editable, and `identity` only once accounts are required this phase. */
export function editableQuestion(id: NodeId, session: Session): boolean {
  return isQuestion(id) && (id !== 'identity' || activeIdentity(session.result.nodes));
}

/** Raw questions that can change a node, in canonical question order. */
export function upstreamQuestions(id: NodeId): Qid[] {
  const seen = new Set<NodeId>();
  const visit = (key: NodeId) => {
    if (seen.has(key)) return;
    seen.add(key);
    graph.inputs[key].forEach(visit);
  };
  visit(id);
  return ids.filter(key => seen.has(key));
}

/** Display text that keeps "not applicable" distinct from "unknown". */
export function nodeValue(id: NodeId, node: NodeResult): string {
  return node.status === 'not_applicable' && node.value === null ? '本期无需选择' : formatValue(id, node.value);
}

export const isConfirmed = (session: Session, id: Qid) =>
  ['user_confirmed', 'user_approximate'].includes(session.result.nodes[id].status);

export interface Progress { confirmed: number; total: number; position: number | null }
/** Confirmed count among currently applicable questions, plus the 1-based guide position of `current`. */
export function guideProgress(session: Session, current: Qid | null): Progress {
  const applicable = questionOrder.filter(id => editableQuestion(id, session));
  const index = current ? applicable.indexOf(current) : -1;
  return {
    confirmed: applicable.filter(id => isConfirmed(session, id)).length,
    total: applicable.length,
    position: index >= 0 ? index + 1 : null,
  };
}
