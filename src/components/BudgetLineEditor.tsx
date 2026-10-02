import { useState } from 'react'
import type { BudgetItem, Frequency, ItemKind } from '../models'
import { Sheet } from './Sheet'
import { ConfirmDialog } from './ConfirmDialog'

const kinds: ItemKind[] = ['fixed', 'variable', 'debt', 'savings', 'discretionary']
const frequencies: Frequency[] = ['weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'annual']

export const BudgetLineEditor = ({ item, categories = [], onClose, onSave, onDelete }: { item: BudgetItem; categories?: string[]; onClose: () => void; onSave: (item: BudgetItem) => void; onDelete?: (item: BudgetItem) => void }) => {
  const [draft, setDraft] = useState(item)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const update = <K extends keyof BudgetItem>(key: K, value: BudgetItem[K]) => setDraft({ ...draft, [key]: value })
  const dueMode = draft.dueUponReceipt ? 'receipt' : draft.dueDay ? 'day' : 'none'
  const setDueMode = (mode: string) => setDraft({ ...draft, dueUponReceipt: mode === 'receipt', dueDay: mode === 'day' ? (draft.dueDay ?? 1) : undefined })
  const confirmDelete = () => { if (onDelete) setConfirmingDelete(true) }
  return <Sheet title={item.name ? 'Edit budget line' : 'Add budget line'} onClose={onClose}>
    <form className="edit-form" onSubmit={(event) => { event.preventDefault(); onSave(draft) }}>
      <label>Name<input value={draft.name} onChange={(event) => update('name', event.target.value)} required autoFocus /></label>
      <div className="form-grid"><label>Amount<input type="number" min="0" step="0.01" value={draft.amountMonthly} onChange={(event) => update('amountMonthly', Number(event.target.value))} required /></label><label>Frequency<select value={draft.frequency} onChange={(event) => update('frequency', event.target.value as Frequency)}>{frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}</select></label></div>
      <div className="form-grid"><label>Kind<select value={draft.kind} onChange={(event) => update('kind', event.target.value as ItemKind)}>{kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></label><label>Category<select value={draft.category} onChange={(event) => update('category', event.target.value)} required>{Array.from(new Set([...categories, draft.category].filter(Boolean))).map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div>
      <div className="form-grid"><label>Due date<select value={dueMode} onChange={(event) => setDueMode(event.target.value)}><option value="none">No due date</option><option value="receipt">Due upon receipt</option><option value="day">Specific day of month</option></select></label>{dueMode === 'day' ? <label>Due day<input type="number" min="1" max="31" value={draft.dueDay ?? 1} onChange={(event) => update('dueDay', event.target.value ? Number(event.target.value) : undefined)} /></label> : <span className="field-help due-date-help">{dueMode === 'receipt' ? 'Flagged as due immediately when received.' : 'Use this for flexible items with no due date.'}</span>}</div>
      <label>Account nickname<input value={draft.accountNickname ?? ''} onChange={(event) => update('accountNickname', event.target.value)} /></label>
      <label>Pay bill / account URL<input type="url" placeholder="https://…" value={draft.url ?? ''} onChange={(event) => update('url', event.target.value)} /></label>
      <label className="tag-editor-field">Tags <span className="field-label-hint">comma-separated</span><input aria-label="Tags" value={(draft.tags ?? []).join(', ')} onChange={(event) => update('tags', event.target.value.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))} placeholder="bankruptcy, family, reimbursed" /><span className="field-help">Type one or more labels separated by commas. Save the line, then use the “All tags” filter above the ledger.</span></label>
      <label className="check-row"><input type="checkbox" checked={draft.autoPay ?? false} onChange={(event) => update('autoPay', event.target.checked)} /> Auto-pay enabled</label>
      <label className="check-row"><input type="checkbox" checked={draft.active} onChange={(event) => update('active', event.target.checked)} /> Include this line in calculations</label>
      <div className="shared-expense-editor"><p className="eyebrow">Household split</p><label className="check-row"><input type="checkbox" checked={draft.shared ?? false} onChange={(event) => update('shared', event.target.checked)} /> Shared expense — this amount is my share</label>{draft.shared && <div className="form-grid"><label>My share<input type="number" min="1" max="100" step="1" value={draft.sharedSharePercent ?? 50} onChange={(event) => update('sharedSharePercent', Number(event.target.value))} />%</label><p className="field-help">At {draft.sharedSharePercent ?? 50}%, a {formatEditorCurrency(draft.amountMonthly / ((draft.sharedSharePercent ?? 50) / 100))} household bill is shown here as your {formatEditorCurrency(draft.amountMonthly)} share.</p></div>}</div>
      <label>Notes<textarea value={draft.notes ?? ''} onChange={(event) => update('notes', event.target.value)} placeholder="What is this for? Is it an estimate, target, or hard bill?" /></label>
      {onDelete && item.name && <button className="button danger wide" type="button" onClick={confirmDelete}>Delete line item</button>}
      <button className="button primary wide">Save line item</button>
    </form>
    {confirmingDelete && <ConfirmDialog title="Delete this line item?" message={`“${draft.name || 'This line item'}” will be removed from this scenario. This cannot be undone from the app.`} confirmLabel="Delete line item" onCancel={() => setConfirmingDelete(false)} onConfirm={() => onDelete?.(draft)} />}
  </Sheet>
}

const formatEditorCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
