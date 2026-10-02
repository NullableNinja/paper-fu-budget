import type { AppSnapshot, BudgetItem, BudgetScenario, DebtRecord, IncomeSource, ItemKind, PaycheckModel } from '../models'
import { defaultTaxProfile } from '../calculations/taxes'

const now = '2026-10-02T00:00:00.000Z'

const item = (id: string, name: string, category: string, kind: ItemKind, amountMonthly: number, dueDay?: number): BudgetItem => ({
  id, name, category, kind, amountMonthly, frequency: 'monthly', dueDay, active: amountMonthly > 0,
})

const baseItems: BudgetItem[] = [
  item('vacation', 'Vacation Fund', 'Savings', 'savings', 50), item('concert', 'Concert Fund', 'Savings', 'savings', 50), item('emergency', 'Emergency Fund', 'Savings', 'savings', 100), item('home-repair', 'Home & Auto Repair Fund', 'Savings', 'savings', 50), item('general-savings', 'General Savings', 'Savings', 'savings', 100), item('birthday', 'Birthday & Christmas Fund', 'Savings', 'savings', 50),
  item('mortgage-1', '1st Mortgage | 1230 Redfield St', 'Housing & Utilities', 'fixed', 650, 1), item('mortgage-2', '2nd Mortgage / Home Equity Line of Credit', 'Housing & Utilities', 'fixed', 250, 15), item('xcel', 'Xcel Energy', 'Housing & Utilities', 'variable', 250), item('brightspeed', 'Brightspeed', 'Housing & Utilities', 'fixed', 39.99, 22), item('mobile', 'Verizon', 'Housing & Utilities', 'fixed', 135.05), item('orkin', 'Orkin', 'Housing & Utilities', 'fixed', 19.68), item('water', 'Water Bill', 'Housing & Utilities', 'variable', 50), item('rent-fund', 'Rent Fund', 'Housing & Utilities', 'savings', 400), item('storage', 'Storage Unit', 'Housing & Utilities', 'fixed', 75),
  item('vehicle', 'Used Vehicle | 2019 Jeep Grand Cherokee', 'Transportation', 'debt', 470.34, 14), item('insurance', 'Progressive (Auto Insurance)', 'Transportation', 'fixed', 169.81, 1), item('gas', 'Gasoline', 'Transportation', 'variable', 225), item('licensing', 'Auto Licensing - 2019 Jeep Grand Cherokee', 'Transportation', 'variable', 7.0833333333),
  item('groceries', 'Groceries', 'Food', 'variable', 275), item('field-trips', 'School Field Trips', 'Dependent Care', 'variable', 15), item('school-supplies', 'School Supplies', 'Dependent Care', 'variable', 10), item('school-lunch', 'School Lunch Money', 'Dependent Care', 'variable', 0), item('cat-food', 'Chewy -- Cat Food / Litter', 'Dependent Care', 'variable', 50), item('pet-vet', 'Pet Vet / Medical Fund', 'Dependent Care', 'savings', 50), item('reptile', 'Driftless Reptiles -- Food & Supplies for Kai', 'Dependent Care', 'variable', 30),
  item('medical', 'Gundersen Health System', 'Medical', 'debt', 250, 15), item('prescriptions', 'Prescription Medications', 'Medical', 'variable', 50), item('dental', 'Dental Appointments', 'Medical', 'savings', 25), item('vision', 'Vision Exams & Corrective Lenses', 'Medical', 'savings', 25),
  item('laundry', 'Laundry Supplies', 'Personal Care', 'variable', 50), item('toiletries', 'Toiletries', 'Personal Care', 'variable', 50, 1), item('household', 'Household Misc. Supplies', 'Personal Care', 'variable', 50), item('clothing', 'Clothing & Shoes', 'Personal Care', 'variable', 50, 1),
  item('martial-arts', 'Martial Arts', 'Personal Wellness', 'fixed', 70, 1), item('ymca', 'Health Club Membership ( YMCA )', 'Personal Wellness', 'fixed', 0),
  item('books', 'Book(s) -- Kindle & Audible', 'Entertainment', 'discretionary', 0), item('sirius', 'Streaming - Music - SiriusXM', 'Entertainment', 'discretionary', 11.99), item('spotify', 'Streaming - Music - Spotify', 'Entertainment', 'discretionary', 0, 8), item('prime', 'Streaming - Video - Amazon Prime', 'Entertainment', 'discretionary', 10.75), item('netflix', 'Streaming - Video - Netflix', 'Entertainment', 'discretionary', 21.09, 18), item('paramount', 'Streaming - Video - Paramount+', 'Entertainment', 'discretionary', 0), item('disney', 'Streaming - Video - Disney+', 'Entertainment', 'discretionary', 34.8, 14), item('apple-tv', 'Streaming - Video - Apple TV+', 'Entertainment', 'discretionary', 0, 21), item('amc', 'Streaming - Video - AMC', 'Entertainment', 'discretionary', 11.59), item('movies', 'Movie Rentals / Movie Theatre', 'Entertainment', 'discretionary', 9.99), item('date-money', 'Date Money', 'Entertainment', 'discretionary', 75), item('green-money', 'Green Money', 'Entertainment', 'discretionary', 100), item('personal-spend', 'Personal Spending Allowance ($75/week)', 'Entertainment', 'discretionary', 325), item('misc-unknown', 'Misc. Unknown Expenses', 'Entertainment', 'discretionary', 50),
  item('office', 'Microsoft Office 365', 'Misc Expenses', 'fixed', 6.1533333333, 1), item('proton', 'Proton Security', 'Misc Expenses', 'fixed', 9.99, 1), item('bitdefender', 'BitDefender Security Suite', 'Misc Expenses', 'fixed', 9.1658333333, 1), item('chatgpt', 'ChatGPT', 'Misc Expenses', 'fixed', 20),
  item('chapter-13', 'Chapter 13 Repayment', 'Loans', 'debt', 527.995, 25), item('student-loan', 'Student Loans | Thomas', 'Student Loans', 'debt', 250), item('kwik-card', 'Kwik Rewards Plus', 'Credit Cards', 'debt', 0, 15),
]

