import { useEffect, useId, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icons'

export const Sheet = ({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) => {
  const titleId = useId()
  const themeRoot = document.querySelector<HTMLElement>('.theme-root')
  const portalThemeClasses = themeRoot?.className.replace(/\btheme-root\b/g, '').trim() ?? ''
  const portalThemeStyle = themeRoot ? Array.from({ length: themeRoot.style.length }, (_, index) => themeRoot.style.item(index)).reduce<Record<string, string>>((style, property) => {
    if (property.startsWith('--')) style[property] = themeRoot.style.getPropertyValue(property)
    if (property === 'color-scheme') style.colorScheme = themeRoot.style.getPropertyValue(property)
    return style
  }, {}) as CSSProperties : undefined
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape) }
  }, [onClose])
  return createPortal(
    <div className={`sheet-portal ${portalThemeClasses}`} style={portalThemeStyle}>
      <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head"><div><p className="eyebrow">Budget editor</p><h2 id={titleId}>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close editor"><Icon name="close" /></button></div>
        <div className="sheet-body">{children}</div>
      </aside>
      </div>
    </div>,
    document.body,
  )
}
