import { useMemo, useState } from 'react'
import type { BudgetItem, ItemKind } from '../models'
import { frequencyToMonthly, formatCurrency, monthlyToPeriod, type BudgetPeriod } from '../calculations/engine'

const kinds: Array<ItemKind | 'all'> = ['all', 'fixed', 'variable', 'debt', 'savings', 'discretionary']
type OwnershipFilter = 'all' | 'shared' | 'individual'
const linePeriods: Array<{ value: BudgetPeriod; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
]

const sharePercent = (item: BudgetItem) => Math.min(100, Math.max(1, item.sharedSharePercent ?? 50))
const householdAmount = (item: BudgetItem) => item.amountMonthly / (sharePercent(item) / 100)
const hasDueDate = (item: BudgetItem) => Boolean(item.dueDay || item.dueUponReceipt)

export const LineItemTable = ({ items, onSelect, compact = false, paychecksPerYear = 26 }: { items: BudgetItem[]; onSelect?: (item: BudgetItem) => void; compact?: boolean; paychecksPerYear?: number }) => {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<ItemKind | 'all'>('all')
  const [category, setCategory] = useState('all')
  const [ownership, setOwnership] = useState<OwnershipFilter>('all')
  const [tag, setTag] = useState('all')
  const [showInactive, setShowInactive] = useState(false)
  const [showSharedDetails, setShowSharedDetails] = useState(true)
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))).sort(), [items])
  const tags = useMemo(() => Array.from(new Set(items.flatMap((item) => item.tags ?? []))).sort(), [items])
  const sharedCount = items.filter((item) => item.shared && item.active).length
  const filtered = useMemo(() => items.filter((item) => {
    const text = `${item.name} ${item.category} ${item.notes ?? ''}`.toLowerCase()
    const ownershipMatches = ownership === 'all' || (ownership === 'shared' ? item.shared : !item.shared)
    const tagMatches = tag === 'all' || (item.tags ?? []).includes(tag)
    const searchableTags = (item.tags ?? []).join(' ').toLowerCase()
    return (showInactive || item.active) && ownershipMatches && tagMatches && (!query || `${text} ${searchableTags}`.includes(query.toLowerCase())) && (kind === 'all' || item.kind === kind) && (category === 'all' || item.category === category)
  }), [items, query, kind, category, ownership, tag, showInactive])
  const grouped = useMemo(() => Array.from(new Set(filtered.map((item) => item.category))).sort().map((group) => ({
    category: group,
    items: filtered.filter((item) => item.category === group),
  })), [filtered])
  const amountFor = (item: BudgetItem, period: typeof linePeriods[number]) => formatCurrency(monthlyToPeriod(frequencyToMonthly(item.amountMonthly, item.frequency), period.value, paychecksPerYear))
  const subtotalFor = (groupItems: BudgetItem[], period: typeof linePeriods[number]) => formatCurrency(monthlyToPeriod(groupItems.filter((item) => item.active).reduce((sum, item) => sum + frequencyToMonthly(item.amountMonthly, item.frequency), 0), period.value, paychecksPerYear), true)

  return <div className={`line-items ${compact ? 'compact' : ''}`}>
    <div className="line-tools">
      <input aria-label="Search budget lines" placeholder="Search every line item…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Filter by kind" value={kind} onChange={(event) => setKind(event.target.value as ItemKind | 'all')}>{kinds.map((value) => <option key={value} value={value}>{value === 'all' ? 'All types' : value}</option>)}</select>
      <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select>
      <select aria-label="Filter by ownership" value={ownership} onChange={(event) => setOwnership(event.target.value as OwnershipFilter)}><option value="all">All ownership</option><option value="shared">Shared only</option><option value="individual">My expenses</option></select>
      <select aria-label="Filter by tag" value={tag} onChange={(event) => setTag(event.target.value)}><option value="all">All tags</option>{tags.map((value) => <option key={value} value={value}>{value}</option>)}</select>
    </div>
    <div className="line-summary"><span>Showing <b>{filtered.length}</b> of <b>{items.length}</b> lines</span><span>{sharedCount ? `${sharedCount} shared · amounts shown are your share` : 'Mark split bills as shared in the editor'}</span><label className="check-row"><input type="checkbox" checked={showSharedDetails} onChange={(event) => setShowSharedDetails(event.target.checked)} /> Show shared details</label><label className="check-row"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} /> Show inactive</label></div>
    <div className="line-table-head global-line-head"><span>Line item</span><span>Due</span><span>Type</span><span>Frequency</span>{linePeriods.map((period) => <span key={period.value}>{period.label}</span>)}<span>Status</span></div>
    <div className="line-table-body">{grouped.map(({ category: group, items: groupItems }) => <section className="line-category" key={group}>
      <div className="line-category-head"><div><span className="eyebrow">Category</span><h3>{group}</h3></div><span>{groupItems.filter((item) => item.active).length} active lines</span></div>
      <div className="line-table-head line-category-columns"><span>Line item</span><span>Due</span><span>Type</span><span>Frequency</span>{linePeriods.map((period) => <span key={period.value}>{period.label}</span>)}<span>Status</span></div>
      <div className="line-category-list">{groupItems.map((item, index) => <button className={`line-table-row ${item.active ? '' : 'inactive'} ${index % 2 ? 'row-alt' : ''} ${item.shared ? 'shared-row' : ''}`} key={item.id} onClick={() => onSelect?.(item)} disabled={!onSelect}>
        <span className="line-item-copy"><span className="line-name">{item.name}</span>{showSharedDetails && item.shared && <span className="shared-badge">Shared · your {sharePercent(item)}%</span>}{item.tags && item.tags.length > 0 && <span className="tag-list">{item.tags.map((value) => <span className="tag-badge" key={value}>{value}</span>)}</span>}<small>{item.autoPay ? 'Auto-pay' : ''}{item.notes ? ' · Note saved' : ''}</small>{showSharedDetails && item.shared && <small className="shared-detail">Household {formatCurrency(householdAmount(item), true)} · your share {formatCurrency(item.amountMonthly, true)}</small>}</span><span className={`line-due ${hasDueDate(item) && !item.paid ? 'late-label' : ''}`}>{item.dueUponReceipt ? 'Upon receipt' : item.dueDay ? `Day ${item.dueDay}` : '—'}{hasDueDate(item) && !item.paid ? ' · late' : ''}</span><span className="line-kind">{item.kind}</span><span>{item.frequency}</span>{linePeriods.map((period) => <strong className="line-amount" key={period.value}>{amountFor(item, period)}</strong>)}<span className={item.active ? 'positive' : 'muted'}>{item.active ? 'Included' : 'Off'}</span>
      </button>)}</div>
      <div className="line-subtotal-row"><span><b>Category subtotal</b><small>{groupItems.filter((item) => item.active).length} active lines{groupItems.some((item) => item.active && item.shared) ? ` · ${groupItems.filter((item) => item.active && item.shared).length} shared` : ''}</small></span><span>—</span><span /><span />{linePeriods.map((period) => <strong className="line-amount" key={period.value}>{subtotalFor(groupItems, period)}</strong>)}<span className="positive">Included</span></div>
    </section>)}{filtered.length === 0 && <div className="empty-state">No line items match these filters.</div>}</div>
  </div>
}
