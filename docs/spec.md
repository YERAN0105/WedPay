# docs/spec.md — What each screen does

Plain-language spec. For the money rules and formulas see `data-model.md`. For mobile
rules, the model summary, and the activity-log/export rules see `CLAUDE.md`.

Four main tabs in a **bottom tab bar**: Dashboard, Expenses, Contributions, Settings. The
**Activity** feed is a full screen reached from the Dashboard and a header icon (not a
tab). Plus a login screen and a one-time "set your name" step.

---

## Login
- Email + password (Supabase auth). No public sign-up link.
- After login, if the user has no `profiles.display_name`, ask for it once and save it.
- A "Sign out" action lives in Settings.

---

## Dashboard (home tab)
The at-a-glance picture. Built only from the formulas in `data-model.md`.

Show, top to bottom:
1. **Who owes whom right now** — one big, plain sentence (exact logic in `CLAUDE.md`). If
   settled, "All settled up." If there is leftover, add the calm note about money paid
   toward future expenses.
2. **Budget vs spent** — `total_budget`, `total_spent`, a progress bar, and `still_to_pay`.
3. **Each side's position** — two cards (Groom, Bride). Each shows contributed, fair share,
   and balance labelled **Overpaid Rs X** (green) or **Underpaid Rs X** (amber). Show the
   current split (e.g. "Split 50 / 50").
4. **Leftover** — money already paid in but not yet spent (`leftover`), if any.
5. **Upcoming payments** — non-archived expenses that have a `next_due_date`, soonest
   first: expense name, `next_due_amount`, date. The "what we still need to do" view.
6. **Spending by category** — a small breakdown of paid-so-far grouped by category.
7. **Recent activity** — the latest 5 changes (summary + who + when), with **"View all →"**
   opening the full Activity screen.

All money uses the `Rs` format.

---

## Expenses (tab)
A list of everything being paid for.

**List**
- Each row: name, category tag, expected cost, paid-so-far, a **status badge**
  (`Not paid` / `Partly paid` / `Fully paid` / `Overpaid`), and remaining balance
  (`max(0, expected_cost − paid_so_far)`). A thin progress bar per expense.
- **Search** by name/vendor. **Sort** by name, expected cost, or remaining. **Filter** by
  category and status. Floating **+ Add expense** button. Tap a row → detail.

**Add / edit expense** (bottom sheet / full-screen)
- name (required), description, expected cost (required, ≥ 0), category (preset list:
  Venue, Catering, Attire, Photography, Decor, Music, Transport, Invitations, Jewellery,
  Gifts, Other — allow custom), vendor name, vendor phone (optional), next payment due
  amount + date (optional).

**Expense detail**
- Header: name, category, vendor (tap phone to call), expected cost, paid-so-far,
  remaining, status badge.
- **Payments list**: each shows amount, date, note, "Added by <name>", and a receipt
  thumbnail if present (tap to view/download). **+ Add payment** button.
- Edit / archive the expense.

**Add / edit payment**
- amount (required, ≥ 0), date (defaults today), note (optional), receipt upload (optional;
  image or PDF). Show progress; store privately; view via signed URL.

> Every create/edit/archive here writes an activity-log row (see `CLAUDE.md` §7).

---

## Contributions (tab)
A separate log of money each side put in from its own pocket. **Never linked to payments.**

- Two sections or a side toggle: **Groom's side** and **Bride's side**, each with a running
  total.
- Each entry: amount, date, note, "Added by <name>", optional receipt.
- Floating **+ Add contribution**. Add/edit: side (required), amount (required, ≥ 0), date
  (defaults today), note (optional), receipt (optional).
- Helper line: "Record money your side paid from its own pocket here. Money you are holding
  for the other side is not your contribution."

> Every create/edit/archive here writes an activity-log row.

---

## Activity (full screen)
Opened from the Dashboard "Recent activity → View all" and a history icon in the header.

- Reverse-chronological list of **every recorded change** (newest first), paginated or
  infinite scroll.
- Each row: the `summary` text, who did it (`created_by_name`), a relative time plus the
  exact date, and a small icon/colour per action (added / edited / archived / restored).
- Simple filter by type: Expenses / Payments / Contributions / Settings.
- Read-only screen — nothing here can be edited.

---

## Settings (tab)
- **Split ratio**: edit `groom_percentage` (0–100); show "Groom X / Bride Y". Saving
  recalculates the dashboard and writes an activity-log row.
- **Your name**: edit display name.
- **Currency**: shown as LKR (read-only for v1).
- **Export / Reports** (read-only, generated on the client):
  - **Download CSV** — detailed data: expenses (with paid-so-far/remaining), all payments,
    all contributions.
  - **Download PDF summary** — a clean report: header + generated date, the dashboard
    summary (budget, spent, who-owes-whom, each side's position, leftover), then tables of
    expenses, payments, and contributions.
- **Sign out**.
- (Optional) list of archived items with a "restore" action (restore writes an activity-log
  row).

---

## Cross-cutting
- Confirm dialog before any delete (archive). Toasts on success/error.
- Empty states with a friendly hint and the add button. Loading skeletons while data loads.
- Everything obeys the mobile-first rules in `CLAUDE.md`.

---

## Parked for later (do NOT build in v1)
- Categories as their own managed table (v1 uses a text field with presets)
- Comments / discussion threads
- Per-side edit permissions
