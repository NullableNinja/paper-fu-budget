import type { BudgetScenario, FilingStatus, IncomeSource, W2TaxProfile } from '../models'

export interface TaxEstimate {
  grossWages: number
  primaryGrossWages: number
  spouseGrossWages: number
  grossIncome: number
  retirement401k: number
  federalAdjustedGrossIncome: number
  federalStandardDeduction: number
  federalTaxableIncome: number
  federalIncomeTax: number
  childTaxCredit: number
  wisconsinStandardDeduction: number
  wisconsinExemptions: number
  wisconsinTaxableIncome: number
  wisconsinIncomeTax: number
  socialSecurity: number
  medicare: number
  additionalMedicare: number
  totalTaxes: number
  postTaxDeductions: number
  annualNet: number
  paycheckNet: number
  primaryAnnualNet: number
  primaryPaycheckNet: number
  effectiveTaxRate: number
  assumptions: string[]
}

type Bracket = [number, number, number, number]

const federalBrackets: Record<FilingStatus, Bracket[]> = {
  mfj: [[0, 24800, 0.10, 0], [24800, 100800, 0.12, 2480], [100800, 211400, 0.22, 11600], [211400, 403550, 0.24, 35932], [403550, 512450, 0.32, 82048], [512450, 768700, 0.35, 116896]],
  hoh: [[0, 17700, 0.10, 0], [17700, 67450, 0.12, 1770], [67450, 105700, 0.22, 7740], [105700, 201750, 0.24, 16155], [201750, 256200, 0.32, 39207], [256200, 640600, 0.35, 56631]],
  single: [[0, 12400, 0.10, 0], [12400, 50400, 0.12, 1240], [50400, 105700, 0.22, 5800], [105700, 201775, 0.24, 17966], [201775, 256225, 0.32, 41024], [256225, 640600, 0.35, 58448]],
  mfs: [[0, 12400, 0.10, 0], [12400, 50400, 0.12, 1240], [50400, 105700, 0.22, 5800], [105700, 201775, 0.24, 17966], [201775, 256225, 0.32, 41024], [256225, 384350, 0.35, 58448]],
}

const federalTopRate = (status: FilingStatus) => status === 'mfj' ? [768700, 206583.5] : status === 'hoh' ? [640600, 191171] : status === 'mfs' ? [384350, 103291.75] : [640600, 192979.25]

const federalStandardDeduction: Record<FilingStatus, number> = { single: 16100, mfs: 16100, hoh: 24150, mfj: 32200 }

const bracketTax = (income: number, brackets: Bracket[], top: [number, number]) => {
  if (income <= 0) return 0
  for (const [lower, upper, rate, base] of brackets) if (income <= upper) return base + (income - lower) * rate
  return top[1] + (income - top[0]) * 0.37
}

const wisconsinStandardDeduction = (income: number, status: FilingStatus) => {
  if (status === 'mfj') return income <= 29039 ? 25840 : income <= 159690 ? Math.max(0, 25840 - 0.19778 * (income - 29040)) : 0
  if (status === 'mfs') return income <= 13779 ? 12280 : income <= 75869 ? Math.max(0, 12280 - 0.19778 * (income - 13780)) : 0
  if (status === 'hoh') {
    if (income <= 20119) return 18030
    if (income <= 58827) return Math.max(0, 18030 - 0.22515 * (income - 20120))
    if (income <= 136453) return Math.max(0, 13960 - 0.12 * (income - 20120))
    return 0
  }
  return income <= 20119 ? 13960 : income <= 136453 ? Math.max(0, 13960 - 0.12 * (income - 20120)) : 0
}

const wisconsinTax = (income: number, status: FilingStatus) => {
  if (status === 'mfj') return income <= 20150 ? income * 0.035 : income <= 69260 ? 705.25 + (income - 20150) * 0.044 : income <= 443630 ? 2866.09 + (income - 69260) * 0.053 : 22707.70 + (income - 443630) * 0.0765
  if (status === 'mfs') return income <= 10080 ? income * 0.035 : income <= 34630 ? 352.80 + (income - 10080) * 0.044 : income <= 221820 ? 1433 + (income - 34630) * 0.053 : 11354.07 + (income - 221820) * 0.0765
  return income <= 15110 ? income * 0.035 : income <= 51950 ? 528.85 + (income - 15110) * 0.044 : income <= 332720 ? 2149.81 + (income - 51950) * 0.053 : 17030.62 + (income - 332720) * 0.0765
}

const childCredit = (agi: number, profile: W2TaxProfile) => {
  const raw = profile.qualifyingChildren * 2200
  const threshold = profile.filingStatus === 'mfj' ? 400000 : 200000
  return Math.max(0, raw - Math.max(0, Math.ceil((agi - threshold) / 1000) * 50))
}

