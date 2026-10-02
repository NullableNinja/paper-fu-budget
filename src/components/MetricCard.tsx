import type { ReactNode } from 'react'
export const MetricCard = ({ label, value, note, tone = 'paper', icon }: { label: string; value: string; note?: string; tone?: 'paper' | 'ink' | 'mint' | 'coral'; icon?: ReactNode }) => <article className={`metric-card tone-${tone}`}><div className="metric-head"><span>{label}</span>{icon}</div><strong>{value}</strong>{note && <small>{note}</small>}</article>
