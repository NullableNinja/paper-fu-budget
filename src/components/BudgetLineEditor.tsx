import { useState } from 'react'
import type { BudgetItem, Frequency, ItemKind } from '../models'
import { Sheet } from './Sheet'

const kinds: ItemKind[] = ['fixed', 'variable', 'debt', 'savings', 'discretionary']
const frequencies: Frequency[] = ['weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'annual']

export const BudgetLineEditor = ({ item, onClose, onSave }: { item: BudgetItem; onClose: () => void; onSave: (item: BudgetItem) => void }) => {
  const [draft, setDraft] = useState(item)
  const update = <K extends keyof BudgetItem>(key: K, value: BudgetItem[K]) => setDraft({ ...draft, [key]: value })
  return <Sheet title={item.name ? 'Edit budget line' : 'Add budget line'} onClose={onClose}>
    <form className="edit-form" onSubmit={(event) => { event.preventDefault(); onSave(draft) }}>
      <label>Name<input value={draft.name} onChange={(event) => update('name', event.target.value)} required autoFocus /></label>
      <div className="form-grid"><label>Amount<input type="number" min="0" step="0.01" value={draft.amountMonthly} onChange={(event) => update('amountMonthly', Number(event.target.value))} required /></label><label>Frequency<select value={draft.frequency} onChange={(event) => update('frequency', event.target.value as Frequency)}>{frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}</select></label></div>
      <div className="form-grid"><label>Kind<select value={draft.kind} onChange={(event) => update('kind', event.target.value as ItemKind)}>{kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></label><label>Category<input value={draft.category} onChange={(event) => update('category', event.target.value)} required /></label></div>
      <div className="form-grid"><label>Due day<input type="number" min="1" max="31" value={draft.dueDay ?? ''} onChange={(event) => update('dueDay', event.target.value ? Number(event.target.value) : undefined)} /></label><label>Account nickname<input value={draft.accountNickname ?? ''} onChange={(event) => update('accountNickname', event.target.value)} /></label></div>
      <label>Pay bill / account URL<input type="url" placeholder="https://…" value={draft.url ?? ''} onChange={(event) => update('url', event.target.value)} /></label>
      <label className="check-row"><input type="checkbox" checked={draft.autoPay ?? false} onChange={(event) => update('autoPay', event.target.checked)} /> Auto-pay enabled</label>
      <label className="check-row"><input type="checkbox" checked={draft.active} onChange={(event) => update('active', event.target.checked)} /> Include this line in calculations</label>
      <div className="shared-expense-editor"><p className="eyebrow">Household split</p><label className="check-row"><input type="checkbox" checked={draft.shared ?? false} onChange={(event) => update('shared', event.target.checked)} /> Shared expense — this amount is my share</label>{draft.shared && <div className="form-grid"><label>My share<input type="number" min="1" max="100" step="1" value={draft.sharedSharePercent ?? 50} onChange={(event) => update('sharedSharePercent', Number(event.target.value))} />%</label><p className="field-help">At {draft.sharedSharePercent ?? 50}%, a {formatEditorCurrency(draft.amountMonthly / ((draft.sharedSharePercent ?? 50) / 100))} household bill is shown here as your {formatEditorCurrency(draft.amountMonthly)} share.</p></div>}</div>
      <label>Notes<textarea value={draft.notes ?? ''} onChange={(event) => update('notes', event.target.value)} placeholder="What is this for? Is it an estimate, target, or hard bill?" /></label>
      <button className="button primary wide">Save line item</button>
    </form>
  </Sheet>
}

const formatEditorCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
