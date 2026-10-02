import { describe, expect, it } from 'vitest'
import { calculateScenario, frequencyToMonthly, nextPaycheck } from './engine'
import { calculateW2Taxes } from './taxes'
import { initialSnapshot } from '../data/seed'

describe('budget calculation engine', () => {
  it('converts frequencies using annual periods', () => {
    expect(frequencyToMonthly(100, 'weekly')).toBeCloseTo(433.3333)
    expect(frequencyToMonthly(100, 'biweekly')).toBeCloseTo(216.6667)
    expect(frequencyToMonthly(100, 'semimonthly')).toBeCloseTo(200)
  })

  it('calculates the primary scenario from annual net and line items', () => {
    const scenario = initialSnapshot.scenarios.find((candidate) => candidate.id === 'salary-125k')!
    const totals = calculateScenario(scenario)
    expect(totals.monthlyIncome).toBeCloseTo(6433.3768)
    expect(totals.paycheckIncome).toBeCloseTo(2969.2508)
    expect(totals.totalOutflow).toBeGreaterThan(0)
    expect(totals.monthlySurplus).toBeCloseTo(totals.monthlyIncome - totals.totalOutflow)
  })

  it('keeps paycheck allocation tied to 26 checks', () => {
    const scenario = initialSnapshot.scenarios[0]
    const pay = nextPaycheck(scenario)
    expect(pay.income).toBeCloseTo(scenario.annualNet / 26)
    expect(pay.remaining).toBeCloseTo(pay.income - pay.bills - pay.savings - pay.discretionary)
  })

  it('responds to scenario line-item edits', () => {
    const scenario = structuredClone(initialSnapshot.scenarios[0])
    const before = calculateScenario(scenario)
    scenario.items = scenario.items.map((item) => item.id === 'groceries' ? { ...item, amountMonthly: item.amountMonthly + 100 } : item)
    const after = calculateScenario(scenario)
    expect(after.monthlySurplus).toBeCloseTo(before.monthlySurplus - 100)
  })

  it('applies filing status and child credit assumptions', () => {
    const base = structuredClone(initialSnapshot.scenarios[0])
    const single = calculateW2Taxes(base)
    const joint = calculateW2Taxes({ ...base, taxProfile: { ...base.taxProfile, filingStatus: 'mfj' } })
    const withChild = calculateW2Taxes({ ...base, taxProfile: { ...base.taxProfile, qualifyingChildren: 1 } })
    expect(joint.federalIncomeTax).toBeLessThan(single.federalIncomeTax)
    expect(withChild.federalIncomeTax).toBeCloseTo(single.federalIncomeTax - 2200)
  })

  it('handles FICA limits and additional Medicare', () => {
    const scenario = structuredClone(initialSnapshot.scenarios[0])
    scenario.salary = 250000
    scenario.incomeSources[0].annualGross = 250000
    const taxes = calculateW2Taxes(scenario)
    expect(taxes.socialSecurity).toBeCloseTo(184500 * 0.062)
    expect(taxes.additionalMedicare).toBeGreaterThan(0)
  })
})
