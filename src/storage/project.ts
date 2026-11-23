import { z } from 'zod';
import { answer, create } from '../core/session';
import { capabilityIds, ids, seeds, TEXT_LIMITS, type Project, type Session } from '../core/types';
import { VERSION } from '../domain/website';

// Pure serialization and validation. Browser side effects live in `./browser`.
// The production CSP forbids eval; without this Zod probes `new Function` (a CSP violation)
// before falling back to the same interpreted validation used here.
z.config({ jitless: true });
export const KEY = 'decision-studio.project.v1';
export const MAX_BYTES = 4 * 1024 * 1024;
const value = z.union([z.null(), z.string().max(128), z.array(z.string().max(64)).max(16),
  z.strictObject({ min: z.number(), target: z.number(), max: z.number() }),
  z.strictObject({ other: z.string().min(1).max(TEXT_LIMITS.other) })]);
const record = z.strictObject({
  questionId: z.enum(ids), value,
  status: z.enum(['unknown', 'preset', 'user_confirmed', 'user_approximate', 'stale']),
  source: z.strictObject({ type: z.enum(['user', 'preset']), id: z.string().max(80) }),
  reason: z.string().max(512), updatedAt: z.iso.datetime(),
});
const schema = z.strictObject({
  id: z.uuid(), schemaVersion: z.literal('1'), domainPackId: z.literal('website'), domainPackVersion: z.literal(VERSION),
  seed: z.enum(seeds), createdAt: z.iso.datetime(), description: z.string().max(TEXT_LIMITS.description),
  revision: z.int().nonnegative(), answers: z.record(z.enum(ids), record),
  log: z.array(z.strictObject({
    revision: z.int().positive(), at: z.iso.datetime(), field: z.enum(ids), before: record, after: record,
    affected: z.array(z.enum([...ids, ...capabilityIds])).max(14), stale: z.array(z.enum(ids)).max(8),
  })),
});

function migrate(raw: unknown): Project {
  const header = z.object({ schemaVersion: z.string(), domainPackId: z.string(), domainPackVersion: z.string() }).safeParse(raw);
  if (!header.success) throw new Error('缺少项目版本信息。');
  if (header.data.schemaVersion !== '1') throw new Error('暂不支持此项目格式版本，请保留原始备份。');
  if (header.data.domainPackId !== 'website' || header.data.domainPackVersion !== VERSION) throw new Error('领域规则包版本不匹配，请使用对应版本打开原始备份。');
  const checked = schema.safeParse(raw);
  if (!checked.success) throw new Error('项目结构或答案来源不合法。');
  return checked.data;
}
export function byteSize(text: string) { return new Blob([text]).size; }
function assertSize(text: string) {
  if (byteSize(text) > MAX_BYTES) throw new Error('项目超过 4 MiB 大小限制。');
}
/** Rebuild a session from a backup by replaying its log. Derived output in the file has no authority. */
export function restore(text: string): Session {
  assertSize(text);
  let envelope;
  try { envelope = JSON.parse(text); } catch { throw new Error('文件不是有效 JSON。'); }
  const project = migrate(envelope?.project);
  if (project.revision !== project.log.length) throw new Error('项目修订与记录数不一致。');
  let session = create(project.seed, project.description, project.createdAt, project.id);
  for (const change of project.log) session = answer(session, change.field, change.after.value, change.at);
  // Compare canonical, schema-ordered source data.
  if (JSON.stringify(schema.parse(session.project)) !== JSON.stringify(project)) throw new Error('输入、来源或修订记录不一致。');
  jsonBackup(session, project.createdAt);
  return session;
}
export function jsonBackup(s: Session, exportedAt = new Date().toISOString()): string {
  const text = JSON.stringify({ project: s.project, constraints: s.result.constraints, candidates: s.result.candidates, nodes: s.result.nodes, conflicts: s.result.conflicts, assumptions: s.result.assumptions, exportedAt });
  assertSize(text);
  return text;
}
/** Single-key atomic write. Throws on quota/permission failure; returns the stored text. */
export function save(storage: Pick<Storage, 'setItem'>, session: Session): string {
  const text = jsonBackup(session);
  storage.setItem(KEY, text);
  return text;
}
/**
 * Whether stored text holds exactly this project's source facts (ignoring `exportedAt`
 * and derived output). Used to tell a real change from another tab apart from a re-save.
 */
export function storesProject(text: string | null, project: Project | null): boolean {
  if (text === null || project === null) return text === null && project === null;
  try { return JSON.stringify(JSON.parse(text)?.project) === JSON.stringify(project); }
  catch { return false; }
}
