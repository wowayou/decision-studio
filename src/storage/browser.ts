import type { Session } from '../core/types';
import { KEY, restore } from './project';

// Browser-only side effects: localStorage access, cross-tab change events and downloads.
export const errorText = (e: unknown) => e instanceof Error ? e.message : '操作失败，请保留备份并重试。';

export interface LocalLoad {
  session: Session | null; error: string;
  /** Stored text that could not be restored; kept so the user can still download it. */
  raw: string | null;
  /** Stored text the session was restored from (null when nothing was stored). */
  stored: string | null;
}
/** Read the single local project. Failures keep the raw text so it can still be downloaded. */
export function loadLocal(): LocalLoad {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    return { session: raw ? restore(raw) : null, error: '', raw: null, stored: raw };
  } catch (e) {
    return { session: null, error: `本机项目未恢复：${errorText(e)}`, raw, stored: raw };
  }
}
export function readLocalRaw(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
/** Current stored text, or `undefined` when storage cannot be read at all. */
export function peekLocal(): string | null | undefined {
  try { return localStorage.getItem(KEY); } catch { return undefined; }
}
export function clearLocal() { localStorage.removeItem(KEY); }

/**
 * Notify when another tab of this origin writes or clears the project.
 * `storage` events never fire in the tab that made the change.
 */
export function watchLocal(onChange: (raw: string | null) => void): () => void {
  const listener = (event: StorageEvent) => {
    if (event.storageArea !== localStorage) return;
    if (event.key === KEY) onChange(event.newValue);
    else if (event.key === null) onChange(null); // localStorage.clear()
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}

export function download(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener'; a.hidden = true;
  // Attached anchors download consistently across engines; detached clicks are ignored by some.
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
