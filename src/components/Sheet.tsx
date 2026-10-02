import { useEffect, useId, type ReactNode } from 'react'
import { Icon } from './Icons'

export const Sheet = ({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) => {
  const titleId = useId()
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape) }
  }, [onClose])
  return <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}><div className="sheet-head"><div><p className="eyebrow">Budget editor</p><h2 id={titleId}>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close editor"><Icon name="close" /></button></div><div className="sheet-body">{children}</div></aside></div>
}
