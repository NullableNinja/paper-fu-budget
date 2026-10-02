import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export const ConfirmDialog = ({ title, message, confirmLabel, onCancel, onConfirm }: { title: string; message: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) => {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onCancel])

  return createPortal(<div className="confirm-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
      <p className="eyebrow">Confirm action</p>
      <h2 id="confirm-title">{title}</h2>
      <p id="confirm-message">{message}</p>
      <div className="confirm-actions"><button className="button" type="button" onClick={onCancel}>Cancel</button><button className="button danger-solid" type="button" onClick={onConfirm}>{confirmLabel}</button></div>
    </section>
  </div>, document.body)
}