export const defaultTaxProfile = (salary: number): W2TaxProfile => ({
  taxYear: 2026, filingStatus: 'single', state: 'WI', spouseWages: 0, qualifyingChildren: 0, otherDependents: 0, taxpayer65OrOlder: false, spouse65OrOlder: false, retirement401kRate: 0.09, annualPreTaxBenefits: 7666.10, annualFicaExemptBenefits: 7666.10, annualPostTaxDeductions: 610.22, otherAnnualIncome: 0, additionalFederalCredits: 0, additionalStateCredits: 0, extraFederalWithholding: 0, extraStateWithholding: 0,
})

const payPeriodsPerYear = (source: IncomeSource) => {
  switch (source.payFrequency) {
    case 'weekly': return 52
    case 'biweekly': return 26
    case 'semimonthly': return 24
    case 'monthly': return 12
    case 'annual': return 1
    default: return source.payPeriodsPerYear ?? 26
  }
}

export const annualGrossForSource = (source: IncomeSource): number => {
  const overtime = source.overtime
  const periods = payPeriodsPerYear(source)
  const overtimeHours = overtime?.enabled ? Math.max(0, overtime.hoursPerPayPeriod ?? (overtime.hoursPerYear ?? 0) / periods) : 0
  const multiplier = overtime?.enabled ? 1.5 : 0
  if (source.payType === 'hourly') {
    const rate = Math.max(0, source.hourlyRate ?? 0)
    const regularHours = Math.max(0, source.regularHoursPerWeek ?? 0)
    const paidWeeks = Math.max(0, source.paidWeeksPerYear ?? 52)
    const base = rate * regularHours * paidWeeks
    const overtimeRate = overtime?.explicitHourlyRate ?? rate
    return base + overtimeRate * overtimeHours * periods * multiplier
  }
  const salary = Math.max(0, source.annualSalary ?? source.annualGross)
  const standardHours = Math.max(1, overtime?.standardHoursPerYear ?? 2080)
  const overtimeRate = overtime?.explicitHourlyRate ?? salary / standardHours
  return salary + overtimeRate * overtimeHours * periods * multiplier
}

export const sourceGrossBreakdown = (source: IncomeSource) => {
  const annualGross = annualGrossForSource(source)
  if (source.payType === 'hourly') {
    const base = Math.max(0, source.hourlyRate ?? 0) * Math.max(0, source.regularHoursPerWeek ?? 0) * Math.max(0, source.paidWeeksPerYear ?? 52)
    return { baseGross: base, overtimeGross: Math.max(0, annualGross - base), annualGross }
  }
  const base = Math.max(0, source.annualSalary ?? source.annualGross)
  return { baseGross: base, overtimeGross: Math.max(0, annualGross - base), annualGross }
}

