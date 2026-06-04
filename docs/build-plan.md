# docs/build-plan.md — Build in phases

Build **one phase at a time**. After each phase: summarize what changed, give exact steps
to test it, then stop and wait for "go" before the next phase. Do not jump ahead.

From Phase 3 onward, every create/edit/archive/restore must also write an `activity_log`
row (see `CLAUDE.md` §7). Build that into the mutation functions so it is never forgotten.

---

## Phase 0 — Project setup
- Scaffold Next.js (App Router) + TypeScript + Tailwind.
- Add Supabase libs (`@supabase/supabase-js`, `@supabase/ssr`).
- Create server and browser Supabase clients reading `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`. Add `.env.local.example`.
- Base mobile layout: a **bottom tab bar** (Dashboard · Expenses · Contributions ·
  Settings) and a content area, plus a top header showing the app name **WedPay** with room
  for an Activity (history) icon. Placeholder pages for each tab.
- Confirm: `npm run dev` shows the four tabs and switches pages on a phone-width screen.

## Phase 1 — Database
- Provide/confirm the SQL from `data-model.md` (includes `activity_log`); user runs it.
- Create the private `receipts` bucket and its storage policies.
- Generate TypeScript types from the schema and wire them into the clients.
- Confirm: all tables (including `activity_log`) and the bucket exist; types compile.

## Phase 2 — Auth + profile name
- Login screen (email + password). Protect all routes; signed-out users go to login.
- On first login with no `profiles` row, prompt once for a display name and save it.
- "Sign out" in Settings. Session survives refresh (use `@supabase/ssr`).
- Confirm: log in with a Supabase-invited user, set a name, refresh stays logged in, sign
  out works.

## Phase 3 — Expenses (no payments yet)
- Expenses list (name, category tag, expected cost, progress bar), floating **+ Add**.
- Add/edit expense bottom sheet with all fields from `spec.md`. Soft-delete (archive) with
  confirm. Search, sort, filter (category + status). Expense detail (payments placeholder).
- **Write activity_log rows** on create / edit / archive / restore.
- Confirm: create, edit, archive expenses; search/sort/filter work on a phone.

## Phase 4 — Payments + receipts
- Payments list inside expense detail. Add/edit payment (amount, date, note, receipt).
- Upload receipt to the `receipts` bucket; show progress; view/download via signed URL;
  thumbnail for images, icon for PDFs.
- Recompute paid-so-far, remaining, status badge, per-expense progress bar.
- Soft-delete payments with confirm; show "Added by <name> on <date>".
- **Write activity_log rows** on create / edit / archive / restore.
- Confirm: add multiple payments to one expense; receipts upload and open; totals update.

## Phase 5 — Contributions
- Contributions tab with Groom / Bride sections (or toggle), each with a running total.
- Add/edit contribution (side, amount, date, note, optional receipt). "Own pocket" helper.
  Soft-delete with confirm; "Added by <name>".
- **Write activity_log rows** on create / edit / archive / restore.
- Confirm: add contributions for both sides; per-side totals correct; receipts work.

## Phase 6 — Dashboard
- Implement every formula from `data-model.md` over non-archived rows.
- Build the dashboard sections from `spec.md`, in order: who-owes-whom sentence (exact
  logic from `CLAUDE.md`), budget vs spent + still-to-pay, the two side cards
  (overpaid/underpaid), leftover, upcoming payments, spending by category, and a
  **Recent activity** card (latest 5 from `activity_log`, with "View all →").
- Confirm with the worked example in `CLAUDE.md`: Bride 300,000 in, Groom 0, one 250,000
  payment, 50/50 → "Groom owes Bride Rs 125,000" + "Plus Rs 50,000 toward future".

## Phase 7 — Settings
- Edit split ratio (`groom_percentage`), show "Groom X / Bride Y", save + recalculate, and
  write an activity_log row ("Changed split to Groom X / Bride Y").
- Edit display name. Show currency (LKR). Sign out. Optional archived-items + restore
  (restore writes an activity_log row).
- Confirm: changing the ratio updates fair shares and the who-owes-whom sentence.

## Phase 8 — Activity feed (full screen)
- Build the full **Activity** screen: reverse-chronological list of all `activity_log` rows
  (newest first), paginated / infinite scroll. Each row: summary, who, relative + exact
  time, and an icon/colour per action. Filter by type (Expenses / Payments / Contributions
  / Settings).
- Reach it from the Dashboard "Recent activity → View all" and the header history icon.
- Confirm: actions done in earlier phases all appear with correct summaries and names.

## Phase 9 — Export (CSV + PDF)
- Add an **Export / Reports** section in Settings.
- **CSV**: download detailed data — expenses (with paid-so-far / remaining), payments,
  contributions.
- **PDF summary**: a clean report — header + generated date, the dashboard summary
  (budget, spent, who-owes-whom, each side's position, leftover), then tables of expenses,
  payments, and contributions. Generate on the client (`jspdf` + `jspdf-autotable` or
  `@react-pdf/renderer`).
- Confirm: both downloads open correctly and match the on-screen numbers.

## Phase 10 — Polish + mobile QA
- Empty states, loading skeletons, success/error toasts, consistent confirm-before-delete.
- Apply `Rs` formatting everywhere via `Intl.NumberFormat('en-LK', {...})`.
- Re-check every mobile rule in `CLAUDE.md` (tap sizes, no iOS zoom, bottom sheets, thumb
  reach) at 360px width.
- Add a PWA manifest + icons (app name **WedPay**) so it can be added to the home screen.
- Confirm: feels like a clean app on a real phone.

## Phase 11 — Deploy
- Ensure `.env.local` is git-ignored; document required env vars.
- Push to GitHub; import to Vercel; set the two Supabase env vars; deploy.
- In Supabase Auth: disable public sign-ups; set the Vercel URL as Site URL / redirect.
- Confirm: the live URL works on phones for an invited user.
