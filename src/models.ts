export type ItemKind = 'fixed' | 'variable' | 'debt' | 'savings' | 'discretionary'
export type Frequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'quarterly' | 'annual'
export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh'

export interface ThemeSettings {
  mode: 'light' | 'dark'
  navColor: string
  backgroundColor: string
  accentColor: string
  backgroundStyle: 'none' | 'paper' | 'mesh' | 'aurora' | 'grid'
  reduceMotion: boolean
}

export interface W2TaxProfile {
  taxYear: 2026
  filingStatus: FilingStatus
  state: 'WI' | 'none'
  spouseWages: number
  qualifyingChildren: number
  otherDependents: number
  taxpayer65OrOlder: boolean
  spouse65OrOlder: boolean
  retirement401kRate: number
  annualPreTaxBenefits: number
  annualFicaExemptBenefits: number
  annualPostTaxDeductions: number
  otherAnnualIncome: number
  additionalFederalCredits: number
  additionalStateCredits: number
  extraFederalWithholding: number
  extraStateWithholding: number
}

export interface BudgetItem {
  id: string
  name: string
  category: string
  kind: ItemKind
  amountMonthly: number
  frequency: Frequency
  dueDay?: number
  accountNickname?: string
  url?: string
  autoPay?: boolean
  notes?: string
  shared?: boolean
  sharedSharePercent?: number
  tags?: string[]
  active: boolean
  paid?: boolean
  paidAt?: string
}

export interface IncomeSource {
  id: string
  name: string
  annualGross: number
  annualNet: number
  netRetention: number
  active: boolean
}

export interface DebtPayment {
  id: string
  date: string
  amount: number
  interestAdjustment?: number
}

export interface DebtRecord {
  id: string
  debtor: string
  description: string
  minimumMonthly: number
  dueDay?: number
  balance: number
  payments?: DebtPayment[]
}

export interface BudgetScenario {
  id: string
  name: string
  description: string
  salary: number
  annualNet: number
  paychecksPerYear: number
  incomeSources: IncomeSource[]
  items: BudgetItem[]
  debts: DebtRecord[]
  taxProfile: W2TaxProfile
  createdAt: string
  archived?: boolean
}

export interface AppSettings {
  defaultScenarioId: string
  currency: string
  weekStartsOn: 'sunday' | 'monday'
  theme?: ThemeSettings
}

export interface AppSnapshot {
  schemaVersion: 1
  settings: AppSettings
  scenarios: BudgetScenario[]
  updatedAt: string
}

export interface ScenarioTotals {
  monthlyIncome: number
  annualIncome: number
  paycheckIncome: number
  savings: number
  fixed: number
  variable: number
  debt: number
  discretionary: number
  required: number
  totalOutflow: number
  monthlySurplus: number
  paycheckAllocation: number
  paycheckSurplus: number
  paycheckBills: number
  paycheckSavings: number
  paycheckDiscretionary: number
  debtBalance: number
}
