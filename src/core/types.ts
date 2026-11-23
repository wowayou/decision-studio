export const ids = ['purpose', 'editors', 'login', 'identity', 'languages', 'limits', 'budget', 'priority'] as const;
export type Qid = typeof ids[number];
export const capabilityIds = ['content', 'membership', 'auth', 'data', 'deploy', 'publishing'] as const;
export type CapabilityId = typeof capabilityIds[number];
export type NodeId = Qid | CapabilityId;
export type Seed = 'b2b-site' | 'blog' | 'saas' | 'contradiction';
export type Band = { min: number; target: number; max: number };
export type Value = string | string[] | Band | { other: string } | null;
export type Status = 'unknown' | 'user_confirmed' | 'user_approximate' | 'preset' | 'rule_derived' | 'ai_suggested' | 'not_applicable' | 'stale' | 'conflicted';
export interface Answer {
  questionId: Qid; value: Value; status: Status; source: { type: 'user' | 'preset'; id: string };
  reason: string; updatedAt: string;
}
export interface Change { revision: number; at: string; field: Qid; before: Answer; after: Answer; affected: NodeId[]; stale: Qid[] }
export interface Project {
  id: string; schemaVersion: '1'; domainPackId: 'website'; domainPackVersion: string; seed: Seed;
  description: string; createdAt: string; revision: number; answers: Record<Qid, Answer>; log: Change[];
}
export interface Question {
  id: Qid; label: string; prompt: string; hint: string; kind: 'single' | 'multi' | 'range';
  options: { id: string; label: string; explanation: string }[]; recommended: Value; rationale: string;
}
export interface NodeResult {
  value: Value; status: Status; source: string; reason: string; inputs: readonly NodeId[];
}
export type Nodes = Record<NodeId, NodeResult>;
export interface Constraint {
  id: string; kind: 'hard' | 'soft' | 'range' | 'conditional' | 'deferred'; field: NodeId; value: Value; source: string; reason: string;
}
export type Fit = 'good' | 'mixed' | 'poor' | 'unknown';
export interface Candidate {
  id: string; name: string; description: string; components: string[]; owner: string; risk: string; tradeoff: string;
  feasible: boolean | 'unresolved'; hardFailures: string[]; assumptions: string[]; fit: Record<'maintenance' | 'extension' | 'cost', Fit>;
  ruleId: string; inputs: NodeId[];
}
export interface Result {
  nodes: Nodes; candidates: Candidate[]; constraints: Constraint[]; conflicts: string[]; frontier: Qid[];
  assumptions: string[]; coverage: string | null; orderReason: string;
}
export interface Session { project: Project; result: Result }
export const statusText: Record<Status, string> = {
  unknown: '待确认', user_confirmed: '用户确认', user_approximate: '用户估计', preset: '模板默认', rule_derived: '规则推导',
  ai_suggested: 'AI 建议', not_applicable: '不适用', stale: '已失效', conflicted: '有冲突',
};
export function isOther(value: Value): value is { other: string } { return !!value && typeof value === 'object' && 'other' in value; }
export function isBand(value: Value): value is Band { return !!value && typeof value === 'object' && 'min' in value; }
