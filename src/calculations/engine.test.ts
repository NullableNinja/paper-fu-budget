import { describe, expect, it } from 'vitest'
import { calculateScenario, frequencyToMonthly, nextPaycheck } from './engine'
import { annualGrossForSource, calculateSourceNetContribution, calculateW2Taxes } from './taxes'
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

  it('matches the Northern Trust 125K workbook reconciliation', () => {
    const scenario = initialSnapshot.scenarios[0]
    const totals = calculateScenario(scenario)
    const taxes = calculateW2Taxes(scenario)
    expect(taxes.primaryGrossWages).toBeCloseTo(125000, 6)
    expect(taxes.retirement401k).toBeCloseTo(11250, 6)
    expect(taxes.postTaxDeductions).toBeCloseTo(610.22, 6)
    expect(totals.monthlyIncome).toBeCloseTo(6433.3767955, 6)
    expect(totals.totalOutflow).toBeCloseTo(6415.4725, 6)
    expect(totals.monthlySurplus).toBeCloseTo(17.9042955, 4)
    expect(totals.paycheckAllocation).toBeCloseTo(2960.9873077, 6)
    expect(totals.paycheckSurplus).toBeCloseTo(8.263521, 4)
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
    scenario.paycheckModel = undefined
    scenario.salary = 250000
    scenario.incomeSources[0].annualSalary = 250000
    scenario.incomeSources[0].annualGross = 250000
    const taxes = calculateW2Taxes(scenario)
    expect(taxes.socialSecurity).toBeCloseTo(184500 * 0.062)
    expect(taxes.additionalMedicare).toBeGreaterThan(0)
  })

  it('annualizes hourly income and overtime', () => {
    const source = { id: 'hourly', name: 'Second job', payType: 'hourly' as const, payFrequency: 'weekly' as const, hourlyRate: 20, regularHoursPerWeek: 10, paidWeeksPerYear: 52, annualGross: 0, annualNet: 0, netRetention: 0, active: true, overtime: { enabled: true, hoursPerPayPeriod: 1, multiplier: 1.5 } }
    expect(annualGrossForSource(source)).toBeCloseTo(11960)
  })

  it('adds per-pay-period overtime to a salaried source', () => {
    const source = { id: 'salary', name: 'Salary job', payType: 'salary' as const, payFrequency: 'biweekly' as const, annualSalary: 80000, annualGross: 80000, annualNet: 0, netRetention: 0, active: true, overtime: { enabled: true, hoursPerPayPeriod: 10, multiplier: 2 } }
    expect(annualGrossForSource(source)).toBeCloseTo(95000, 3)
  })

  it('calculates a source-level marginal net contribution', () => {
    const scenario = structuredClone(initialSnapshot.scenarios[0])
    const source = { id: 'income-source', name: 'Another job', payType: 'salary' as const, annualSalary: 50000, annualGross: 50000, annualNet: 0, netRetention: 0, active: true, overtime: { enabled: false, hoursPerPayPeriod: 0, multiplier: 1.5 } }
    const withSource = { ...scenario, incomeSources: [...scenario.incomeSources, source] }
    expect(calculateSourceNetContribution(withSource, source.id)).toBeGreaterThan(0)
  })

  it('models every active income source as one person\'s wages', () => {
    const scenario = structuredClone(initialSnapshot.scenarios[0])
    scenario.incomeSources.push({ id: 'income-source', name: 'Another job', payType: 'salary', annualSalary: 57235.1, annualGross: 57235.1, annualNet: 0, netRetention: 0, active: true, overtime: { enabled: false, hoursPerPayPeriod: 0, multiplier: 1.5 } })
    const estimate = calculateW2Taxes(scenario)
    expect(estimate.grossWages).toBeCloseTo(182235.1)
    expect(estimate.annualNet).toBeGreaterThan(100000)
  })

  it('keeps spouse wages tax-only and out of the personal budget', () => {
    const scenario = structuredClone(initialSnapshot.scenarios[0])
    scenario.taxProfile = { ...scenario.taxProfile, filingStatus: 'mfj', spouseWages: 57235.1, qualifyingChildren: 1 }
    const estimate = calculateW2Taxes(scenario)
    const totals = calculateScenario(scenario)
    expect(estimate.grossWages).toBeCloseTo(182235.1)
    expect(estimate.primaryGrossWages).toBeCloseTo(125000)
    expect(estimate.spouseGrossWages).toBeCloseTo(57235.1)
    expect(totals.monthlyIncome).toBeCloseTo(estimate.primaryAnnualNet / 12)
    expect(totals.monthlyIncome).toBeLessThan(estimate.annualNet / 12)
  })
})
