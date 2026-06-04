# CLAUDE.md — WedPay (wedding expense tracker)

This file is the project's permanent memory. Read it fully before doing anything.
Whenever a rule here conflicts with a request, follow this file and ask the user.

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
