import type { BudgetScenario } from '../models'
import { annualToPeriod, calculateScenario, formatCurrency, formatSignedCurrency, monthlyToPeriod, type BudgetPeriod, budgetPeriods, periodLabel } from '../calculations/engine'

export const PeriodSummaryStrip = ({ scenario, sticky = true }: { scenario: BudgetScenario; sticky?: boolean }) => {
  const totals = calculateScenario(scenario)
  return <section className={`period-summary ${sticky ? 'period-summary-sticky' : ''}`} aria-label="Budget over or under by period">
    {budgetPeriods.map((period) => {
      const income = annualToPeriod(totals.annualIncome, period.value, scenario.paychecksPerYear)
      const outflow = monthlyToPeriod(totals.totalOutflow, period.value, scenario.paychecksPerYear)
      const remaining = income - outflow
      return <article className={`period-summary-card ${remaining >= 0 ? 'positive-state' : 'negative-state'}`} key={period.value}>
        <div className="period-summary-card-head"><span>{period.label}</span><i>{remaining >= 0 ? 'Available' : 'Shortfall'}</i></div>
        <strong className={remaining >= 0 ? 'positive' : 'negative'}>{formatSignedCurrency(remaining)}</strong>
        <small>{formatCurrency(income, true)} income · {formatCurrency(outflow, true)} planned</small>
        <em>{period.value === 'biweekly' ? `${scenario.paychecksPerYear} checks / year` : periodLabel(period.value)}</em>
      </article>
    })}
  </section>
}
