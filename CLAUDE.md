# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

It is also the project's permanent memory for WedPay. Read it fully before doing anything.
Whenever a rule here conflicts with a request, follow this file and ask the user.

---

## Developer commands

```bash
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build + TypeScript check (run this to catch type errors)
npm run lint     # ESLint
npm run start    # serve the production build
```

There are no automated tests. Verify each phase manually using the test steps given after each build phase.

---

## Technical architecture

### Next.js 16 specifics

- **`src/proxy.ts`** is the auth proxy — Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported function from `middleware` to `proxy`. Do not revert to `middleware.ts`.
- **Dynamic route `params` is a Promise** in Next.js 15+. Always `await params` in page components:
  ```ts
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
  ```
- **Tailwind v4** — configured via `@import "tailwindcss"` in `globals.css`. There is no `tailwind.config.ts`.

### Two-layer auth

Every protected request passes through two checks:

1. **`src/proxy.ts`** — runs on every request; refreshes the Supabase session cookie. Unauthenticated → `/login`. Authenticated on `/login` → `/dashboard`. Does **not** check for a profile row (too slow for the edge).
2. **`src/app/(app)/layout.tsx`** — server component; checks both session and `profiles` row. No session → `/login`. Session but no profile row → `/set-name`. The `(app)` route group wraps all four tab pages (dashboard, expenses, contributions, settings).

`/login` and `/set-name` live outside the `(app)` group and have no shell layout.

### Supabase clients

| File | Use when |
|---|---|
| `src/lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers |
| `src/lib/supabase/client.ts` | Client Components (`'use client'`) |

Both are generic over `Database` (from `src/lib/supabase/types.ts`). The types file is hand-written from `docs/data-model.md` — do not overwrite it with CLI output without re-adding `Relationships: []` to every table (required by supabase-js ≥ v2.68) and `Update: never` on `activity_log`.

`numeric(14,2)` Postgres columns are returned as **`string`** by the JS client. This is intentional — see money arithmetic below.

### Money arithmetic

All arithmetic happens in **integer paisa** (minor units × 100). Never add or compare raw string amounts.

```ts
import { toMinorUnits, formatMoney } from '@/lib/money'

