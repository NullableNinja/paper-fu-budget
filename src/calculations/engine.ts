import type { BudgetScenario, Frequency, ScenarioTotals } from '../models'
import { calculateW2Taxes } from './taxes'

export type BudgetPeriod = 'weekly' | 'biweekly' | 'monthly' | 'annual'
export const budgetPeriods: Array<{ value: BudgetPeriod; label: string; shortLabel: string }> = [
  { value: 'weekly', label: 'Weekly', shortLabel: 'Wk' },
  { value: 'biweekly', label: 'Bi-weekly', shortLabel: 'Bi-wk' },
  { value: 'monthly', label: 'Monthly', shortLabel: 'Mo' },
  { value: 'annual', label: 'Annual', shortLabel: 'Yr' },
]

export const frequencyToMonthly = (amount: number, frequency: Frequency): number => {
  switch (frequency) {
    case 'weekly': return amount * 52 / 12
    case 'biweekly': return amount * 26 / 12
    case 'semimonthly': return amount * 24 / 12
    case 'quarterly': return amount / 3
    case 'annual': return amount / 12
    default: return amount
  }
}

export const monthlyToPeriod = (monthly: number, period: BudgetPeriod, paychecksPerYear = 26): number => {
  if (period === 'weekly') return monthly * 12 / 52
  if (period === 'biweekly') return monthly * 12 / paychecksPerYear
  if (period === 'annual') return monthly * 12
  return monthly
}

export const annualToPeriod = (annual: number, period: BudgetPeriod, paychecksPerYear = 26): number => {
  if (period === 'weekly') return annual / 52
  if (period === 'biweekly') return annual / paychecksPerYear
  if (period === 'monthly') return annual / 12
  return annual
}

export const periodLabel = (period: BudgetPeriod) => budgetPeriods.find((candidate) => candidate.value === period)?.label ?? 'Monthly'

export const calculateScenario = (scenario: BudgetScenario): ScenarioTotals => {
  const active = scenario.items.filter((candidate) => candidate.active)
  const taxEstimate = calculateW2Taxes(scenario)
  const annualIncome = taxEstimate.annualNet
  const monthlyIncome = annualIncome / 12
  const monthlyByKind = (kind: string) => active.filter((candidate) => candidate.kind === kind).reduce((sum, candidate) => sum + frequencyToMonthly(candidate.amountMonthly, candidate.frequency), 0)
  const savings = monthlyByKind('savings')
  const fixed = monthlyByKind('fixed')
  const variable = monthlyByKind('variable')
  const debt = monthlyByKind('debt')
  const discretionary = monthlyByKind('discretionary')
  const required = fixed + variable + debt
  const totalOutflow = required + savings + discretionary
  const monthlySurplus = monthlyIncome - totalOutflow
  const paycheckIncome = annualIncome / scenario.paychecksPerYear
  const paycheckBills = required * 12 / scenario.paychecksPerYear
  const paycheckSavings = savings * 12 / scenario.paychecksPerYear
  const paycheckDiscretionary = discretionary * 12 / scenario.paychecksPerYear
  const paycheckAllocation = paycheckBills + paycheckSavings + paycheckDiscretionary
  return { monthlyIncome, annualIncome, paycheckIncome, savings, fixed, variable, debt, discretionary, required, totalOutflow, monthlySurplus, paycheckAllocation, paycheckSurplus: paycheckIncome - paycheckAllocation, paycheckBills, paycheckSavings, paycheckDiscretionary, debtBalance: scenario.debts.reduce((sum, debtRecord) => sum + debtRecord.balance, 0) }
}

export const nextPaycheck = (scenario: BudgetScenario) => {
  const totals = calculateScenario(scenario)
  return { income: totals.paycheckIncome, bills: totals.paycheckBills, savings: totals.paycheckSavings, discretionary: totals.paycheckDiscretionary, allocation: totals.paycheckAllocation, remaining: totals.paycheckSurplus }
}

export const formatCurrency = (value: number, compact = false) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: compact ? 0 : 2 }).format(value)
export const formatSignedCurrency = (value: number) => `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value), true)}`
