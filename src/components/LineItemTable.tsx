import { useMemo, useState } from 'react'
import type { BudgetItem, ItemKind } from '../models'
import { budgetPeriods, frequencyToMonthly, formatCurrency, monthlyToPeriod } from '../calculations/engine'

const kinds: Array<ItemKind | 'all'> = ['all', 'fixed', 'variable', 'debt', 'savings', 'discretionary']

export const LineItemTable = ({ items, onSelect, compact = false, paychecksPerYear = 26 }: { items: BudgetItem[]; onSelect?: (item: BudgetItem) => void; compact?: boolean; paychecksPerYear?: number }) => {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<ItemKind | 'all'>('all')
  const [category, setCategory] = useState('all')
  const [showInactive, setShowInactive] = useState(false)
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))).sort(), [items])
  const filtered = useMemo(() => items.filter((item) => {
    const text = `${item.name} ${item.category} ${item.notes ?? ''}`.toLowerCase()
    return (showInactive || item.active) && (!query || text.includes(query.toLowerCase())) && (kind === 'all' || item.kind === kind) && (category === 'all' || item.category === category)
  }), [items, query, kind, category, showInactive])
  const grouped = useMemo(() => Array.from(new Set(filtered.map((item) => item.category))).sort().map((group) => ({
    category: group,
    items: filtered.filter((item) => item.category === group),
  })), [filtered])
  const amountFor = (item: BudgetItem, period: typeof budgetPeriods[number]) => formatCurrency(monthlyToPeriod(frequencyToMonthly(item.amountMonthly, item.frequency), period.value, paychecksPerYear))
  const subtotalFor = (groupItems: BudgetItem[], period: typeof budgetPeriods[number]) => formatCurrency(monthlyToPeriod(groupItems.filter((item) => item.active).reduce((sum, item) => sum + frequencyToMonthly(item.amountMonthly, item.frequency), 0), period.value, paychecksPerYear), true)

  return <div className={`line-items ${compact ? 'compact' : ''}`}>
    <div className="line-tools"><input aria-label="Search budget lines" placeholder="Search every line item…" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filter by kind" value={kind} onChange={(event) => setKind(event.target.value as ItemKind | 'all')}>{kinds.map((value) => <option key={value} value={value}>{value === 'all' ? 'All types' : value}</option>)}</select><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
    <div className="line-summary"><span>Showing <b>{filtered.length}</b> of <b>{items.length}</b> lines</span><span>Every amount is normalized to the four planning periods</span><label className="check-row"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} /> Show inactive</label></div>
    <div className="line-table-head"><span>Line item</span><span>Type</span><span>Frequency</span>{budgetPeriods.map((period) => <span key={period.value}>{period.label}</span>)}<span>Status</span></div>
    <div className="line-table-body">{grouped.map(({ category: group, items: groupItems }) => <section className="line-category" key={group}>
      <div className="line-category-head"><div><span className="eyebrow">Category</span><h3>{group}</h3></div><span>{groupItems.filter((item) => item.active).length} active lines</span></div>
      <div className="line-category-list">{groupItems.map((item, index) => <button className={`line-table-row ${item.active ? '' : 'inactive'} ${index % 2 ? 'row-alt' : ''}`} key={item.id} onClick={() => onSelect?.(item)} disabled={!onSelect}>
        <span><b>{item.name}</b><small>{item.dueDay ? `Due day ${item.dueDay}` : 'No due date'}{item.autoPay ? ' · auto-pay' : ''}</small></span><span className="line-kind">{item.kind}</span><span>{item.frequency}</span>{budgetPeriods.map((period) => <strong className="line-amount" key={period.value}>{amountFor(item, period)}</strong>)}<span className={item.active ? 'positive' : 'muted'}>{item.active ? 'Included' : 'Off'}</span>
      </button>)}</div>
      <div className="line-subtotal-row"><span><b>Category subtotal</b><small>{groupItems.filter((item) => item.active).length} active lines</small></span><span /><span />{budgetPeriods.map((period) => <strong className="line-amount" key={period.value}>{subtotalFor(groupItems, period)}</strong>)}<span className="positive">Included</span></div>
    </section>)}{filtered.length === 0 && <div className="empty-state">No line items match these filters.</div>}</div>
  </div>
}
