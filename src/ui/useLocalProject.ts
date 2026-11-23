import { useEffect, useRef, useState } from 'react';
import type { Project, Session } from '../core/types';
import { save, storesProject } from '../storage/project';
import { clearLocal, errorText, loadLocal, peekLocal, watchLocal, type LocalLoad } from '../storage/browser';

export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saved'; revision: number }
  | { kind: 'failed'; message: string }
  | { kind: 'paused' };
/** Another tab wrote (`raw`) or cleared (`null`) the stored project while this tab was open. */
export interface ExternalChange { raw: string | null }
/**
 * What this tab last knew to be in storage, or 'overwrite' after an explicit user choice
 * to make this tab authoritative (new project, import, "keep this tab").
 */
type Baseline = { text: string | null; project: Project | null } | 'overwrite';

/**
 * The single source of the applied project and its local persistence.
 * Applying, re-evaluating and saving are separate steps, and the save status says which one failed.
 * Writes are compare-before-write: if storage no longer holds what this tab last saw (another tab
 * saved, even if its `storage` event was missed, e.g. while this tab was frozen), auto-save pauses
 * and the user chooses which copy to keep. Nothing is overwritten silently.
 */
export function useLocalProject() {
  const [initial] = useState<LocalLoad>(loadLocal);
  const [session, setSession] = useState<Session | null>(initial.session);
  const [status, setStatus] = useState<SaveStatus>(initial.session ? { kind: 'saved', revision: initial.session.project.revision } : { kind: 'idle' });
  const [external, setExternal] = useState<ExternalChange | null>(null);
  const baseline = useRef<Baseline>({ text: initial.stored, project: initial.session?.project ?? null });
  const latest = useRef(session);
  useEffect(() => { latest.current = session; }, [session]);

  useEffect(() => watchLocal(raw => {
    const project = latest.current?.project ?? null;
    if (storesProject(raw, project)) {
      // Another tab re-saved the same facts (e.g. it just opened). Still in sync.
      baseline.current = { text: raw, project };
      setExternal(null);
      return;
    }
    setExternal({ raw });
  }), []);

  useEffect(() => {
    if (!session) return;
    if (external) { setStatus({ kind: 'paused' }); return; }
    const base = baseline.current;
    if (base !== 'overwrite') {
      if (session.project === base.project) { setStatus({ kind: 'saved', revision: session.project.revision }); return; }
      const now = peekLocal(); // undefined: unreadable; let save() surface that error
      if (now !== undefined && now !== base.text && !storesProject(now, base.project)) { setExternal({ raw: now }); return; }
    }
    try {
      const text = save(localStorage, session);
      baseline.current = { text, project: session.project };
      setStatus({ kind: 'saved', revision: session.project.revision });
    } catch (e) {
      setStatus({ kind: 'failed', message: errorText(e) });
    }
  }, [session, external]);

  return {
    session, status, external,
    initialError: initial.error,
    /** Raw stored text that could not be restored at startup; offered as a download. */
    unrestoredRaw: initial.raw,
    /** Whether applied edits in this tab are not yet in storage (e.g. while saving is paused). */
    hasUnsavedEdits() {
      const base = baseline.current;
      return !!latest.current && (base === 'overwrite' || latest.current.project !== base.project);
    },
    /** Apply an edit to the current project. */
    commit(next: Session) { setSession(next); },
    /**
     * Replace the whole project by explicit user choice. With `storedText`, `next` was just
     * restored from exactly that stored text and needs no rewrite.
     */
    replace(next: Session | null, storedText?: string | null) {
      baseline.current = storedText === undefined ? 'overwrite' : { text: storedText, project: next?.project ?? null };
      setExternal(null);
      setSession(next);
      if (!next) setStatus({ kind: 'idle' });
    },
    /** Keep this tab's project and write it over the other tab's change. */
    keepThisTab() {
      baseline.current = 'overwrite';
      setExternal(null);
    },
    clear() {
      clearLocal();
      baseline.current = { text: null, project: null };
      setExternal(null);
      setSession(null);
      setStatus({ kind: 'idle' });
    },
  };
}
