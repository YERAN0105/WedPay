import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, toMinorUnits, expenseStatus } from '@/lib/money'
import { ExpenseDetailActions } from '@/components/expenses/ExpenseDetailActions'
import { PaymentList } from '@/components/payments/PaymentList'

const STATUS_COLORS: Record<string, string> = {
  'Not paid': 'bg-gray-100 text-gray-600',
  'Partly paid': 'bg-amber-100 text-amber-700',
  'Fully paid': 'bg-green-100 text-green-700',
  'Overpaid': 'bg-blue-100 text-blue-700',
}

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load expense (any archive state — detail page shows archived too)
  const { data: expense } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single()

  if (!expense) notFound()

  // Load non-archived payments, newest first
  const { data: paymentsData } = await supabase
    .from('payments')
    .select('*')
    .eq('expense_id', id)
    .eq('is_archived', false)
    .order('paid_on', { ascending: false })

  const payments = paymentsData ?? []

  // paid_so_far: only non-archived payments (parent expense archive state
  // doesn't affect per-expense display — it affects global totals only)
  const paidPaisa = payments.reduce((sum, p) => sum + toMinorUnits(p.amount), 0)

  const costPaisa = toMinorUnits(expense.expected_cost)
  const remainingPaisa = Math.max(0, costPaisa - paidPaisa)
  const status = expenseStatus(paidPaisa, costPaisa)
  const pct = costPaisa > 0 ? Math.min(100, Math.round((paidPaisa / costPaisa) * 100)) : 0

  return (
    <div className="pb-8">
      {/* Back */}
      <div className="px-4 pt-4">
        <Link
          href="/expenses"
          className="inline-flex items-center gap-1 text-sm text-rose-600 min-h-[44px]"
        >
          ← Expenses
        </Link>
      </div>

      {/* Archived banner */}
      {expense.is_archived && (
        <div className="mx-4 mt-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700">
          This expense is archived and excluded from all totals.
        </div>
      )}

      {/* Header card */}
      <div className="mx-4 mt-3 bg-white rounded-2xl border border-stone-100 p-4"
        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl font-bold text-gray-900 flex-1 leading-snug">
            {expense.name}
          </h2>
          <span
            className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[status]}`}
          >
            {status}
          </span>
        </div>

        {expense.category && (
          <span className="inline-block mt-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {expense.category}
          </span>
        )}

        {expense.description && (
          <p className="mt-2 text-sm text-gray-600">{expense.description}</p>
        )}

        {/* Vendor */}
        {(expense.vendor_name || expense.vendor_phone) && (
          <div className="mt-3 pt-3 border-t border-gray-50 space-y-0.5">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Vendor</p>
            {expense.vendor_name && (
              <p className="font-medium text-gray-800 text-sm">{expense.vendor_name}</p>
            )}
            {expense.vendor_phone && (
              <a
                href={`tel:${expense.vendor_phone}`}
                className="flex items-center text-rose-600 text-sm font-medium min-h-[44px]"
              >
                📞 {expense.vendor_phone}
              </a>
            )}
          </div>
        )}

        {/* Money summary */}
        <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-400">Budget</p>
            <p className="font-semibold text-gray-800 text-sm mt-0.5">{formatMoney(costPaisa)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Paid</p>
            <p className="font-semibold text-gray-800 text-sm mt-0.5">{formatMoney(paidPaisa)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Remaining</p>
            <p className="font-semibold text-gray-800 text-sm mt-0.5">
              {formatMoney(remainingPaisa)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Next due */}
        {expense.next_due_date && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Next payment due</p>
            <p className="text-sm font-medium text-gray-800 mt-0.5">
              {expense.next_due_date}
              {expense.next_due_amount &&
                ` · ${formatMoney(toMinorUnits(expense.next_due_amount))}`}
            </p>
          </div>
        )}

        <p className="mt-3 text-xs text-gray-400">
          Added by {expense.created_by_name ?? 'Unknown'}
        </p>
      </div>

      {/* Edit / Archive / Restore */}
      <ExpenseDetailActions expense={expense} />

      {/* Payments */}
      <div className="mx-4 mt-6">
        <PaymentList
          payments={payments}
          expenseId={expense.id}
          expenseName={expense.name}
        />
      </div>
    </div>
  )
}
