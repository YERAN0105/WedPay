# PROMPTS.md — Copy/paste these into Claude Code, in order

Run **one prompt at a time**. After each, read Claude Code's summary, test it using the
steps it gives you, and only then send the next prompt. If something is off, tell it what
you saw in plain words before moving on.

The spec files (`CLAUDE.md`, `docs/spec.md`, `docs/data-model.md`, `docs/build-plan.md`)
are already in the project, so you do **not** paste their contents — just point to them.

---

### Prompt 0 — Understand first (no coding yet)
```
Read CLAUDE.md and every file in docs/ fully. Do not write any code yet.
Then tell me, in simple words:
1) Your understanding of the money model and the "who owes whom" rule.
2) How activity logging works and which actions get logged.
3) The phase plan and what Phase 0 will produce.
4) Any questions or anything in the spec that is unclear or could cause bugs.
Wait for me to say "go" before coding.
```

### Prompt 1 — Phase 0: setup
```
Go. Do Phase 0 from docs/build-plan.md only. Follow the mobile-first and stack rules in
CLAUDE.md, including a header with room for an Activity (history) icon. When done, summarize
what you changed and give me exact steps to test it on a phone-width screen, then stop.
```

### Prompt 2 — Phase 1: database
```
Do Phase 1 from docs/build-plan.md. Give me the final SQL to run in Supabase (matching
docs/data-model.md, including the activity_log table and its append-only policies), tell me
exactly where to click to create the private "receipts" bucket and its policies, then wire
up the generated types. Summarize and stop.
```

### Prompt 3 — Phase 2: auth + name
```
Do Phase 2 (auth + first-login display name) from docs/build-plan.md, using @supabase/ssr
so sessions survive refresh. Summarize and give me test steps, then stop.
```

### Prompt 4 — Phase 3: expenses
```
Do Phase 3 (expenses, no payments yet) from docs/build-plan.md and docs/spec.md. Include
add/edit in a bottom sheet, soft-delete with confirm, search/sort/filter, AND write an
activity_log row on create/edit/archive/restore per CLAUDE.md section 7. Summarize and give
phone test steps, then stop.
```

### Prompt 5 — Phase 4: payments + receipts
```
Do Phase 4 (payments + receipts) from docs/build-plan.md and docs/spec.md. Receipts go to
the private bucket and open via signed URLs. Recompute paid-so-far, remaining, and the
status badge, and write activity_log rows. Summarize and give test steps, then stop.
```

### Prompt 6 — Phase 5: contributions
```
Do Phase 5 (contributions) from docs/build-plan.md and docs/spec.md. Keep it completely
separate from payments — no links or auto-fill. Show per-side totals and "own pocket"
helper text, and write activity_log rows. Summarize and give test steps, then stop.
```

### Prompt 7 — Phase 6: dashboard
```
Do Phase 6 (dashboard) from docs/build-plan.md. Use only the formulas in
docs/data-model.md and the exact "who owes whom" logic in CLAUDE.md, and include the
"Recent activity" card. Then verify against the worked example in CLAUDE.md and show me the
numbers it produces. Summarize and stop.
```

### Prompt 8 — Phase 7: settings
```
Do Phase 7 (settings: editable split ratio, display name, currency, sign out) from
docs/build-plan.md. Log the ratio change to activity_log and confirm changing the ratio
updates the dashboard. Summarize and stop.
```

### Prompt 9 — Phase 8: activity feed
```
Do Phase 8 (the full Activity screen) from docs/build-plan.md and docs/spec.md. Newest
first, paginated, filter by type, reachable from the Dashboard "View all" and the header
history icon. Confirm earlier actions show up with correct summaries and names. Summarize
and stop.
```

### Prompt 10 — Phase 9: export (CSV + PDF)
```
Do Phase 9 (Export / Reports in Settings) from docs/build-plan.md and docs/spec.md. CSV of
the detailed data, plus a clean PDF summary generated on the client. Confirm both downloads
match the on-screen numbers. Summarize and stop.
```

### Prompt 11 — Phase 10: polish + mobile QA
```
Do Phase 10 (polish + mobile QA) from docs/build-plan.md. Empty states, loading, toasts,
confirm-before-delete, Rs formatting everywhere, and a PWA manifest + icons. Re-check every
mobile rule in CLAUDE.md at 360px width. Summarize and stop.
```

### Prompt 12 — Phase 11: deploy
```
Do Phase 11 (deploy) from docs/build-plan.md. Make sure secrets are git-ignored, then give
me a numbered checklist to push to GitHub, import to Vercel, set the Supabase env vars, and
configure Supabase Auth (disable public sign-up, set the live URL). Keep it simple.
```

---

### Handy extra prompts (use anytime)
```
That phase has a problem: <describe exactly what you saw on the screen>. Fix it, keep it
mobile-first per CLAUDE.md, then tell me what changed and how to re-test.
```
```
Before the next phase, double-check this phase against docs/spec.md and CLAUDE.md and list
anything missing or wrong.
```