const withAmounts = (id: string, amounts: Record<string, number>, name?: string): BudgetItem => {
  const source = baseItems.find((candidate) => candidate.id === id)!
  const amountMonthly = amounts[id] ?? source.amountMonthly
  return { ...source, name: name ?? source.name, amountMonthly, active: amountMonthly > 0 }
}

// Purple rows in the workbook are shared household expenses. The stored amount
// is Thomas's share, so keep the split visible without changing the calculation.
const sharedItemIds = new Set(['mortgage-1', 'mortgage-2', 'xcel', 'brightspeed', 'mobile', 'orkin', 'water', 'insurance', 'groceries', 'medical'])
const makeItems = (amounts: Record<string, number>, names: Record<string, string> = {}) => baseItems.map((source) => {
  const next = withAmounts(source.id, amounts, names[source.id])
  return sharedItemIds.has(source.id) ? { ...next, shared: true, sharedSharePercent: 50 } : next
})

const incomes = (salary: number, annualNet: number, name: string): IncomeSource[] => [{ id: 'primary-income', name, payType: 'salary', payFrequency: 'biweekly', annualSalary: salary, annualGross: salary, annualNet, netRetention: annualNet / salary, active: true, overtime: { enabled: false, hoursPerPayPeriod: 0, multiplier: 1.5 } }, { id: 'second-job', name: 'Second Job', payType: 'hourly', payFrequency: 'weekly', hourlyRate: 0, regularHoursPerWeek: 0, paidWeeksPerYear: 52, annualGross: 0, annualNet: 0, netRetention: 0, active: false, overtime: { enabled: false, hoursPerPayPeriod: 0, multiplier: 1.5 } }]

const workbookPaycheckModel: PaycheckModel = { taxBasis: 'workbook', grossPayPerPaycheck: 4807.692307692308, paychecksPerYear: 26, retirement401kPerPaycheck: 432.6923076923077, fsaMedicalPerPaycheck: 46.15, criticalIllnessPerPaycheck: 7.26, healthPremiumPerPaycheck: 241.44, otherPreTaxBenefitsPerPaycheck: 0, postTaxDeductionsPerPaycheck: 23.47 }

const debtRecords: DebtRecord[] = [
  { id: 'mortgage-debt', debtor: 'Altra Federal Credit Union', description: '1st Mortgage | 1230 Redfield St', minimumMonthly: 1218.59, dueDay: 1, balance: 151948.06 },
  { id: 'heloc-debt', debtor: 'Altra Federal Credit Union', description: '2nd Mortgage | 1230 Redfield St', minimumMonthly: 370.16, dueDay: 15, balance: 33526.16 },
  { id: 'auto-debt', debtor: 'Altra Federal Credit Union', description: 'Used Vehicle | 2019 Jeep Grand Cherokee', minimumMonthly: 0, dueDay: 14, balance: 26618.19 },
  { id: 'student-debt', debtor: 'Navient', description: 'Student Loans | Thomas', minimumMonthly: 0, balance: 67632 },
  { id: 'medical-debt', debtor: 'Gundersen Health System', description: 'Primary Account', minimumMonthly: 300, balance: 4682.83 },
]

