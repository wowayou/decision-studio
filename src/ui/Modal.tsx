import { useLayoutEffect, useRef, type ReactNode } from 'react';

// Native dialog makes the background inert; explicit edge wrapping keeps Tab in the task.
export function Modal({ titleId, children, onCancel, className = '' }: { titleId: string; children: ReactNode; onCancel: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-dialog-focus]')?.focus({ preventScroll: true });
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} className={`editor-dialog ${className}`}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const dialog = ref.current!;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], summary, [tabindex]:not([tabindex="-1"])'))
        .filter(element => !element.matches(':disabled, [tabindex="-1"]') && element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (!first || !last) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}
    onCancel={event => { event.preventDefault(); onCancel(); }}>{children}</dialog>;
}
