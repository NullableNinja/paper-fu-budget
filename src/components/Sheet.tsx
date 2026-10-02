import type { ReactNode } from 'react'
import { Icon } from './Icons'
export const Sheet = ({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) => <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="sheet"><div className="sheet-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>{children}</aside></div>
