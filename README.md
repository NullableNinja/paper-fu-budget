# Paper-Fu Budget

Paper-Fu Budget is a mobile-first personal budget dashboard seeded from the attached Tommy budget workbooks. The default scenario is **$125K Projected**. KT Only, $100K Projected, and $140K Projected remain available as scenarios.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

`npm run lint`, `npm run test`, and `npm run build` are the verification commands.

## Architecture

- React + TypeScript + Vite.
- Hash-based routing keeps deep links refresh-safe on GitHub Pages.
- Financial math lives in `src/calculations/engine.ts`, outside React rendering.
- Scenarios share the same budget-line structure. A scenario changes salary, take-home pay, and line-item amounts rather than duplicating UI code.
- Editable budget data is stored in IndexedDB through `src/storage/db.ts`. JSON export/import includes a schema version and validates before restore.
- The service worker is network-first for GET requests so updates do not leave stale financial data stuck in cache.

## Authentication

The frontend does not contain the requested temporary password and does not implement insecure client-only password validation. Set `VITE_AUTH_API_URL` to a real server-side authentication service implementing:

```text
POST /auth/login
GET  /auth/session (optional if the backend uses an HttpOnly cookie)
POST /auth/logout
POST /auth/change-password
```

The adapter sends credentials with `credentials: include`; the backend should use secure, HttpOnly, SameSite cookies or an equivalent secure session. A Supabase Edge Function or small hosted API can implement this contract. The temporary password must be established through that service’s secure admin/first-user flow, never committed to this repository or a `VITE_*` value.

## Workbook migration assumptions

- The workbook’s 26 biweekly paycheck convention is preserved. Biweekly income is annual net / 26, not monthly net / 2.
- Savings, discretionary allocations, fixed bills, variable expenses, and debt are separate kinds in the model.
- Workbook rows with zero monthly values remain in the shared structure as inactive/editable lines.
- Account numbers are not exposed in the UI seed. Line-item metadata supports account nickname, URLs, autopay, and notes for future user entry.
- Seed profiles start from the workbook’s 2026 payroll assumptions, then the tax engine recalculates take-home from the editable W-2 profile.

## Tax model

The W-2 tax profile recalculates scenario take-home from gross wages. It currently models 2026 federal marginal brackets and standard deductions, Wisconsin full-year resident rates and standard-deduction formulas, Wisconsin $700 personal/dependent exemptions, the $2,200 child tax credit with phaseout, Social Security at the 2026 $184,500 wage base, Medicare, Additional Medicare, 401(k), pre-tax benefits, FICA-exempt benefits, and post-tax deductions. Tax profile changes are scenario-specific, so a married or dependent scenario can be cloned without changing the primary $125K case.

The estimate is intentionally labeled as annual tax liability, not exact payroll withholding. Exact W-4/WT-4 withholding, itemized deductions, capital gains, AMT, EITC, education/adoption credits, local taxes, multi-state wages, and detailed spouse payroll elections are still outside the current model and should be calibrated against actual paystubs and Form W-2 data.

## Deployment

Build the static frontend with `npm run build`. Configure the production auth endpoint through the hosting environment. Do not put private auth secrets in Vite environment variables: all `VITE_*` values are public. The current project is ready for a GitHub repository and Pages deployment, but it still needs a user-authorized repository and authentication backend before production use.
