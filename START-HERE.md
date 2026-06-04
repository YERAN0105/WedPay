# START-HERE.md — Your step-by-step guide (WedPay)

This is for **you** (the human). It walks you from empty folder to a live app. You already
built an app this way before, so this is mostly familiar — the spec files do the heavy
lifting.

**v1 now includes** everything we discussed plus the **Activity feed** (a full history of
who changed what) and **CSV + PDF export** of the full summary.

---

## What you have
- `CLAUDE.md` — project memory (goes in the project root)
- `docs/spec.md`, `docs/data-model.md`, `docs/build-plan.md` — the detailed spec
- `PROMPTS.md` — the prompts you paste into Claude Code (this file is just for you)
- `START-HERE.md` — this guide (just for you)

(No extra files were added for the new features — the activity log lives in the same
database migration, and export is generated in the app.)

---

## Step 1 — Make accounts (free tiers are fine)
1. A **Supabase** account → create a new project. Note its **Project URL** and **anon
   public key** (Project Settings → API).
2. A **Vercel** account (for deploy later).
3. A **GitHub** account (Vercel deploys from a repo).

## Step 2 — Install Claude Code (skip if you already have it)
- Easiest (no Node needed), Mac/Linux/WSL:
  `curl -fsSL https://claude.ai/install.sh | bash`
  Windows PowerShell: `irm https://claude.ai/install.ps1 | iex`
- Or via npm (needs Node.js 18+): `npm install -g @anthropic-ai/claude-code`
- You need a paid Claude plan (Pro or Max) or API access to use it.

## Step 3 — Set up the project folder
1. Make an empty folder, e.g. `wedpay`.
2. Put **`CLAUDE.md`** in the folder root.
3. Make a **`docs`** subfolder and put the three `docs/*.md` files inside it.
4. Keep `PROMPTS.md` handy (in the folder is fine — it won't affect the build).
   Final layout:
   ```
   wedpay/
     CLAUDE.md
     PROMPTS.md
     docs/
       spec.md
       data-model.md
       build-plan.md
   ```

## Step 4 — Start Claude Code
1. Open a terminal **inside** the `wedpay` folder.
2. Run: `claude`
3. It automatically reads `CLAUDE.md`. (If it asks to trust the folder, say yes.)

## Step 5 — Run the prompts, one at a time
1. Open `PROMPTS.md`. Paste **Prompt 0** first and read its plan/questions.
2. If the plan looks right, send **Prompt 1**, then 2, 3, … in order (there are 13 prompts:
   Prompt 0 plus one per phase, ending with deploy).
3. After each phase, **test it** on a real phone (or your browser's mobile view) using the
   steps Claude Code gives you, before continuing.
4. If something's wrong, use the "has a problem" extra prompt and describe what you saw.

## Step 6 — When Phase 1 asks about Supabase
- Open your Supabase project → **SQL Editor** → paste and run the SQL Claude Code gives you
  (it matches `docs/data-model.md` and includes the `activity_log` table).
- Create the **`receipts`** bucket: Storage → New bucket → name `receipts` → **uncheck
  Public** → create. Then run the storage policies from the SQL.
- Put your Supabase URL and anon key in `.env.local` when Claude Code asks (it will tell
  you the exact variable names).

## Step 7 — Invite your families (no public sign-up)
In Supabase → **Authentication**:
- Turn **off** public sign-ups (Providers/Settings).
- Add each family member: **Add user** (or send an invite). They set a password, then log
  in. On first login the app asks each person for their display name.
- Everyone who's added can view and edit everything — and every change they make shows up
  in the Activity feed with their name.

## Step 8 — Deploy (Phase 11)
1. Push the project to a **GitHub** repo (Claude Code can do the git steps).
2. In **Vercel**: New Project → import that repo.
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) → Deploy.
4. In Supabase → Authentication → URL settings, set your Vercel URL as the **Site URL** /
   redirect URL.
5. Open the live link on your phone, log in, and you're done.

---

## Tips
- **Don't skip Prompt 0.** Catching a misunderstanding before any code is written saves
  hours.
- **One phase at a time.** If Claude Code tries to do several at once, tell it to stop and
  do only the current phase.
- **Receipts are private.** The bucket must be non-public; the app shows them via signed
  links. Don't make it public.
- **The activity feed is append-only** by design (it can't be edited or deleted in the
  app), so it stays trustworthy for both families.
- **The money rule that matters most:** a *contribution* is a side's **own-pocket** money.
  Money one side is just holding for the other is **not** a contribution. If a total ever
  looks wrong, this is almost always why.
- Keep `.env.local` out of git (Claude Code will git-ignore it — double-check).
