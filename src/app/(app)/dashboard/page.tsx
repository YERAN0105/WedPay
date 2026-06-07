import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { toMinorUnits, formatMoney } from '@/lib/money'

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-LK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

const ACTION_DOT: Record<string, string> = {
  created: 'bg-green-500',
  updated: 'bg-blue-500',
  archived: 'bg-gray-400',
  restored: 'bg-purple-500',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: settingsData },
    { data: expenses },
    { data: contributions },
    { data: recentActivity },
  ] = await Promise.all([
    supabase.from('app_settings').select('groom_percentage').eq('id', 1).single(),
    supabase.from('expenses').select('*').eq('is_archived', false),
    supabase.from('contributions').select('*').eq('is_archived', false),
    supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const groomPct = settingsData?.groom_percentage ?? 50
  const allExpenses = expenses ?? []
  const allContributions = contributions ?? []

  // Payment totals rule: only count payments whose parent expense is also non-archived
  const expenseIds = allExpenses.map(e => e.id)
  const allPayments =
    expenseIds.length > 0
      ? ((
          await supabase
            .from('payments')
            .select('amount, expense_id')
            .eq('is_archived', false)
            .in('expense_id', expenseIds)
        ).data ?? [])
      : []

  // ── Formulas (integer paisa) ──────────────────────────────────────────
  const totalBudgetPaisa = allExpenses.reduce(
    (s, e) => s + toMinorUnits(e.expected_cost),
    0,
  )
  const totalSpentPaisa = allPayments.reduce(
    (s, p) => s + toMinorUnits(p.amount),
    0,
  )
  const totalContributedPaisa = allContributions.reduce(
    (s, c) => s + toMinorUnits(c.amount),
    0,
  )
  const groomContributedPaisa = allContributions
    .filter(c => c.side === 'groom')
    .reduce((s, c) => s + toMinorUnits(c.amount), 0)
  const brideContributedPaisa = allContributions
    .filter(c => c.side === 'bride')
    .reduce((s, c) => s + toMinorUnits(c.amount), 0)

  // paid_so_far per expense (for still_to_pay)
  const paidByExpense: Record<string, number> = {}
  for (const p of allPayments) {
    paidByExpense[p.expense_id] =
      (paidByExpense[p.expense_id] ?? 0) + toMinorUnits(p.amount)
  }

  const stillToPayPaisa = allExpenses.reduce((s, e) => {
    const paid = paidByExpense[e.id] ?? 0
    return s + Math.max(0, toMinorUnits(e.expected_cost) - paid)
  }, 0)

  const groomRatio = groomPct / 100
  const brideRatio = 1 - groomRatio
  const groomFairSharePaisa = Math.round(totalSpentPaisa * groomRatio)
  const brideFairSharePaisa = Math.round(totalSpentPaisa * brideRatio)
  const groomBalancePaisa = groomContributedPaisa - groomFairSharePaisa
  const brideBalancePaisa = brideContributedPaisa - brideFairSharePaisa
  const leftoverPaisa = totalContributedPaisa - totalSpentPaisa

  const budgetPct =
    totalBudgetPaisa > 0
      ? Math.min(100, Math.round((totalSpentPaisa / totalBudgetPaisa) * 100))
      : 0

  // ── Who owes whom (exact logic from CLAUDE.md) ────────────────────────
  const isWarning = leftoverPaisa < 0
  const groomOwes = !isWarning && groomBalancePaisa < 0
  const brideOwes = !isWarning && !groomOwes && brideBalancePaisa < 0
  const showLeftoverNote = leftoverPaisa > 0 && (groomOwes || brideOwes)

  // ── Upcoming payments ─────────────────────────────────────────────────
  const upcoming = allExpenses
    .filter((e): e is typeof e & { next_due_date: string } => !!e.next_due_date)
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
    .slice(0, 5)

  // ── Spending by category ──────────────────────────────────────────────
  const expenseMap: Record<string, (typeof allExpenses)[0]> = {}
  for (const e of allExpenses) expenseMap[e.id] = e

  const categoryMap: Record<string, number> = {}
  for (const p of allPayments) {
    const cat = expenseMap[p.expense_id]?.category || 'Uncategorized'
    categoryMap[cat] = (categoryMap[cat] ?? 0) + toMinorUnits(p.amount)
  }
  const categoryBreakdown = Object.entries(categoryMap).sort(([, a], [, b]) => b - a)
  const maxCat = categoryBreakdown[0]?.[1] ?? 1

  // ── Side card config ──────────────────────────────────────────────────
  const sides = [
    {
      label: "Groom's side",
      contributed: groomContributedPaisa,
      fairShare: groomFairSharePaisa,
      balance: groomBalancePaisa,
      pct: groomPct,
    },
    {
      label: "Bride's side",
      contributed: brideContributedPaisa,
      fairShare: brideFairSharePaisa,
      balance: brideBalancePaisa,
      pct: 100 - groomPct,
    },
  ]

  return (
    <div className="px-4 py-4 space-y-3 pb-8">

      {/* 1. Who owes whom — hero card */}
      {isWarning ? (
        <div className="rounded-3xl p-5 bg-amber-50 border border-amber-100"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-2">
            Attention needed
          </p>
          <p className="text-sm text-amber-800 leading-relaxed">
            Recorded contributions are{' '}
            <span className="font-bold">{formatMoney(Math.abs(leftoverPaisa))}</span> less
            than recorded spending — a payment may not yet be recorded as a contribution.
          </p>
        </div>
      ) : (groomOwes || brideOwes) ? (
        <div className="rounded-3xl p-5 text-white"
          style={{
            background: 'linear-gradient(135deg, #9f1239 0%, #be123c 60%, #e11d48 100%)',
            boxShadow: '0 4px 20px rgba(190,18,60,0.35)',
          }}>
          <p className="text-xs font-bold uppercase tracking-widest text-rose-200 mb-3">
            Who owes whom
          </p>
          <p className="text-sm text-rose-100 mb-1">
            {groomOwes ? "Groom's side owes Bride's side" : "Bride's side owes Groom's side"}
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {formatMoney(Math.abs(groomOwes ? groomBalancePaisa : brideBalancePaisa))}
          </p>
          {showLeftoverNote && (
            <p className="text-xs text-rose-200 mt-3 leading-relaxed">
              Plus {formatMoney(leftoverPaisa)} already paid toward future expenses.
            </p>
          )}
        </div>
      ) : totalSpentPaisa === 0 && totalContributedPaisa === 0 ? (
        <div className="rounded-3xl p-5 bg-stone-50 border border-stone-100"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
            Who owes whom
          </p>
          <p className="text-xl font-bold text-stone-500">No data yet.</p>
          <p className="text-xs text-stone-400 mt-1">Add expenses and contributions to see the balance.</p>
        </div>
      ) : (
        <div className="rounded-3xl p-5 bg-emerald-50 border border-emerald-100"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">
            Who owes whom
          </p>
          <p className="text-xl font-bold text-emerald-700">All settled up. ✓</p>
          {leftoverPaisa > 0 && (
            <p className="text-xs text-emerald-600 mt-1">
              {formatMoney(leftoverPaisa)} already paid in toward future expenses.
            </p>
          )}
        </div>
      )}

      {/* 2. Budget vs spent */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100"
        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-4 rounded-full bg-rose-600 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Budget overview</p>
        </div>
        {/* Big percentage + stat grid */}
        <div className="flex items-end gap-4 mb-4">
          <div>
            <p className="text-5xl font-black text-stone-900 leading-none">{budgetPct}<span className="text-2xl text-stone-400 font-bold">%</span></p>
            <p className="text-xs text-stone-400 mt-1">of budget spent</p>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 pb-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Budget</p>
              <p className="text-sm font-bold text-stone-800 mt-0.5">{formatMoney(totalBudgetPaisa)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Spent</p>
              <p className="text-sm font-bold text-stone-800 mt-0.5">{formatMoney(totalSpentPaisa)}</p>
            </div>
          </div>
        </div>
        {/* Gradient progress bar */}
        <div className="h-3 rounded-full bg-stone-100 overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${budgetPct}%`,
              background: 'linear-gradient(90deg, #9f1239, #e11d48)',
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-400">{formatMoney(totalSpentPaisa)} spent so far</p>
          <div className="text-right">
            <p className="text-xs text-stone-400">Still to pay</p>
            <p className="text-sm font-bold text-stone-700">{formatMoney(stillToPayPaisa)}</p>
          </div>
        </div>
      </div>

      {/* 3. Each side's position */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="w-1 h-4 rounded-full bg-rose-600 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest text-stone-500">
            Each side · Split {groomPct} / {100 - groomPct}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {sides.map(({ label, contributed, fairShare, balance, pct }) => {
            const overpaid = balance > 0
            const even = balance === 0
            const balLabel = overpaid
              ? `+${formatMoney(balance)}`
              : even ? 'Even'
              : `−${formatMoney(Math.abs(balance))}`
            return (
              <div key={label} className="bg-white rounded-2xl p-4 border border-stone-100"
                style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                <p className="text-xs font-bold text-stone-500 mb-3">{label} ({pct}%)</p>
                <div className="space-y-2 mb-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Contributed</p>
                    <p className="text-sm font-bold text-stone-900">{formatMoney(contributed)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Fair share</p>
                    <p className="text-sm font-bold text-stone-900">{formatMoney(fairShare)}</p>
                  </div>
                </div>
                <div className={`rounded-xl px-2.5 py-1.5 ${
                  overpaid ? 'bg-emerald-50' : even ? 'bg-stone-50' : 'bg-amber-50'
                }`}>
                  <p className={`text-xs font-bold ${
                    overpaid ? 'text-emerald-700' : even ? 'text-stone-500' : 'text-amber-700'
                  }`}>
                    {overpaid ? 'Overpaid ' : even ? '' : 'Underpaid '}{balLabel}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. Leftover (only when >0 and not already mentioned in settled card) */}
      {leftoverPaisa > 0 && !(!isWarning && !groomOwes && !brideOwes) && (
        <div className="bg-sky-50 rounded-2xl border border-sky-100 p-4"
          style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-sky-500 mb-1">Leftover</p>
          <p className="text-lg font-bold text-sky-700">{formatMoney(leftoverPaisa)}</p>
          <p className="text-xs text-sky-500 mt-0.5">contributed but not yet spent</p>
        </div>
      )}

      {/* 5. Upcoming payments */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-stone-100"
          style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-rose-600 shrink-0" />
            <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Upcoming payments</p>
          </div>
          <div className="divide-y divide-stone-50">
            {upcoming.map(e => (
              <Link
                key={e.id}
                href={`/expenses/${e.id}`}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 active:opacity-70"
              >
                <div className="min-w-0 mr-2">
                  <p className="text-sm font-semibold text-stone-800 truncate">{e.name}</p>
                  <p className="text-xs text-stone-400">{formatDate(e.next_due_date)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {e.next_due_amount && (
                    <p className="text-sm font-bold text-stone-700">
                      {formatMoney(toMinorUnits(e.next_due_amount))}
                    </p>
                  )}
                  <span className="text-stone-300 text-sm">›</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 6. Spending by category */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-stone-100"
          style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 rounded-full bg-rose-600 shrink-0" />
            <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Spending by category</p>
          </div>
          <div className="space-y-3.5">
            {categoryBreakdown.map(([cat, amount]) => (
              <div key={cat}>
                <div className="flex justify-between mb-1.5">
                  <p className="text-sm font-semibold text-stone-700">{cat}</p>
                  <p className="text-sm font-bold text-stone-900">{formatMoney(amount)}</p>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((amount / maxCat) * 100)}%`,
                      background: 'linear-gradient(90deg, #be123c, #e11d48)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state — no data yet */}
      {allExpenses.length === 0 && allContributions.length === 0 && (
        <div className="text-center py-8 px-4">
          <p className="text-4xl mb-3">💍</p>
          <p className="font-semibold text-stone-700 mb-1">Nothing here yet</p>
          <p className="text-sm text-stone-400">Add expenses and contributions to see your summary.</p>
        </div>
      )}

      {/* 7. Recent activity */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100"
        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-rose-600 shrink-0" />
            <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Recent activity</p>
          </div>
          <Link href="/activity" className="text-xs font-bold text-rose-700">
            View all →
          </Link>
        </div>
        {(recentActivity ?? []).length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-4">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {(recentActivity ?? []).map(row => (
              <div key={row.id} className="flex items-start gap-3">
                <div
                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${ACTION_DOT[row.action] ?? 'bg-stone-300'}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-700 leading-snug">{row.summary}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {row.created_by_name ?? 'Unknown'} · {timeAgo(row.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