const scenario = (id: string, name: string, description: string, salary: number, annualNet: number, amounts: Record<string, number>, incomeName = 'Potential New Job', names: Record<string, string> = {}, paycheckModel?: PaycheckModel): BudgetScenario => ({
  id, name, description, salary, annualNet, paychecksPerYear: paycheckModel?.paychecksPerYear ?? 26, incomeSources: incomes(salary, annualNet, incomeName), paycheckModel, items: makeItems(amounts, names), debts: debtRecords, taxProfile: defaultTaxProfile(salary), createdAt: now,
})

export const initialSnapshot: AppSnapshot = {
  schemaVersion: 2,
  settings: { defaultScenarioId: 'salary-125k', currency: 'USD', weekStartsOn: 'sunday', theme: { mode: 'light', navColor: '#f1ecdf', backgroundColor: '#f4efe4', accentColor: '#e17a62', backgroundStyle: 'paper', reduceMotion: false } },
  scenarios: [
    scenario('salary-125k', '$125K Projected', 'Primary projected salary scenario from Northern Trust workbook.', 125000, 77200.521546, { vacation: 50, concert: 50, emergency: 100, 'home-repair': 50, 'general-savings': 100, birthday: 50, 'chapter-13': 1278 }, 'Potential New Job', {}, workbookPaycheckModel),
    scenario('kt-only', 'KT Only', 'Current financial state using the Kwik Trip payroll model.', 82000, 52291.378346, { vacation: 0, concert: 0, emergency: 75, 'home-repair': 0, 'general-savings': 75, birthday: 75, xcel: 218, brightspeed: 20, mobile: 135.06, orkin: 19.69, water: 36.67, 'rent-fund': 0, storage: 0, vehicle: 0, gas: 200, groceries: 400, 'field-trips': 25, 'school-supplies': 15, 'cat-food': 0, 'pet-vet': 0, reptile: 20, prescriptions: 30, vision: 12.5, household: 50, clothing: 0, sirius: 0, netflix: 0, prime: 10.75, disney: 34.8, 'date-money': 100, 'green-money': 100, 'personal-spend': 200, office: 8.79, proton: 10, 'chapter-13': 527.995, 'student-loan': 0 }, 'Kwik Trip'),
    scenario('salary-100k', '$100K Projected', 'Lower projected salary sensitivity case.', 100000, 62718.461546, { vacation: 75, concert: 75, emergency: 100, 'home-repair': 75, 'general-savings': 100, birthday: 75, xcel: 235, brightspeed: 39.99, mobile: 150, orkin: 40, water: 75, 'rent-fund': 750, storage: 0, vehicle: 0, gas: 225, groceries: 400, 'field-trips': 25, 'school-supplies': 15, 'cat-food': 50, 'pet-vet': 0, reptile: 20, prescriptions: 30, household: 50, clothing: 0, sirius: 11.99, netflix: 0, 'date-money': 75, 'green-money': 75, 'personal-spend': 216.66, 'chapter-13': 527.995, 'student-loan': 0 }, 'Potential New Job', { mobile: 'T-Mobile', proton: 'Proton Security' }),
    scenario('salary-140k', '$140K Projected', 'Higher projected salary sensitivity case.', 140000, 85889.757546, { vacation: 75, concert: 75, emergency: 125, 'home-repair': 75, 'general-savings': 125, birthday: 75, xcel: 250, brightspeed: 39.99, mobile: 162.5, orkin: 40, water: 75, 'rent-fund': 750, storage: 75, gas: 250, groceries: 450, 'field-trips': 25, 'school-supplies': 15, 'cat-food': 60, 'pet-vet': 50, reptile: 20, prescriptions: 50, household: 75, clothing: 50, ymca: 60, netflix: 10.54, 'date-money': 100, 'green-money': 100, 'personal-spend': 325, 'chapter-13': 527.995, 'student-loan': 850 }, 'Potential New Job'),
  ],
  updatedAt: now,
}
