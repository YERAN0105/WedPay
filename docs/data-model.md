# docs/data-model.md — Database, storage, security, formulas

Supabase (Postgres). All money is `numeric(14,2)`. All tables use **Row Level Security**.
Soft delete via `is_archived`. The SQL migration at the bottom creates everything — run it
in the Supabase SQL editor.

---

## Tables

### profiles
One row per user, for display names.
| column | type | notes |
|---|---|---|
| id | uuid | PK, references `auth.users(id)` on delete cascade |
| display_name | text | not null |
| created_at | timestamptz | default now() |

### app_settings
Single row holding the split ratio and currency.
| column | type | notes |
|---|---|---|
| id | smallint | PK, fixed to 1 (`check (id = 1)`) |
| groom_percentage | int | not null default 50, `check (0..100)` |
| currency | text | not null default 'LKR' |
| updated_at | timestamptz | default now() |
| updated_by | uuid | references `auth.users(id)` |

### expenses
| column | type | notes |
|---|---|---|
| id | uuid | PK default `gen_random_uuid()` |
| name | text | not null |
| description | text | |
| expected_cost | numeric(14,2) | not null default 0, `check (>= 0)` |
| category | text | |
| vendor_name | text | |
| vendor_phone | text | |
| next_due_amount | numeric(14,2) | nullable |
| next_due_date | date | nullable |
| is_archived | boolean | not null default false |
| created_at | timestamptz | not null default now() |
| created_by | uuid | references `auth.users(id)` |
| created_by_name | text | snapshot of the adder's display name |

### payments
| column | type | notes |
|---|---|---|
| id | uuid | PK default `gen_random_uuid()` |
| expense_id | uuid | not null, references `expenses(id)` on delete cascade |
| amount | numeric(14,2) | not null, `check (>= 0)` |
| paid_on | date | not null default `current_date` |
| note | text | |
| receipt_path | text | path in the `receipts` storage bucket |
| is_archived | boolean | not null default false |
| created_at | timestamptz | not null default now() |
| created_by | uuid | references `auth.users(id)` |
| created_by_name | text | snapshot |

### contributions
| column | type | notes |
|---|---|---|
| id | uuid | PK default `gen_random_uuid()` |
| side | text | not null, `check (side in ('groom','bride'))` |
| amount | numeric(14,2) | not null, `check (>= 0)` |
| contributed_on | date | not null default `current_date` |
| note | text | |
| receipt_path | text | optional, in `receipts` bucket |
| is_archived | boolean | not null default false |
| created_at | timestamptz | not null default now() |
| created_by | uuid | references `auth.users(id)` |
| created_by_name | text | snapshot |

### activity_log  (append-only — for the Activity feed)
One row per recorded change. The app writes these inside its mutation functions.
| column | type | notes |
|---|---|---|
| id | uuid | PK default `gen_random_uuid()` |
| entity_type | text | not null, `check in ('expense','payment','contribution','settings')` |
| entity_id | uuid | nullable (null for settings) |
| action | text | not null, `check in ('created','updated','archived','restored')` |
| summary | text | not null, human-readable (e.g. "Added payment Rs 50,000.00 to Photographer") |
| created_at | timestamptz | not null default now() |
| created_by | uuid | references `auth.users(id)` |
| created_by_name | text | snapshot |

> Never edit or delete `activity_log` rows from the app. RLS allows only SELECT + INSERT.

---

## Storage
- One **private** bucket named `receipts`.
- Suggested object paths: `payments/<payment_id>/<filename>` and
  `contributions/<contribution_id>/<filename>`.
- Files are viewed/downloaded via **signed URLs** (never make the bucket public).
- Accept images (`image/*`) and `application/pdf`.

---

## Export (CSV / PDF) — no schema needed
Export reads the tables above and is generated entirely on the client. It does not require
any database change.

---

## Security (RLS) — model: any signed-in user can do everything
- Enable RLS on `profiles`, `app_settings`, `expenses`, `payments`, `contributions`,
  `activity_log`.
- `expenses`, `payments`, `contributions`, `app_settings`: authenticated users may
  SELECT / INSERT / UPDATE / DELETE all rows.
- `profiles`: authenticated users may read all rows (to show names); a user may insert /
  update only their own row (`id = auth.uid()`).
- `activity_log`: authenticated users may SELECT all and INSERT — **no** UPDATE / DELETE
  (append-only).
- Storage `receipts`: authenticated users may read/write objects in that bucket.
- Public (anon) role has **no** access anywhere.

---

## Derived values / formulas (recompute on the client or in a query; never store)
Use only rows where `is_archived = false`.