const paisa = toMinorUnits(row.amount)   // "50000.00" → 5000000
formatMoney(paisa)                        // → "Rs 50,000.00"
```

Ratio-based values (fair shares, balances) may produce fractional paisa — round for comparison, keep 2 decimal places for display. `formatMoney` handles the display step.

### Server action pattern

Every mutation follows this exact sequence — never skip the activity log step:

```ts
'use server'
// 1. create server client
// 2. getActor(supabase)          → { id, name } from auth + profiles
// 3. DB operation
// 4. logActivity(supabase, {...}) → writes to activity_log
// 5. revalidatePath(...)          → invalidates Next.js cache so UI refreshes
// 6. return { success: true } | { error: string }
```

All mutation files (`src/lib/expenses.ts`, and future `payments.ts`, `contributions.ts`) export `ActionResult = { success: true } | { error: string }`.

### Payment totals rule

A payment counts toward `total_spent`, `paid_so_far`, and category breakdowns **only when both the payment AND its parent expense are non-archived**. Do not cascade-archive payments when archiving an expense. Query:

```sql
payments.is_archived = false AND expenses.is_archived = false
```

### "Who owes whom" display rule

When `leftover < 0` (contributions < spending), show **only** the gentle warning, not a "X owes Y" sentence — the data is incomplete and a confident debt sentence would mislead.

---

## Build phases

Phases 0–3 are complete. The current state:
- **Phase 0** — scaffold, Supabase clients, mobile shell (header + bottom tab bar)
- **Phase 1** — database schema, types (run SQL in Supabase, create `receipts` bucket)
- **Phase 2** — auth (login, session, display-name prompt, sign out)
- **Phase 3** — expenses list, add/edit bottom sheet, archive/restore, activity log, expense detail

Next: **Phase 4** (payments + receipts), then 5–11 per `docs/build-plan.md`.

---

## WedPay project spec

_(Sections below are the original project spec — they are the source of truth for all business rules.)_

---

---

## 1. What this app is

A private web app for **two families** (groom's side and bride's side) to track all
wedding expenses and who paid for what, so both sides always see clearly what has been
done and what is still owed.

It is used **mostly on phones**, by people who are not technical. Every screen must be
mobile-first and dead simple.

The app is called **WedPay**. Use this exact name in the top header / app bar, the browser
tab title (`<title>` / metadata), the PWA manifest (`name` and `short_name`), and
`package.json`.

---

## 2. Tech stack (do not change without asking)

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** for styling
- **Supabase** for database (Postgres), auth, and file storage (receipts)
- Supabase auth via **`@supabase/ssr`** (server + client helpers)
- Deployed on **Vercel**

---

## 3. The money model — READ CAREFULLY, NEVER GET THIS WRONG

There are **two completely separate logs**. They are never linked or auto-filled from
each other. The user records each one by hand, on purpose.

1. **Expenses & Payments** = money that goes OUT to a vendor.
   - An *expense* is one thing being paid for (e.g. "Photographer"), with a name,
     description, and an **expected cost** (an estimate).
   - Each expense has one or more *payments* (advance, balance, etc.). Each payment has
     an amount, a date, an optional note, and an optional **receipt** file.

2. **Contributions** = money a side puts IN, **from its own pocket**.
   - A contribution belongs to one side: `groom` or `bride`.
   - "Own pocket" is the key rule: a contribution is the side's own money, **not** money
     that side is merely holding for the other side.
   - Payments are **NOT** tagged with a side. The "who put money in" story lives only in
     Contributions.

> Why separate: sometimes one side hands cash to the other side to pay a bill and keep
> the rest for later. The money put in is then not equal to the money spent. Keeping the
> two logs separate makes this correct automatically.

### Settings
- A single editable **split ratio** between the two sides. Stored as `groom_percentage`
  (0–100). Bride's percentage = `100 − groom_percentage`. Default is **50**.
- Currency is **LKR**, shown as `Rs` with thousands separators (e.g. `Rs 1,000,000.00`).

### The formulas (the dashboard is built ONLY from these)

Use only non-archived rows everywhere.

```
total_budget       = sum(expenses.expected_cost)
total_spent        = sum(payments.amount)
total_contributed  = sum(contributions.amount)
groom_contributed  = sum(contributions.amount where side = 'groom')
bride_contributed  = sum(contributions.amount where side = 'bride')

groom_ratio        = groom_percentage / 100
bride_ratio        = 1 - groom_ratio

groom_fair_share   = total_spent * groom_ratio      // each side's share of what is SPENT
bride_fair_share   = total_spent * bride_ratio

groom_balance      = groom_contributed - groom_fair_share   // + = overpaid, - = underpaid
bride_balance      = bride_contributed - bride_fair_share

leftover           = total_contributed - total_spent        // money put in but not yet spent
still_to_pay       = sum over expenses of max(0, expected_cost - paid_so_far)
```

### "Who owes whom right now" — exact logic

Fair share is based on **what has been spent so far**, not on the budget.

```
if groom_balance < 0:   "Groom's side owes Bride's side Rs |groom_balance|"
elif bride_balance < 0: "Bride's side owes Groom's side Rs |bride_balance|"
else:                   "All settled up."
```

Notes:
- When `leftover >= 0`, at most one side can be negative, so at most one side owes. This
  is mathematically guaranteed — rely on it.
- When `leftover > 0` and one side is owed, also show a calm note:
  `"(Plus Rs <leftover> already paid in toward future expenses.)"`
- If `leftover < 0` (recorded contributions are less than recorded spending), show a
  gentle warning: `"Recorded contributions are Rs <x> less than recorded spending — a
  payment may not yet be recorded as a contribution."` Do not block anything; it is a
  data-entry reminder only.

