'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from './supabase/server'
import { logActivity } from './activity'
import { formatMoney, toMinorUnits } from './money'

export type PaymentFormData = {
  amount: string
  paid_on: string
  note: string
}

export type ActionResult = { success: true } | { error: string }
export type CreatePaymentResult = { success: true; id: string } | { error: string }

async function getActor(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  return { id: user.id, name: profile?.display_name ?? 'Unknown' }
}

export async function createPayment(
  expenseId: string,
  expenseName: string,
  data: PaymentFormData
): Promise<CreatePaymentResult> {
  const supabase = await createClient()
  const actor = await getActor(supabase)

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      expense_id: expenseId,
      amount: data.amount,
      paid_on: data.paid_on,
      note: data.note.trim() || null,
      created_by: actor.id,
      created_by_name: actor.name,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logActivity(supabase, {
    entity_type: 'payment',
    entity_id: payment.id,
    action: 'created',
    summary: `Added payment ${formatMoney(toMinorUnits(data.amount))} to ${expenseName}`,
    created_by: actor.id,
    created_by_name: actor.name,
  })

  revalidatePath('/expenses')
  revalidatePath(`/expenses/${expenseId}`)
  return { success: true, id: payment.id }
}

// Called after the client uploads the file to storage.
export async function setPaymentReceipt(
  id: string,
  expenseId: string,
  receiptPath: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('payments')
    .update({ receipt_path: receiptPath })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/expenses/${expenseId}`)
  return { success: true }
}

export async function updatePayment(
  id: string,
  expenseId: string,
  expenseName: string,
  data: PaymentFormData,
  prevAmount: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const actor = await getActor(supabase)

  const { error } = await supabase
    .from('payments')
    .update({
      amount: data.amount,
      paid_on: data.paid_on,
      note: data.note.trim() || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  const amountChanged = toMinorUnits(data.amount) !== toMinorUnits(prevAmount)
  const summary = amountChanged
    ? `Changed payment ${formatMoney(toMinorUnits(prevAmount))} → ${formatMoney(toMinorUnits(data.amount))} on ${expenseName}`
    : `Updated payment ${formatMoney(toMinorUnits(data.amount))} on ${expenseName}`

  await logActivity(supabase, {
    entity_type: 'payment',
    entity_id: id,
    action: 'updated',
    summary,
    created_by: actor.id,
    created_by_name: actor.name,
  })

  revalidatePath('/expenses')
  revalidatePath(`/expenses/${expenseId}`)
  return { success: true }
}

export async function archivePayment(
  id: string,
  expenseId: string,
  expenseName: string,
  amount: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const actor = await getActor(supabase)

  const { error } = await supabase
    .from('payments')
    .update({ is_archived: true })
    .eq('id', id)

  if (error) return { error: error.message }

  await logActivity(supabase, {
    entity_type: 'payment',
    entity_id: id,
    action: 'archived',
    summary: `Archived payment ${formatMoney(toMinorUnits(amount))} on ${expenseName}`,
    created_by: actor.id,
    created_by_name: actor.name,
  })

  revalidatePath('/expenses')
  revalidatePath(`/expenses/${expenseId}`)
  return { success: true }
}

export async function restorePayment(
  id: string,
  expenseId: string,
  expenseName: string,
  amount: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const actor = await getActor(supabase)

  const { error } = await supabase
    .from('payments')
    .update({ is_archived: false })
    .eq('id', id)

  if (error) return { error: error.message }

  await logActivity(supabase, {
    entity_type: 'payment',
    entity_id: id,
    action: 'restored',
    summary: `Restored payment ${formatMoney(toMinorUnits(amount))} on ${expenseName}`,
    created_by: actor.id,
    created_by_name: actor.name,
  })

  revalidatePath('/expenses')
  revalidatePath(`/expenses/${expenseId}`)
  return { success: true }
}
