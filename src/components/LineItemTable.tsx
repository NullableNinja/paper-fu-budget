import { useMemo, useState } from 'react'
import type { BudgetItem, ItemKind } from '../models'
import { frequencyToMonthly, formatCurrency, monthlyToPeriod, type BudgetPeriod } from '../calculations/engine'

const kinds: Array<ItemKind | 'all'> = ['all', 'fixed', 'variable', 'debt', 'savings', 'discretionary']
type OwnershipFilter = 'all' | 'shared' | 'individual'
type CategoryOrder = 'spreadsheet' | 'alphabetical' | 'monthly' | 'ramsey'
type LineSortKey = 'name' | 'due' | 'kind' | 'frequency' | BudgetPeriod | 'status'
const linePeriods: Array<{ value: BudgetPeriod; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
]

const sharePercent = (item: BudgetItem) => Math.min(100, Math.max(1, item.sharedSharePercent ?? 50))
const householdAmount = (item: BudgetItem) => item.amountMonthly / (sharePercent(item) / 100)
const ramseyPriority = [
  ['housing', 'utilities', 'rent', 'mortgage'],
  ['food', 'grocery'],
  ['transportation', 'vehicle', 'auto', 'gas'],
  ['medical', 'health', 'dental', 'prescription'],
  ['insurance'],
  ['debt', 'loan', 'bankruptcy', 'chapter 13'],
  ['savings', 'emergency'],
  ['dependent care', 'child'],
  ['personal'],
  ['entertainment'],
  ['misc'],
]
const spreadsheetCategoryOrder = ['Savings', 'Housing & Utilities', 'Transportation', 'Food', 'Dependent Care', 'Medical', 'Personal Care', 'Personal Wellness', 'Entertainment', 'Misc Expenses', 'Loans', 'Student Loans', 'Credit Cards']
const spreadsheetRank = (category: string) => {
  const index = spreadsheetCategoryOrder.findIndex((candidate) => candidate.toLowerCase() === category.toLowerCase())
  return index === -1 ? spreadsheetCategoryOrder.length : index
}
const ramseyRank = (category: string) => {
  const normalized = category.toLowerCase()
  const index = ramseyPriority.findIndex((terms) => terms.some((term) => normalized.includes(term)))
  return index === -1 ? ramseyPriority.length : index
}
export const LineItemTable = ({ items, onSelect, compact = false, paychecksPerYear = 26 }: { items: BudgetItem[]; onSelect?: (item: BudgetItem) => void; compact?: boolean; paychecksPerYear?: number }) => {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<ItemKind | 'all'>('all')
  const [category, setCategory] = useState('all')
  const [ownership, setOwnership] = useState<OwnershipFilter>('all')
  const [tag, setTag] = useState('all')
  const [showInactive, setShowInactive] = useState(false)
  const [showSharedDetails, setShowSharedDetails] = useState(true)
  const [categoryOrder, setCategoryOrder] = useState<CategoryOrder>('spreadsheet')
  const [sortKey, setSortKey] = useState<LineSortKey>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
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
  const periodAmount = (item: BudgetItem, period: BudgetPeriod) => monthlyToPeriod(frequencyToMonthly(item.amountMonthly, item.frequency), period, paychecksPerYear)
  const compareLines = (a: BudgetItem, b: BudgetItem) => {
    let result = 0
    if (sortKey === 'name') result = a.name.localeCompare(b.name)
    else if (sortKey === 'due') result = (a.dueUponReceipt ? 0 : a.dueDay ?? 999) - (b.dueUponReceipt ? 0 : b.dueDay ?? 999)
    else if (sortKey === 'kind') result = a.kind.localeCompare(b.kind)
    else if (sortKey === 'frequency') result = a.frequency.localeCompare(b.frequency)
    else if (sortKey === 'status') result = Number(a.active) - Number(b.active)
    else result = periodAmount(a, sortKey) - periodAmount(b, sortKey)
    return (sortDirection === 'asc' ? result : -result) || a.name.localeCompare(b.name)
  }
  const toggleSort = (key: LineSortKey) => {
    if (sortKey === key) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDirection('asc') }
  }
  const sortIndicator = (key: LineSortKey) => sortKey === key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''
  const grouped = useMemo(() => {
    const groups = Array.from(new Set(filtered.map((item) => item.category))).map((group) => ({
      category: group,
      items: filtered.filter((item) => item.category === group).sort(compareLines),
    }))
    return groups.sort((a, b) => {
      if (categoryOrder === 'spreadsheet') return spreadsheetRank(a.category) - spreadsheetRank(b.category) || a.category.localeCompare(b.category)
      if (categoryOrder === 'monthly') {
        const aTotal = a.items.filter((item) => item.active).reduce((sum, item) => sum + frequencyToMonthly(item.amountMonthly, item.frequency), 0)
        const bTotal = b.items.filter((item) => item.active).reduce((sum, item) => sum + frequencyToMonthly(item.amountMonthly, item.frequency), 0)
        return bTotal - aTotal || a.category.localeCompare(b.category)
      }
      if (categoryOrder === 'ramsey') return ramseyRank(a.category) - ramseyRank(b.category) || a.category.localeCompare(b.category)
      return a.category.localeCompare(b.category)
    })
  }, [filtered, categoryOrder, sortKey, sortDirection])
  const amountFor = (item: BudgetItem, period: typeof linePeriods[number]) => formatCurrency(periodAmount(item, period.value))
  const subtotalFor = (groupItems: BudgetItem[], period: typeof linePeriods[number]) => formatCurrency(monthlyToPeriod(groupItems.filter((item) => item.active).reduce((sum, item) => sum + frequencyToMonthly(item.amountMonthly, item.frequency), 0), period.value, paychecksPerYear))
  const cumulativeFor = (groupIndex: number, period: typeof linePeriods[number]) => formatCurrency(monthlyToPeriod(grouped.slice(0, groupIndex + 1).flatMap((group) => group.items).filter((item) => item.active).reduce((sum, item) => sum + frequencyToMonthly(item.amountMonthly, item.frequency), 0), period.value, paychecksPerYear))
  const sortableHeader = (key: LineSortKey, label: string) => <button type="button" className={`line-sort-button ${sortKey === key ? 'selected' : ''}`} onClick={() => toggleSort(key)}>{label}{sortIndicator(key)}</button>

  return <div className={`line-items ${compact ? 'compact' : ''}`}>
    <div className="line-tools">
      <input aria-label="Search budget lines" placeholder="Search every line item…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Filter by kind" value={kind} onChange={(event) => setKind(event.target.value as ItemKind | 'all')}>{kinds.map((value) => <option key={value} value={value}>{value === 'all' ? 'All types' : value}</option>)}</select>
      <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select>
      <select aria-label="Filter by ownership" value={ownership} onChange={(event) => setOwnership(event.target.value as OwnershipFilter)}><option value="all">All ownership</option><option value="shared">Shared only</option><option value="individual">My expenses</option></select>
      <select aria-label="Filter by tag" value={tag} onChange={(event) => setTag(event.target.value)}><option value="all">All tags</option>{tags.map((value) => <option key={value} value={value}>{value}</option>)}</select>
    </div>
    <div className="line-summary"><span>Showing <b>{filtered.length}</b> of <b>{items.length}</b> lines</span><span>{sharedCount ? `${sharedCount} shared · amounts shown are your share` : 'Mark split bills as shared in the editor'}</span><div className="line-sort-control" aria-label="Category order"><span>Category order</span>{([{ value: 'spreadsheet', label: 'Spreadsheet' }, { value: 'alphabetical', label: 'A–Z' }, { value: 'monthly', label: 'Largest first' }, { value: 'ramsey', label: 'Ramsey' }] as Array<{ value: CategoryOrder; label: string }>).map((option) => <button type="button" className={categoryOrder === option.value ? 'selected' : ''} onClick={() => setCategoryOrder(option.value)} key={option.value}>{option.label}</button>)}</div><label className="check-row"><input type="checkbox" checked={showSharedDetails} onChange={(event) => setShowSharedDetails(event.target.checked)} /> Show shared details</label><label className="check-row"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} /> Show inactive</label></div>
    <div className="line-table-head global-line-head"><span>{sortableHeader('name', 'Line item')}</span><span>{sortableHeader('due', 'Due')}</span><span>{sortableHeader('kind', 'Type')}</span><span>{sortableHeader('frequency', 'Frequency')}</span>{linePeriods.map((period) => <span key={period.value}>{sortableHeader(period.value, period.label)}</span>)}</div>
    <div className="line-table-body">{grouped.map(({ category: group, items: groupItems }, groupIndex) => <section className="line-category" key={group}>
      <div className="line-category-head"><div><span className="eyebrow">Category</span><h3>{group}</h3></div><div className="line-category-actions"><span>{groupItems.filter((item) => item.active).length} active lines</span><button type="button" className={`line-status-sort ${sortKey === 'status' ? 'selected' : ''}`} onClick={() => toggleSort('status')}>Status{sortIndicator('status')}</button></div></div>
      <div className="line-table-head line-category-columns"><span>{sortableHeader('name', 'Line item')}</span><span>{sortableHeader('due', 'Due')}</span><span>{sortableHeader('kind', 'Type')}</span><span>{sortableHeader('frequency', 'Frequency')}</span>{linePeriods.map((period) => <span key={period.value}>{sortableHeader(period.value, period.label)}</span>)}</div>
      <div className="line-category-list">{groupItems.map((item, index) => <button className={`line-table-row ${item.active ? '' : 'inactive'} ${index % 2 ? 'row-alt' : ''} ${item.shared ? 'shared-row' : ''}`} key={item.id} onClick={() => onSelect?.(item)} disabled={!onSelect}>
        <span className="line-item-copy"><span className="line-name">{item.name}</span><span className="line-item-meta">{showSharedDetails && item.shared && <span className="shared-badge">Shared · your {sharePercent(item)}%</span>}{item.tags && item.tags.length > 0 && <span className="tag-list">{item.tags.map((value) => <span className="tag-badge" key={value}>{value}</span>)}</span>}{item.autoPay && <span className="line-meta-text">Auto-pay</span>}{item.notes && <span className="line-meta-text">Note</span>}{showSharedDetails && item.shared && <span className="shared-detail">Household {formatCurrency(householdAmount(item))} · your share {formatCurrency(item.amountMonthly)}</span>}</span></span><span className="line-due">{item.dueUponReceipt ? 'Upon receipt' : item.dueDay ? `Day ${item.dueDay}` : '—'}</span><span className="line-kind">{item.kind}</span><span>{item.frequency}</span>{linePeriods.map((period) => <strong className="line-amount" key={period.value}>{amountFor(item, period)}</strong>)}
      </button>)}</div>
      <div className="line-subtotal-row"><span><b>Category subtotal</b><small>{groupItems.filter((item) => item.active).length} active lines{groupItems.some((item) => item.active && item.shared) ? ` · ${groupItems.filter((item) => item.active && item.shared).length} shared` : ''}</small></span><span>—</span><span /><span />{linePeriods.map((period) => <strong className="line-amount" key={period.value}>{subtotalFor(groupItems, period)}</strong>)}</div>
      <div className="line-cumulative-row"><span><b>Cumulative total</b><small>Through {group}</small></span><span>—</span><span /><span />{linePeriods.map((period) => <strong className="line-amount" key={period.value}>{cumulativeFor(groupIndex, period)}</strong>)}</div>
    </section>)}{filtered.length === 0 && <div className="empty-state">No line items match these filters.</div>}</div>
  </div>
}
