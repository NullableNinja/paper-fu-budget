import type { AppSnapshot } from '../models'
import { initialSnapshot } from '../data/seed'
import { defaultTaxProfile } from '../calculations/taxes'
import { defaultTheme } from '../app/theme'

const DB_NAME = 'paper-fu-budget'
const STORE = 'snapshots'
const KEY = 'current'

const migrateSnapshot = (snapshot: AppSnapshot): AppSnapshot => ({
  ...snapshot,
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
    return { ...scenario, items, taxProfile: scenario.taxProfile ?? defaultTaxProfile(scenario.salary) }
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
  return snapshot.schemaVersion === 1 && Array.isArray(snapshot.scenarios) && !!snapshot.settings && typeof snapshot.updatedAt === 'string'
}