### Worked example (use this as a test)
Bride puts in Rs 300,000 (own pocket). Groom puts in Rs 0. One payment of Rs 250,000 is
made. Split is 50/50.
- total_spent = 250,000 → each fair share = 125,000
- groom_balance = 0 − 125,000 = −125,000 → **Groom owes Bride Rs 125,000**
- leftover = 300,000 − 250,000 = 50,000 → note: "Plus Rs 50,000 paid in toward future."

---

## 4. Mobile-first rules (hard requirements, not optional)

- Single-column layouts. Design for a ~360px wide phone first, then let it look fine on
  desktop.
- **Bottom tab bar** for primary navigation: Dashboard · Expenses · Contributions ·
  Settings. Tabs are thumb-reachable. (The Activity feed is reached from the Dashboard and
  a header icon, not a 5th tab — keep the bar uncluttered.)
- Tap targets at least **44×44px**. Generous spacing. No tiny links.
- Money inputs use `inputmode="decimal"`; date inputs use native `<input type="date">`.
- Inputs use **16px+ font** so iOS does not zoom on focus.
- Add/Edit happen in a **bottom sheet or full-screen modal**, not a cramped inline form.
- A clear floating "**+ Add**" button on list screens.
- Confirm before delete. Show success/error toasts. Show loading and empty states.
- Must be fast and usable on a mid-range phone over mobile data.
- Make it installable (PWA / "Add to Home Screen") in the polish phase.

---

## 5. Permissions

- Closed app. Public sign-up is **disabled**. The owner invites users in Supabase.
- **Every signed-in user can view and edit everything.** No per-side restrictions.
- On first login, a user sets a **display name** (stored in `profiles`).
- Every payment and contribution stores `created_by` and a `created_by_name` snapshot, and
  the UI shows "Added by <name> on <date>".
- Every add/edit/archive/restore action is also recorded in the activity log (section 7),
  so both families can see who changed what.

---

## 6. Data safety

- **Soft delete**: deleting sets `is_archived = true`. Never hard-delete user data from
  the UI. Hidden rows are excluded from all lists and all formulas.
- Money is stored as `numeric(14,2)`. Never use floating-point math for money in JS that
  could lose precision in display; format with `Intl.NumberFormat('en-LK', { style:
  'currency', currency: 'LKR' })`.

---

## 7. Activity logging & export

**Activity logging (part of v1).**
- Every create, edit, archive, and restore of an expense, payment, contribution, or the
  split ratio writes **one row** to `activity_log`, with: the `action`, a short
  human-readable `summary`, and the actor's `created_by_name`. Build the summary string at
  the moment of the action. Examples:
  - "Added payment Rs 50,000.00 to Photographer"
  - "Changed Catering expected cost Rs 80,000.00 → Rs 95,000.00"
  - "Archived contribution Rs 25,000.00 (Groom's side)"
  - "Changed split to Groom 60 / Bride 40"
- For edits to a money amount, include **old → new** in the summary.
- `activity_log` is **append-only**: never edit or delete its rows from the app (RLS allows
  only select + insert).
- The Dashboard shows the latest few entries; a full **Activity** screen shows all, newest
  first.

**Export (part of v1, read-only).**
- Export never changes the database. Generate everything on the **client** from data
  already loaded.
- **CSV**: the detailed data (expenses with paid-so-far/remaining, payments, contributions).
- **PDF**: a clean one-to-few page summary report (the dashboard numbers + tables). A
  client-side library such as `jspdf` + `jspdf-autotable` or `@react-pdf/renderer` is fine.

---

## 8. Conventions

- Keep components small and readable. Co-locate Supabase queries in clearly named
  functions, not scattered inline. Put the activity-log write inside those mutation
  functions so it can never be forgotten.
- All amounts validated as `>= 0` before insert.
- Use the spec docs as the source of truth:
  - `docs/spec.md` — what each screen does
  - `docs/data-model.md` — schema, RLS, storage, formulas, the SQL migration
  - `docs/build-plan.md` — the phase you are currently building
- Build **one phase at a time**. After each phase, summarize what changed and how to test
  it, then stop and wait.
