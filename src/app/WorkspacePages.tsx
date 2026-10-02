import { useState } from 'react'
import type { BudgetItem, BudgetScenario, DebtRecord, ItemKind, PaycheckModel } from '../models'
import { calculateScenario, calculateScenario as totalsFor, formatCurrency, formatSignedCurrency, frequencyToMonthly, nextPaycheck } from '../calculations/engine'
import { annualGrossForSource, calculateSourceNetContribution, calculateW2Taxes, sourceGrossBreakdown } from '../calculations/taxes'
import { BarChart } from '../components/BarChart'
import { DonutChart } from '../components/DonutChart'
import { BudgetLineEditor } from '../components/BudgetLineEditor'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { LineItemTable } from '../components/LineItemTable'
import { MetricCard } from '../components/MetricCard'
import { Sheet } from '../components/Sheet'
import { PeriodSummaryStrip } from '../components/PeriodSummaryStrip'

const newLine = (kind: ItemKind): BudgetItem => ({ id: `line-${Date.now()}`, name: '', category: kind === 'savings' ? 'Savings' : 'New category', kind, amountMonthly: 0, frequency: 'monthly', active: true })

const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 86400000)

export const DashboardV2 = ({ scenario, onUpdate }: { scenario: BudgetScenario; onUpdate: (scenario: BudgetScenario) => void }) => {
  const totals = calculateScenario(scenario)
  const pay = nextPaycheck(scenario)
  const [selected, setSelected] = useState<BudgetItem | null>(null)
  const activeItems = scenario.items.filter((item) => item.active)
  const categoryTotals = activeItems.reduce<Record<string, number>>((result, item) => { result[item.category] = (result[item.category] ?? 0) + frequencyToMonthly(item.amountMonthly, item.frequency); return result }, {})
  const allocationRows = [
    { label: 'Required', value: totals.required, color: 'var(--chart-1)' },
    { label: 'Savings', value: totals.savings, color: 'var(--chart-3)' },
    { label: 'Flexible', value: totals.discretionary, color: 'var(--chart-2)' },
  ]
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const billWatch = activeItems.filter((item) => item.dueDay || item.dueUponReceipt).map((bill) => {
    const dueDate = bill.dueDay ? new Date(today.getFullYear(), today.getMonth(), Math.min(bill.dueDay, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate())) : undefined
    const daysUntil = dueDate ? daysBetween(startOfToday, dueDate) : undefined
    const status = bill.paid ? 'paid' : bill.dueUponReceipt ? 'receipt' : (daysUntil ?? 0) < 0 ? 'overdue' : (daysUntil ?? 99) <= 7 ? 'soon' : 'scheduled'
    return { bill, dueDate, daysUntil, status, amount: frequencyToMonthly(bill.amountMonthly, bill.frequency) }
  }).sort((a, b) => {
    const priority: Record<string, number> = { overdue: 0, soon: 1, scheduled: 2, receipt: 3, paid: 4 }
    return (priority[a.status] - priority[b.status]) || ((a.daysUntil ?? 999) - (b.daysUntil ?? 999))
  })
  const visibleBills = billWatch.slice(0, 7)
  const overdueBills = billWatch.filter((item) => item.status === 'overdue')
  const soonBills = billWatch.filter((item) => item.status === 'soon')
  const saveItem = (item: BudgetItem) => { onUpdate({ ...scenario, items: scenario.items.some((candidate) => candidate.id === item.id) ? scenario.items.map((candidate) => candidate.id === item.id ? item : candidate) : [...scenario.items, item] }); setSelected(null) }
  const deleteItem = (item: BudgetItem) => { onUpdate({ ...scenario, items: scenario.items.filter((candidate) => candidate.id !== item.id) }); setSelected(null) }
  const stable = totals.monthlySurplus >= 0 && totals.paycheckSurplus >= 0
  const billTiming = (entry: typeof visibleBills[number]) => {
    if (entry.status === 'paid') return 'Paid'
    if (entry.status === 'receipt') return 'When received'
    if (entry.status === 'overdue') return `Overdue ${Math.abs(entry.daysUntil ?? 0)}d`
    if (entry.daysUntil === 0) return 'Due today'
    if (entry.daysUntil === 1) return 'Due tomorrow'
    if ((entry.daysUntil ?? 99) <= 7) return `Due in ${entry.daysUntil}d`
    return entry.dueDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) ?? 'Scheduled'
  }
  return <div className="page-grid">
    <section className="hero paper-stack"><div><p className="eyebrow">{scenario.name}</p><h2>Know what is<br /><em>actually left.</em></h2><p className="hero-copy">A compact read on your active income, planned outflow, and remaining cash.</p></div><div className="hero-stamp"><span>Monthly remaining</span><b className={totals.monthlySurplus >= 0 ? 'positive' : 'negative'}>{formatSignedCurrency(totals.monthlySurplus)}</b><small>{stable ? 'available after the full plan' : 'shortfall against the current plan'}</small></div></section>
    <section className="metrics"><MetricCard label="Net income / month" value={formatCurrency(totals.monthlyIncome)} note={`${formatCurrency(totals.paycheckIncome)} per biweekly paycheck`} tone="ink" /><MetricCard label="Planned outflow / month" value={formatCurrency(totals.totalOutflow)} note={`${formatCurrency(pay.allocation)} set aside each paycheck`} tone="paper" /><MetricCard label="Monthly remaining" value={formatSignedCurrency(totals.monthlySurplus)} note="income minus every active line" tone={totals.monthlySurplus >= 0 ? 'positive' : 'negative'} /><MetricCard label="Paycheck remaining" value={formatSignedCurrency(totals.paycheckSurplus)} note={totals.paycheckSurplus >= 0 ? 'after bills, savings, and discretionary money' : 'shortfall after paycheck allocations'} tone={totals.paycheckSurplus >= 0 ? 'positive' : 'negative'} /></section>
    <section className="panel telemetry-panel"><div className="panel-head"><div><p className="eyebrow">Financial telemetry</p><h2>Where the month goes</h2><p className="panel-lede">Your monthly cash plan, split into the decisions you can actually act on.</p></div><span className="chip">{activeItems.length} active lines</span></div><div className="telemetry-grid"><DonutChart rows={allocationRows} centerLabel="planned outflow" centerValue={formatCurrency(totals.totalOutflow, true)} /><div className="telemetry-stats"><div><span>Required load</span><b>{Math.round(totals.required / Math.max(totals.monthlyIncome, 1) * 100)}%</b><small>of net income</small></div><div><span>Savings rate</span><b>{Math.round(totals.savings / Math.max(totals.monthlyIncome, 1) * 100)}%</b><small>of net income</small></div><div><span>Debt balance</span><b>{formatCurrency(totals.debtBalance, true)}</b><small>across tracked accounts</small></div><div><span>Unassigned</span><b className={totals.monthlySurplus >= 0 ? 'positive' : 'negative'}>{formatSignedCurrency(totals.monthlySurplus)}</b><small>after every active line</small></div></div></div></section>
    <section className="panel"><div className="panel-head"><div><p className="eyebrow">Category pressure</p><h2>Monthly allocations</h2></div><a className="text-link" href="#/budget">See every line ↗</a></div><BarChart rows={Object.entries(categoryTotals).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, value], index) => ({ label, value, color: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'][index % 4] }))} /></section>
    <section className="panel upcoming bills-panel"><div className="panel-head"><div><p className="eyebrow">Context-aware calendar</p><h2>Bills to watch</h2><p className="panel-lede">{overdueBills.length ? `${overdueBills.length} overdue item${overdueBills.length === 1 ? '' : 's'} need attention.` : soonBills.length ? `${soonBills.length} bill${soonBills.length === 1 ? '' : 's'} due within the next 7 days.` : 'Nothing urgent in the next 7 days.'}</p></div><a className="text-link" href="#/bills">Open bill center ↗</a></div><div className="bill-watch-summary"><span className={overdueBills.length ? 'negative' : ''}>{overdueBills.length} overdue</span><span>{soonBills.length} due soon</span><span>{billWatch.filter((item) => item.status === 'scheduled').length} scheduled</span></div>{visibleBills.map((entry) => <div className={`bill-row bill-watch-row bill-${entry.status}`} key={entry.bill.id}><div className="date-badge"><b>{entry.bill.dueUponReceipt ? 'NOW' : entry.bill.dueDay}</b><span>{entry.bill.dueUponReceipt ? 'RECEIPT' : 'DAY'}</span></div><div><b>{entry.bill.name}</b><small>{entry.bill.category}{entry.bill.autoPay ? ' · auto-pay' : ''}</small></div><div className="bill-watch-meta"><span className={entry.status === 'overdue' ? 'negative' : entry.status === 'paid' ? 'positive' : ''}>{billTiming(entry)}</span><strong>{formatCurrency(entry.amount)}</strong></div></div>)}{visibleBills.length === 0 && <div className="empty-state">No active bills have a due day or receipt-based timing yet.</div>}</section>
    <section className="insight"><span className="insight-mark">!</span><div><p className="eyebrow">Reconciliation status</p><b>{stable ? 'The current scenario is balanced.' : 'The current scenario is short against the active plan.'}</b><p>{stable ? `${formatCurrency(totals.monthlySurplus)} remains monthly and ${formatCurrency(totals.paycheckSurplus)} remains per biweekly paycheck.` : 'Reduce, deactivate, or retime an active line item, or increase income, then use this panel to confirm the impact.'}</p></div></section>
    <section className="panel full-width"><div className="panel-head"><div><p className="eyebrow">Complete plan</p><h2>Every budget line item</h2><p className="muted">Search, filter, activate, deactivate, and edit any line. This is the full list behind the totals above.</p></div><button className="button primary" onClick={() => setSelected(newLine('variable'))}>+ Add line</button></div><LineItemTable items={scenario.items} onSelect={setSelected} />{selected && <BudgetLineEditor item={selected} onClose={() => setSelected(null)} onSave={saveItem} onDelete={deleteItem} />}</section>
  </div>
}
export const BudgetWorkspacePage = ({ scenario, onUpdate }: { scenario: BudgetScenario; onUpdate: (scenario: BudgetScenario) => void }) => {
  const [selected, setSelected] = useState<BudgetItem | null>(null)
  const categories = Array.from(new Set(scenario.items.map((item) => item.category)))
  const saveItem = (item: BudgetItem) => { onUpdate({ ...scenario, items: scenario.items.some((candidate) => candidate.id === item.id) ? scenario.items.map((candidate) => candidate.id === item.id ? item : candidate) : [...scenario.items, item] }); setSelected(null) }
  const deleteItem = (item: BudgetItem) => { onUpdate({ ...scenario, items: scenario.items.filter((candidate) => candidate.id !== item.id) }); setSelected(null) }
  return <div className="page-grid"><div className="page-intro"><div><p className="eyebrow">Editable plan</p><h2>All line items</h2><p className="muted">Every category repeats the ledger headings. Each line shows daily, weekly, bi-weekly, monthly, and annual equivalents, with due dates in their own column.</p></div><div className="chip">{scenario.items.filter((item) => item.active).length} active / {scenario.items.length} total</div></div><PeriodSummaryStrip scenario={scenario} /><section className="panel full-width"><div className="panel-head"><div><p className="eyebrow">Controls</p><h2>Find and edit anything</h2></div><button className="button primary" onClick={() => setSelected(newLine('variable'))}>+ Add line item</button></div><LineItemTable items={scenario.items} onSelect={setSelected} />{selected && <BudgetLineEditor item={selected} categories={categories} onClose={() => setSelected(null)} onSave={saveItem} onDelete={deleteItem} />}</section></div>
}

export const IncomePage = ({ scenario, onUpdate }: { scenario: BudgetScenario; onUpdate: (scenario: BudgetScenario) => void }) => {
  const estimate = calculateW2Taxes(scenario)
  const [raiseDrafts, setRaiseDrafts] = useState<Record<string, string>>({})
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const updateSource = (id: string, changes: Record<string, unknown>) => {
    const incomeSources = scenario.incomeSources.map((source) => source.id === id ? { ...source, ...changes } : source)
    const primary = incomeSources.find((source) => source.id === 'primary-income')
    const next = { ...scenario, incomeSources, salary: primary ? annualGrossForSource(primary) : scenario.salary }
    onUpdate({ ...next, annualNet: calculateW2Taxes(next).primaryAnnualNet })
  }
  const applyRaise = (source: BudgetScenario['incomeSources'][number]) => {
    const percent = Number(raiseDrafts[source.id])
    if (!Number.isFinite(percent) || percent <= 0) return
    const multiplier = 1 + percent / 100
    if (source.payType === 'hourly') {
      updateSource(source.id, { hourlyRate: Number(((source.hourlyRate ?? 0) * multiplier).toFixed(2)) })
    } else {
      updateSource(source.id, { annualSalary: Number(((source.annualSalary ?? source.annualGross) * multiplier).toFixed(2)) })
    }
    setRaiseDrafts((drafts) => ({ ...drafts, [source.id]: '' }))
  }
  const removeSource = (id: string) => {
    if (!scenario.incomeSources.some((source) => source.id === id)) return
    setPendingDelete(id)
  }
  const confirmRemoveSource = () => {
    if (!pendingDelete) return
    const incomeSources = scenario.incomeSources.filter((candidate) => candidate.id !== pendingDelete)
    const primary = incomeSources.find((candidate) => candidate.id === 'primary-income')
    const next = { ...scenario, incomeSources, salary: primary ? annualGrossForSource(primary) : 0 }
    onUpdate({ ...next, annualNet: calculateW2Taxes(next).primaryAnnualNet })
    setPendingDelete(null)
  }
  const addSource = (name = 'Additional job', active = false) => onUpdate({ ...scenario, incomeSources: [...scenario.incomeSources, { id: `income-${Date.now()}`, name, payType: 'hourly', payFrequency: 'weekly', hourlyRate: 20, regularHoursPerWeek: 10, paidWeeksPerYear: 52, annualGross: 10400, annualNet: 0, netRetention: 0, active, overtime: { enabled: false, hoursPerPayPeriod: 0, multiplier: 1.5 } }] })
  return <div className="page-grid">
    <div className="page-intro"><div><p className="eyebrow">Income engine</p><h2>Income and payroll</h2><p className="muted">Model every job in the selected scenario here. Switch the Scenario dropdown above to compare another plan, then adjust its income without creating a separate scenario.</p></div><a className="button" href="#/settings/taxes">Open tax profile ↗</a></div>
    <section className="metrics"><MetricCard label="Your gross wages" value={formatCurrency(estimate.primaryGrossWages, true)} note="annual W-2 wages modeled" tone="ink" /><MetricCard label="Your estimated take-home" value={formatCurrency(estimate.primaryAnnualNet / 12, true)} note={`${formatCurrency(estimate.primaryPaycheckNet)} per paycheck`} tone="mint" /><MetricCard label="Total annual taxes" value={formatCurrency(estimate.totalTaxes, true)} note={`${Math.round(estimate.effectiveTaxRate * 1000) / 10}% of modeled gross`} tone="paper" /></section>
    <section className="panel full-width"><div className="panel-head"><div><p className="eyebrow">Income sources</p><h2>Every job</h2><p className="panel-lede">Keep each job’s pay setup together. Overtime belongs with compensation, and actions stay in the card corner.</p></div><button className="button primary" onClick={() => addSource()}>+ Add job</button></div><div className="income-list">{scenario.incomeSources.map((source) => { const breakdown = sourceGrossBreakdown(source); const overtimeEnabled = source.overtime?.enabled ?? false; return <article className="income-row" key={source.id}>
      <div className="income-card-head"><div><p className="income-source-kicker">Income source</p><h3>{source.name || 'Untitled job'}</h3><span className={`income-source-status ${source.active ? 'is-included' : 'is-excluded'}`}>{source.active ? 'Included in plan' : 'Excluded from plan'}</span></div><details className="income-actions"><summary aria-label={`More actions for ${source.name || 'income source'}`}>⋮</summary><div className="income-menu"><button className="button small danger-solid" type="button" onClick={() => removeSource(source.id)}>Remove job</button></div></details></div>
      <div className="income-fields-primary"><label>Job<input value={source.name} onChange={(event) => updateSource(source.id, { name: event.target.value })} /></label><label>Pay type<select value={source.payType ?? 'salary'} onChange={(event) => updateSource(source.id, { payType: event.target.value, annualSalary: event.target.value === 'salary' ? source.annualSalary ?? source.annualGross : undefined, hourlyRate: event.target.value === 'hourly' ? source.hourlyRate ?? 20 : undefined, payFrequency: event.target.value === 'hourly' ? source.payFrequency ?? 'weekly' : source.payFrequency ?? 'biweekly' })}><option value="salary">Salary</option><option value="hourly">Hourly</option></select></label><div className="income-compensation-field">{source.payType === 'hourly' ? <label>Hourly rate<input type="number" min="0" step="0.01" value={source.hourlyRate ?? 0} onChange={(event) => updateSource(source.id, { hourlyRate: Number(event.target.value) })} /></label> : <label>Annual salary<input type="number" min="0" step="1" value={source.annualSalary ?? source.annualGross} onChange={(event) => updateSource(source.id, { annualSalary: Number(event.target.value) })} /></label>}<label className="income-toggle"><input type="checkbox" checked={overtimeEnabled} onChange={(event) => updateSource(source.id, { overtime: { ...(source.overtime ?? { hoursPerPayPeriod: 0, multiplier: 1.5 }), enabled: event.target.checked } })} /> Overtime allowed</label></div><label>Pay frequency<select value={source.payFrequency ?? (source.payType === 'hourly' ? 'weekly' : 'biweekly')} onChange={(event) => updateSource(source.id, { payFrequency: event.target.value })}><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="semimonthly">Semimonthly</option><option value="monthly">Monthly</option></select></label></div>
      <div className="income-fields-secondary">{source.payType === 'hourly' && <><label>Hours / week<input type="number" min="0" step="0.25" value={source.regularHoursPerWeek ?? 0} onChange={(event) => updateSource(source.id, { regularHoursPerWeek: Number(event.target.value) })} /></label><label>Paid weeks<input type="number" min="0" max="52" step="1" value={source.paidWeeksPerYear ?? 52} onChange={(event) => updateSource(source.id, { paidWeeksPerYear: Number(event.target.value) })} /></label></>}{overtimeEnabled && <label>OT hours / pay period<input type="number" min="0" step="0.25" value={source.overtime?.hoursPerPayPeriod ?? 0} onChange={(event) => updateSource(source.id, { overtime: { ...source.overtime!, hoursPerPayPeriod: Number(event.target.value) } })} /></label>}</div>
      <div className="income-card-footer"><label className="income-toggle"><input type="checkbox" checked={source.active} onChange={(event) => updateSource(source.id, { active: event.target.checked })} /> Included in plan</label><strong>{source.active ? `${formatCurrency(breakdown.annualGross, true)} / yr · ${formatCurrency(calculateSourceNetContribution(scenario, source.id) / 12, true)} net / mo` : 'Not included in calculations'}</strong></div>
    </article> })}</div></section>
    <section className="panel full-width income-adjustments"><div className="panel-head"><div><p className="eyebrow">Scenario income controls</p><h2>Adjust without cloning</h2><p className="panel-lede">Apply a percentage raise to any job in the selected scenario, or add a second job directly.</p></div><button className="button primary" onClick={() => addSource('Second job', true)}>+ Add second job</button></div><div className="income-adjustment-list">{scenario.incomeSources.map((source) => <div className="income-adjustment-row" key={source.id}><div><b>{source.name}</b><small>{source.payType === 'hourly' ? 'Hourly rate' : 'Annual salary'} · {source.active ? 'included' : 'off'}</small></div><label>Raise percentage<div className="income-inline-field"><input aria-label={`Raise percentage for ${source.name}`} type="number" min="0.1" max="200" step="0.1" placeholder="0" value={raiseDrafts[source.id] ?? ''} onChange={(event) => setRaiseDrafts({ ...raiseDrafts, [source.id]: event.target.value })} /><span>%</span><button className="button small" type="button" disabled={!Number.isFinite(Number(raiseDrafts[source.id])) || Number(raiseDrafts[source.id]) <= 0} onClick={() => applyRaise(source)}>Apply raise</button></div></label></div>)}</div></section>
    {pendingDelete && <ConfirmDialog title="Remove this job?" message={`“${scenario.incomeSources.find((source) => source.id === pendingDelete)?.name || 'This income source'}” will be removed from this scenario. This cannot be undone from the app.`} confirmLabel="Remove job" onCancel={() => setPendingDelete(null)} onConfirm={confirmRemoveSource} />}
  </div>
}

const paycheckModelDefaults = (scenario: BudgetScenario): PaycheckModel => {
  const periods = scenario.paychecksPerYear || 26
  const benefits = scenario.taxProfile.annualPreTaxBenefits / periods
  return { grossPayPerPaycheck: scenario.salary / periods, paychecksPerYear: periods, retirement401kPerPaycheck: scenario.salary * scenario.taxProfile.retirement401kRate / periods, fsaMedicalPerPaycheck: benefits, criticalIllnessPerPaycheck: 0, healthPremiumPerPaycheck: 0, otherPreTaxBenefitsPerPaycheck: 0, postTaxDeductionsPerPaycheck: scenario.taxProfile.annualPostTaxDeductions / periods }
}

export const PaycheckModelPage = ({ scenario, onUpdate }: { scenario: BudgetScenario; onUpdate: (scenario: BudgetScenario) => void }) => {
  const [draft, setDraft] = useState<PaycheckModel>(scenario.paycheckModel ?? paycheckModelDefaults(scenario))
  const preview = { ...scenario, paycheckModel: draft, paychecksPerYear: draft.paychecksPerYear }
  const estimate = calculateW2Taxes(preview)
  const update = <K extends keyof PaycheckModel>(key: K, value: PaycheckModel[K]) => setDraft({ ...draft, [key]: value })
  const annualGross = draft.grossPayPerPaycheck * draft.paychecksPerYear
  const annualBenefits = (draft.fsaMedicalPerPaycheck + draft.criticalIllnessPerPaycheck + draft.healthPremiumPerPaycheck + draft.otherPreTaxBenefitsPerPaycheck) * draft.paychecksPerYear
  const save = () => {
    const incomeSources = scenario.incomeSources.map((source) => source.id === 'primary-income' ? { ...source, annualSalary: annualGross, annualGross: annualGross, annualNet: estimate.primaryAnnualNet, netRetention: annualGross ? estimate.primaryAnnualNet / annualGross : 0 } : source)
    const taxProfile = { ...scenario.taxProfile, retirement401kRate: draft.grossPayPerPaycheck ? draft.retirement401kPerPaycheck / draft.grossPayPerPaycheck : 0, annualPreTaxBenefits: annualBenefits, annualFicaExemptBenefits: annualBenefits, annualPostTaxDeductions: draft.postTaxDeductionsPerPaycheck * draft.paychecksPerYear }
    onUpdate({ ...scenario, paycheckModel: draft, paychecksPerYear: draft.paychecksPerYear, salary: annualGross, annualNet: estimate.primaryAnnualNet, incomeSources, taxProfile })
  }
  const displayMoney = (value: number) => Number(value.toFixed(2))
  const moneyField = (label: string, key: keyof PaycheckModel, help: string) => <label>{label}<input type="number" min="0" step="0.01" value={displayMoney(draft[key] as number)} onChange={(event) => update(key, Number(event.target.value))} /><small className="muted">{help}</small></label>
  return <div className="page-grid paycheck-model-page">
    <div className="page-intro"><div><p className="eyebrow">Paycheck model</p><h2>Enter the paycheck you actually receive</h2><p className="muted">Enter dollar amounts from your offer, benefits election, or pay stub. The app calculates taxes; it does not guess your deductions.</p></div><span className="chip">{draft.paychecksPerYear} checks / year</span></div>
    <section className="panel paycheck-inputs"><div className="panel-head"><div><p className="eyebrow">Your inputs</p><h2>Per-paycheck amounts</h2><p className="panel-lede">These are editable dollar inputs. Use the actual values, including cents.</p></div><button className="button primary" onClick={save}>Save paycheck model</button></div><div className="form-grid"><label>Gross pay per paycheck<input type="number" min="0" step="0.01" value={displayMoney(draft.grossPayPerPaycheck)} onChange={(event) => update('grossPayPerPaycheck', Number(event.target.value))} /><small className="muted">Your gross check before deductions</small></label><label>Paychecks per year<input type="number" min="1" max="365" step="1" value={draft.paychecksPerYear} onChange={(event) => update('paychecksPerYear', Number(event.target.value))} /><small className="muted">26 for biweekly payroll</small></label>{moneyField('401(k) per paycheck', 'retirement401kPerPaycheck', 'Pre-tax for income tax; still subject to FICA')}{moneyField('FSA medical per paycheck', 'fsaMedicalPerPaycheck', 'Pre-tax benefit')}{moneyField('Critical illness per paycheck', 'criticalIllnessPerPaycheck', 'Enter the actual premium')}{moneyField('Health premium per paycheck', 'healthPremiumPerPaycheck', 'Enter the actual premium')}{moneyField('Other pre-tax benefits per paycheck', 'otherPreTaxBenefitsPerPaycheck', 'Optional additional pre-tax deductions')}{moneyField('Post-tax deductions per paycheck', 'postTaxDeductionsPerPaycheck', 'After-tax deductions')}</div></section>
    <section className="metrics paycheck-kpis"><MetricCard label="Annual gross" value={formatCurrency(annualGross, true)} note="gross pay × checks" tone="ink" /><MetricCard label="Your net paycheck" value={formatCurrency(estimate.primaryPaycheckNet)} note="after deductions and estimated taxes" tone="mint" /><MetricCard label="Your monthly net" value={formatCurrency(estimate.primaryAnnualNet / 12)} note="personal budget income" tone="paper" /></section>
    <section className="panel paycheck-tax-panel"><div className="panel-head"><div><p className="eyebrow">Auto-calculated only</p><h2>Estimated taxes</h2><p className="panel-lede">These are the only paycheck deductions the app estimates from tax rules. Payroll withholding can differ.</p></div><span className="chip">{Math.round(estimate.effectiveTaxRate * 1000) / 10}% of modeled gross</span></div><div className="tax-summary-grid"><div><span>Federal income tax</span><b>{formatCurrency(estimate.federalIncomeTax, true)} / yr</b></div><div><span>Wisconsin income tax</span><b>{formatCurrency(estimate.wisconsinIncomeTax, true)} / yr</b></div><div><span>Social Security</span><b>{formatCurrency(estimate.socialSecurity, true)} / yr</b></div><div><span>Medicare</span><b>{formatCurrency(estimate.medicare + estimate.additionalMedicare, true)} / yr</b></div><div className="tax-net"><span>Total taxes</span><b>{formatCurrency(estimate.totalTaxes, true)} / yr</b></div><div className="tax-net"><span>Tax per paycheck</span><b>{formatCurrency(estimate.totalTaxes / draft.paychecksPerYear)}</b></div></div></section>
    <section className="panel two-col paycheck-reconciliation"><div><p className="eyebrow">Workbook reconciliation</p><h3>Gross − 401(k) − benefits − taxes − post-tax deductions = net</h3><p className="muted">This follows the structure of the Northern Trust paycheck model. It keeps your personal paycheck separate from any spouse income and uses MFJ only where you enter it in the tax profile.</p></div><div className="big-number"><b>{formatCurrency(estimate.primaryAnnualNet, true)}</b><span>your modeled annual net</span></div></section>
  </div>
}

export const SavingsPage = ({ scenario, onUpdate }: { scenario: BudgetScenario; onUpdate: (scenario: BudgetScenario) => void }) => {
  const savings = scenario.items.filter((item) => item.kind === 'savings')
  const total = savings.filter((item) => item.active).reduce((sum, item) => sum + frequencyToMonthly(item.amountMonthly, item.frequency), 0)
  const [selected, setSelected] = useState<BudgetItem | null>(null)
  const categories = Array.from(new Set(scenario.items.map((item) => item.category)))
  const saveItem = (item: BudgetItem) => { onUpdate({ ...scenario, items: scenario.items.some((candidate) => candidate.id === item.id) ? scenario.items.map((candidate) => candidate.id === item.id ? item : candidate) : [...scenario.items, item] }); setSelected(null) }
  const deleteItem = (item: BudgetItem) => { onUpdate({ ...scenario, items: scenario.items.filter((candidate) => candidate.id !== item.id) }); setSelected(null) }
  return <div className="page-grid"><div className="page-intro"><div><p className="eyebrow">Set-asides and targets</p><h2>Savings allocations</h2><p className="muted">Savings is tracked separately from required bills so you can see what is committed versus what is truly available.</p></div><div className="chip">{formatCurrency(total, true)} / month</div></div><section className="metrics"><MetricCard label="Monthly savings" value={formatCurrency(total, true)} note={`${formatCurrency(total * 12, true)} per year`} tone="mint" /><MetricCard label="Per paycheck" value={formatCurrency(total * 12 / scenario.paychecksPerYear)} note="transfer target" tone="paper" /><MetricCard label="Active targets" value={String(savings.filter((item) => item.active).length)} note={`${savings.length} total savings lines`} tone="ink" /></section><section className="panel full-width"><div className="panel-head"><div><p className="eyebrow">Savings lines</p><h2>Targets and sinking funds</h2></div><button className="button primary" onClick={() => setSelected(newLine('savings'))}>+ Add savings target</button></div><LineItemTable items={savings} onSelect={setSelected} />{selected && <BudgetLineEditor item={selected} categories={categories} onClose={() => setSelected(null)} onSave={saveItem} onDelete={deleteItem} />}</section></div>
}

export const DebtsPage = ({ scenario, onUpdate }: { scenario: BudgetScenario; onUpdate: (scenario: BudgetScenario) => void }) => {
  const [selected, setSelected] = useState<DebtRecord | null>(null)
  const debtPayments = totalsFor(scenario).debt
  const saveDebt = (debt: DebtRecord) => { onUpdate({ ...scenario, debts: scenario.debts.some((candidate) => candidate.id === debt.id) ? scenario.debts.map((candidate) => candidate.id === debt.id ? debt : candidate) : [...scenario.debts, debt] }); setSelected(null) }
  return <div className="page-grid"><div className="page-intro"><div><p className="eyebrow">Balances and payments</p><h2>Debt center</h2><p className="muted">Budgeted payments still live in All line items. Record each actual payment here, then add interest or another adjustment to keep the approximate balance close to the lender statement.</p></div><button className="button primary" onClick={() => setSelected({ id: `debt-${Date.now()}`, debtor: 'New creditor', description: 'New debt', minimumMonthly: 0, balance: 0 })}>+ Add debt</button></div><section className="metrics"><MetricCard label="Tracked balance" value={formatCurrency(scenario.debts.reduce((sum, debt) => sum + debt.balance, 0), true)} note={`${scenario.debts.length} debt records`} tone="ink" /><MetricCard label="Budgeted debt payments" value={formatCurrency(debtPayments, true)} note="monthly line items" tone="coral" /><MetricCard label="Per paycheck set-aside" value={formatCurrency(debtPayments * 12 / scenario.paychecksPerYear)} note="for debt payments" tone="paper" /></section><section className="panel full-width"><div className="panel-head"><div><p className="eyebrow">Debt register</p><h2>Accounts and balances</h2></div></div><div className="debt-list">{scenario.debts.map((debt) => <button className="debt-row" key={debt.id} onClick={() => setSelected({ ...debt })}><span><b>{debt.description}</b><small>{debt.debtor}{debt.dueDay ? ` · due day ${debt.dueDay}` : ''}{debt.payments?.length ? ` · last payment ${formatCurrency(debt.payments[debt.payments.length - 1].amount)}` : ''}</small></span><span><small>Minimum</small><strong>{formatCurrency(debt.minimumMonthly)}</strong></span><span><small>Balance</small><strong>{formatCurrency(debt.balance)}</strong></span></button>)}</div></section>{selected && <DebtEditor debt={selected} onClose={() => setSelected(null)} onSave={saveDebt} />}</div>
}

const DebtEditor = ({ debt, onClose, onSave }: { debt: DebtRecord; onClose: () => void; onSave: (debt: DebtRecord) => void }) => {
  const [draft, setDraft] = useState(debt)
  const [payment, setPayment] = useState('')
  const [interestAdjustment, setInterestAdjustment] = useState('')
  const paymentAmount = Number(payment) || 0
  const interestAmount = Number(interestAdjustment) || 0
  const projectedBalance = Math.max(0, draft.balance - paymentAmount + interestAmount)
  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = paymentAmount > 0 || interestAmount !== 0 ? { ...draft, balance: projectedBalance, payments: [...(draft.payments ?? []), { id: `payment-${Date.now()}`, date: new Date().toISOString(), amount: paymentAmount, interestAdjustment: interestAmount || undefined }] } : draft
    onSave(next)
  }
  return <Sheet title="Edit debt record" onClose={onClose}><form className="edit-form" onSubmit={save}><label>Creditor<input value={draft.debtor} onChange={(event) => setDraft({ ...draft, debtor: event.target.value })} required /></label><label>Description<input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} required /></label><div className="form-grid"><label>Minimum monthly<input type="number" min="0" step="0.01" value={draft.minimumMonthly} onChange={(event) => setDraft({ ...draft, minimumMonthly: Number(event.target.value) })} /></label><label>Current balance<input type="number" min="0" step="0.01" value={draft.balance} onChange={(event) => setDraft({ ...draft, balance: Number(event.target.value) })} /></label></div><label>Due day<input type="number" min="1" max="31" value={draft.dueDay ?? ''} onChange={(event) => setDraft({ ...draft, dueDay: event.target.value ? Number(event.target.value) : undefined })} /></label><section className="debt-payment-entry"><p className="eyebrow">Record this month</p><p className="field-help">Enter the actual payment. Add interest or another balance adjustment when the lender's statement does not match a simple subtraction.</p><div className="form-grid"><label>Payment made<input type="number" min="0" step="0.01" value={payment} onChange={(event) => setPayment(event.target.value)} placeholder="0.00" /></label><label>Interest / adjustment<input type="number" step="0.01" value={interestAdjustment} onChange={(event) => setInterestAdjustment(event.target.value)} placeholder="0.00" /></label></div><div className="debt-balance-preview"><span>Approximate balance after entry</span><strong>{formatCurrency(projectedBalance, true)}</strong></div></section><button className="button primary wide">Save debt</button></form></Sheet>
}
