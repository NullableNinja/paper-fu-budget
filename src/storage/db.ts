import type { AppSnapshot, BudgetScenario, IncomeSource } from '../models'
import { initialSnapshot } from '../data/seed'
import { defaultTaxProfile } from '../calculations/taxes'
import { defaultTheme } from '../app/theme'

const DB_NAME = 'paper-fu-budget'
const STORE = 'snapshots'
const KEY = 'current'

export const migrateSnapshot = (snapshot: AppSnapshot): AppSnapshot => ({
  ...snapshot,
  schemaVersion: 2,
  settings: { ...snapshot.settings, theme: { ...defaultTheme, ...(snapshot.settings.theme ?? {}) } },
  scenarios: snapshot.scenarios.map((scenario) => {
    const seed = initialSnapshot.scenarios.find((candidate) => candidate.id === scenario.id)
    const existingIds = new Set(scenario.items.map((item) => item.id))
    const addedItems = seed?.items.filter((item) => !existingIds.has(item.id)).map((item) => ({ ...item })) ?? []
    const items = [...scenario.items, ...addedItems].map((item) => {
      const seeded = seed?.items.find((candidate) => candidate.id === item.id)
      const withWorkbookContext = item.shared === undefined && seeded?.shared ? { ...item, shared: true, sharedSharePercent: seeded.sharedSharePercent } : item
      return scenario.id === 'salary-125k' && withWorkbookContext.id === 'chapter-13' && withWorkbookContext.amountMonthly === 527.995 ? { ...withWorkbookContext, amountMonthly: 1278, active: true } : withWorkbookContext
    })
    const sources = scenario.incomeSources.map((source): IncomeSource => {
      const { memberId: _memberId, ...withoutMember } = source as IncomeSource & { memberId?: string }
      const payFrequency = source.payFrequency ?? (source.payType === 'hourly' ? 'weekly' : 'biweekly')
      const periods = payFrequency === 'weekly' ? 52 : payFrequency === 'biweekly' ? 26 : payFrequency === 'semimonthly' ? 24 : payFrequency === 'monthly' ? 12 : payFrequency === 'annual' ? 1 : 26
      return { ...withoutMember, payType: source.payType ?? 'salary', payFrequency, annualSalary: source.annualSalary ?? source.annualGross, overtime: source.overtime ? { ...source.overtime, hoursPerPayPeriod: source.overtime.hoursPerPayPeriod ?? (source.overtime.hoursPerYear ?? 0) / periods } : { enabled: false, hoursPerPayPeriod: 0, multiplier: 1.5 } }
    })
    const { householdMembers: _householdMembers, ...withoutHouseholdMembers } = scenario as BudgetScenario & { householdMembers?: unknown }
    return { ...withoutHouseholdMembers, items, incomeSources: sources, taxProfile: scenario.taxProfile ?? defaultTaxProfile(scenario.salary) }
  }),
})

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1)
  request.onupgradeneeded = () => request.result.createObjectStore(STORE)
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

export const loadSnapshot = async (): Promise<AppSnapshot> => {
  if (!('indexedDB' in window)) return structuredClone(initialSnapshot)
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
    request.onsuccess = () => resolve(request.result ? migrateSnapshot(request.result as AppSnapshot) : structuredClone(initialSnapshot))
    request.onerror = () => reject(request.error)
  })
}

export const saveSnapshot = async (snapshot: AppSnapshot) => {
  if (!('indexedDB' in window)) return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(snapshot, KEY)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const validateSnapshot = (value: unknown): value is AppSnapshot => {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Partial<AppSnapshot>
  const version = (value as { schemaVersion?: number }).schemaVersion
  return (version === 1 || version === 2) && Array.isArray(snapshot.scenarios) && !!snapshot.settings && typeof snapshot.updatedAt === 'string'
}
