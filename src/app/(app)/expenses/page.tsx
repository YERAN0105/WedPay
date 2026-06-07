import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { toMinorUnits } from '@/lib/money'
import { ExpenseList } from '@/components/expenses/ExpenseList'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load non-archived expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  const expenseList = expenses ?? []

  // Load non-archived payments for those expenses to compute paid_so_far.
  // Rule: a payment counts only when both the payment AND its parent expense are non-archived.
  // Parent is already non-archived (filtered above), so we only filter payments.
  let paidByExpense: Record<string, number> = {}
  if (expenseList.length > 0) {
    const { data: pmts } = await supabase
      .from('payments')
      .select('expense_id, amount')
      .eq('is_archived', false)
      .in('expense_id', expenseList.map((e) => e.id))

    for (const p of pmts ?? []) {
      paidByExpense[p.expense_id] =
        (paidByExpense[p.expense_id] ?? 0) + toMinorUnits(p.amount)
    }
  }

  const expensesWithPaid = expenseList.map((e) => ({
    ...e,
    paid_paisa: paidByExpense[e.id] ?? 0,
  }))

  return <ExpenseList expenses={expensesWithPaid} />
}
