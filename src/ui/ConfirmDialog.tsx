import { useState } from 'react';
import { Icon } from './Icon';
import { Modal } from './Modal';

export interface ConfirmRequest {
  title: string; body: string; confirmLabel: string; cancelLabel?: string;
  tone?: 'danger' | 'default'; onConfirm: () => void;
}

// In-app replacement for window.confirm: same focus rules as other dialogs, readable copy,
// and the safe choice receives initial focus (WAI-ARIA APG alert dialog guidance).
export function ConfirmDialog({ request, onClose }: { request: ConfirmRequest; onClose: () => void }) {
  const [opener] = useState(() => document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const finish = (confirmed: boolean) => {
    onClose();
    if (confirmed) request.onConfirm();
    requestAnimationFrame(() => { if (opener?.isConnected) opener.focus({ preventScroll: true }); });
  };
  return <Modal titleId="confirm-title" className="confirm-dialog" role="alertdialog" describedBy="confirm-body" onCancel={() => finish(false)}>
    <div className="confirm-content">
      <span className={`iconbox ${request.tone === 'danger' ? 'danger' : 'accent'}`}><Icon name={request.tone === 'danger' ? 'alert' : 'info'}/></span>
      <h2 id="confirm-title">{request.title}</h2>
      <p id="confirm-body">{request.body}</p>
      <div className="actions end">
        <button className="button secondary" data-dialog-focus onClick={() => finish(false)}>{request.cancelLabel ?? '取消'}</button>
        <button className={`button ${request.tone === 'danger' ? 'danger' : 'primary'}`} onClick={() => finish(true)}>{request.confirmLabel}</button>
      </div>
    </div>
  </Modal>;
}