```
paid_so_far(expense)  = sum(payments.amount where expense_id = expense.id)
remaining(expense)    = max(0, expense.expected_cost - paid_so_far(expense))
status(expense)       = paid_so_far == 0            -> 'Not paid'
                        paid_so_far <  expected_cost -> 'Partly paid'
                        paid_so_far == expected_cost -> 'Fully paid'
                        paid_so_far >  expected_cost -> 'Overpaid'

total_budget       = sum(expenses.expected_cost)
total_spent        = sum(payments.amount)
total_contributed  = sum(contributions.amount)
groom_contributed  = sum(contributions.amount where side='groom')
bride_contributed  = sum(contributions.amount where side='bride')
still_to_pay       = sum over expenses of remaining(expense)

groom_ratio  = app_settings.groom_percentage / 100
bride_ratio  = 1 - groom_ratio
groom_fair_share = total_spent * groom_ratio
bride_fair_share = total_spent * bride_ratio
groom_balance = groom_contributed - groom_fair_share   // + overpaid, - underpaid
bride_balance = bride_contributed - bride_fair_share
leftover      = total_contributed - total_spent
```

"Who owes whom" logic is in `CLAUDE.md` section 3 — implement it exactly.

---

## SQL migration (run this in Supabase → SQL Editor)

```sql
-- Extensions (gen_random_uuid)
create extension if not exists pgcrypto;

-- profiles -------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- app_settings (single row) -------------------------------------------
create table if not exists public.app_settings (
  id               smallint primary key default 1 check (id = 1),
  groom_percentage int  not null default 50 check (groom_percentage between 0 and 100),
  currency         text not null default 'LKR',
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users(id)
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- expenses -------------------------------------------------------------
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  expected_cost   numeric(14,2) not null default 0 check (expected_cost >= 0),
  category        text,
  vendor_name     text,
  vendor_phone    text,
  next_due_amount numeric(14,2),
  next_due_date   date,
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id),
  created_by_name text
);
create index if not exists expenses_active_idx on public.expenses (is_archived);

-- payments -------------------------------------------------------------
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  expense_id      uuid not null references public.expenses(id) on delete cascade,
  amount          numeric(14,2) not null check (amount >= 0),
  paid_on         date not null default current_date,
  note            text,
  receipt_path    text,
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id),
  created_by_name text
);
create index if not exists payments_expense_idx on public.payments (expense_id);

-- contributions --------------------------------------------------------
create table if not exists public.contributions (
  id              uuid primary key default gen_random_uuid(),
  side            text not null check (side in ('groom','bride')),
  amount          numeric(14,2) not null check (amount >= 0),
  contributed_on  date not null default current_date,
  note            text,
  receipt_path    text,
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id),
  created_by_name text
);
create index if not exists contributions_side_idx on public.contributions (side);

-- activity_log (append-only) ------------------------------------------
create table if not exists public.activity_log (
  id              uuid primary key default gen_random_uuid(),
  entity_type     text not null check (entity_type in ('expense','payment','contribution','settings')),
  entity_id       uuid,
  action          text not null check (action in ('created','updated','archived','restored')),
  summary         text not null,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id),
  created_by_name text
);
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);

-- Row Level Security ---------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.app_settings  enable row level security;
alter table public.expenses      enable row level security;
alter table public.payments      enable row level security;
alter table public.contributions enable row level security;
alter table public.activity_log  enable row level security;

-- profiles: read all, write own
create policy "profiles_read"        on public.profiles for select to authenticated using (true);
create policy "profiles_insert_own"  on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own"  on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- core tables: any authenticated user can do all
create policy "settings_all"      on public.app_settings  for all to authenticated using (true) with check (true);
create policy "expenses_all"      on public.expenses      for all to authenticated using (true) with check (true);
create policy "payments_all"      on public.payments      for all to authenticated using (true) with check (true);
create policy "contributions_all" on public.contributions for all to authenticated using (true) with check (true);

-- activity_log: read + append only (no update/delete policy = those are denied)
create policy "activity_read"     on public.activity_log for select to authenticated using (true);
create policy "activity_insert"   on public.activity_log for insert to authenticated with check (true);
```

### Storage bucket + policies
Create the bucket in the dashboard (Storage → New bucket → name `receipts`, **not public**),
or run:

```sql
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts_read"   on storage.objects for select to authenticated using (bucket_id = 'receipts');
create policy "receipts_insert" on storage.objects for insert to authenticated with check (bucket_id = 'receipts');
create policy "receipts_update" on storage.objects for update to authenticated using (bucket_id = 'receipts');
create policy "receipts_delete" on storage.objects for delete to authenticated using (bucket_id = 'receipts');
```