export const calculateW2Taxes = (scenario: BudgetScenario): TaxEstimate => {
  const profile = scenario.taxProfile ?? defaultTaxProfile(scenario.salary)
  const paycheckModel = scenario.paycheckModel
  const paychecksPerYear = paycheckModel?.paychecksPerYear ?? scenario.paychecksPerYear
  const activeSources = scenario.incomeSources.filter((source) => source.active)
  const otherSourceWages = activeSources.filter((source) => source.id !== 'primary-income').reduce((sum, source) => sum + annualGrossForSource(source), 0)
  const primarySourceWages = paycheckModel ? paycheckModel.grossPayPerPaycheck * paychecksPerYear + otherSourceWages : activeSources.reduce((sum, source) => sum + annualGrossForSource(source), 0)
  const primaryGrossWages = paycheckModel || activeSources.length > 0 ? primarySourceWages : scenario.incomeSources.length > 0 ? 0 : scenario.salary
  const spouseGrossWages = Math.max(0, profile.spouseWages)
  const grossWages = primaryGrossWages + spouseGrossWages
  const grossIncome = grossWages + profile.otherAnnualIncome
  const annualRetirement401k = paycheckModel ? paycheckModel.retirement401kPerPaycheck * paychecksPerYear : primaryGrossWages * profile.retirement401kRate
  const annualPreTaxBenefits = paycheckModel ? (paycheckModel.fsaMedicalPerPaycheck + paycheckModel.criticalIllnessPerPaycheck + paycheckModel.healthPremiumPerPaycheck + paycheckModel.otherPreTaxBenefitsPerPaycheck) * paychecksPerYear : profile.annualPreTaxBenefits
  const annualFicaExemptBenefits = paycheckModel ? (paycheckModel.fsaMedicalPerPaycheck + paycheckModel.criticalIllnessPerPaycheck + paycheckModel.healthPremiumPerPaycheck + paycheckModel.otherPreTaxBenefitsPerPaycheck) * paychecksPerYear : profile.annualFicaExemptBenefits
  const annualPostTaxDeductions = paycheckModel ? paycheckModel.postTaxDeductionsPerPaycheck * paychecksPerYear : profile.annualPostTaxDeductions
  const federalAdjustedGrossIncome = Math.max(0, grossIncome - annualRetirement401k - annualPreTaxBenefits)
  const federalStandard = federalStandardDeduction[profile.filingStatus]
  const federalTaxableIncome = Math.max(0, federalAdjustedGrossIncome - federalStandard)
  const federalGrossTax = bracketTax(federalTaxableIncome, federalBrackets[profile.filingStatus], federalTopRate(profile.filingStatus) as [number, number])
  const childrenCredit = childCredit(federalAdjustedGrossIncome, profile)
  const federalIncomeTax = Math.max(0, federalGrossTax - childrenCredit - profile.additionalFederalCredits)
  const wiExemptions = 700 * (1 + (profile.filingStatus === 'mfj' ? 1 : 0) + profile.qualifyingChildren + profile.otherDependents) + (profile.taxpayer65OrOlder ? 250 : 0) + (profile.spouse65OrOlder && profile.filingStatus === 'mfj' ? 250 : 0)
  const wiStandard = profile.state === 'WI' ? wisconsinStandardDeduction(federalAdjustedGrossIncome, profile.filingStatus) : 0
  const wiTaxableIncome = Math.max(0, federalAdjustedGrossIncome - wiStandard - wiExemptions)
  const wisconsinIncomeTax = profile.state === 'WI' ? Math.max(0, wisconsinTax(wiTaxableIncome, profile.filingStatus) - profile.additionalStateCredits) : 0
  const ficaWages = Math.max(0, grossWages - annualFicaExemptBenefits)
  const socialSecurity = Math.min(ficaWages, 184500) * 0.062
  const medicare = ficaWages * 0.0145
  const medicareThreshold = profile.filingStatus === 'mfj' ? 250000 : 200000
  const additionalMedicare = Math.max(0, ficaWages - medicareThreshold) * 0.009
  const totalTaxes = federalIncomeTax + wisconsinIncomeTax + socialSecurity + medicare + additionalMedicare
  const annualNet = grossWages - annualRetirement401k - annualPreTaxBenefits - totalTaxes - annualPostTaxDeductions
  let primaryAnnualNet = annualNet
  if (primaryGrossWages > 0 && spouseGrossWages > 0) {
    const spouseOnlyScenario: BudgetScenario = { ...scenario, salary: 0, paycheckModel: undefined, incomeSources: [], taxProfile: { ...profile, retirement401kRate: 0, annualPreTaxBenefits: 0, annualFicaExemptBenefits: 0, annualPostTaxDeductions: 0 } }
    const spouseOnlyTaxes = calculateW2Taxes(spouseOnlyScenario).totalTaxes
    const primaryTaxShare = Math.max(0, totalTaxes - spouseOnlyTaxes)
    primaryAnnualNet = primaryGrossWages - annualRetirement401k - annualPreTaxBenefits - primaryTaxShare - annualPostTaxDeductions
  }
  return { grossWages, primaryGrossWages, spouseGrossWages, grossIncome, retirement401k: annualRetirement401k, federalAdjustedGrossIncome, federalStandardDeduction: federalStandard, federalTaxableIncome, federalIncomeTax, childTaxCredit: childrenCredit, wisconsinStandardDeduction: wiStandard, wisconsinExemptions: wiExemptions, wisconsinTaxableIncome: wiTaxableIncome, wisconsinIncomeTax, socialSecurity, medicare, additionalMedicare, totalTaxes, postTaxDeductions: annualPostTaxDeductions, annualNet, paycheckNet: annualNet / paychecksPerYear, primaryAnnualNet, primaryPaycheckNet: primaryAnnualNet / paychecksPerYear, effectiveTaxRate: grossWages ? totalTaxes / grossWages : 0, assumptions: ['2026 federal brackets and standard deductions', 'Wisconsin 2026 resident rates and standard deduction', 'Social Security wage base of $184,500', 'Paycheck inputs are entered as actual per-check dollar amounts; only taxes are estimated', 'Income sources are this person\'s jobs; spouse wages are tax-profile-only when filing jointly', 'Employer withholding and credits may differ from final return liability'] }
}

export const calculateSourceNetContribution = (scenario: BudgetScenario, sourceId: string): number => {
  const source = scenario.incomeSources.find((candidate) => candidate.id === sourceId)
  if (!source || !source.active) return 0
  const currentNet = calculateW2Taxes(scenario).annualNet
  const withoutSource = { ...scenario, incomeSources: scenario.incomeSources.map((candidate) => candidate.id === sourceId ? { ...candidate, active: false } : candidate) }
  return currentNet - calculateW2Taxes(withoutSource).annualNet
}
