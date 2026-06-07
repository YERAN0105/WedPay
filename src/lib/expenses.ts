'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from './supabase/server'
import { logActivity } from './activity'
import { formatMoney, toMinorUnits } from './money'

export type ExpenseFormData = {
  name: string
  description: string
  expected_cost: string
  category: string
  vendor_name: string
  vendor_phone: string
  next_due_amount: string
  next_due_date: string
}

export type ActionResult = { success: true } | { error: string }

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

function cleanData(data: ExpenseFormData) {
  return {
    name: data.name.trim(),
    description: data.description.trim() || null,
    expected_cost: data.expected_cost,
    category: data.category.trim() || null,
    vendor_name: data.vendor_name.trim() || null,
    vendor_phone: data.vendor_phone.trim() || null,
    next_due_amount: data.next_due_amount || null,
    next_due_date: data.next_due_date || null,
  }
}

export async function createExpense(data: ExpenseFormData): Promise<ActionResult> {
  const supabase = await createClient()
  const actor = await getActor(supabase)
  const clean = cleanData(data)

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({ ...clean, created_by: actor.id, created_by_name: actor.name })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logActivity(supabase, {
    entity_type: 'expense',
    entity_id: expense.id,
    action: 'created',
    summary: `Added expense ${clean.name} (${formatMoney(toMinorUnits(clean.expected_cost))})`,
    created_by: actor.id,
    created_by_name: actor.name,
  })

  revalidatePath('/expenses')
  return { success: true }
}

export async function updateExpense(
  id: string,
  data: ExpenseFormData,
  prevCost: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const actor = await getActor(supabase)
  const clean = cleanData(data)

  const { error } = await supabase.from('expenses').update(clean).eq('id', id)
  if (error) return { error: error.message }

  const costChanged = toMinorUnits(data.expected_cost) !== toMinorUnits(prevCost)
  const summary = costChanged
    ? `Changed ${clean.name} expected cost ${formatMoney(toMinorUnits(prevCost))} → ${formatMoney(toMinorUnits(data.expected_cost))}`
    : `Updated expense ${clean.name}`

  await logActivity(supabase, {
    entity_type: 'expense',
    entity_id: id,
    action: 'updated',
    summary,
    created_by: actor.id,
    created_by_name: actor.name,
  })

  revalidatePath('/expenses')
  revalidatePath(`/expenses/${id}`)
  return { success: true }
}

export async function archiveExpense(id: string, name: string): Promise<ActionResult> {
  const supabase = await createClient()
  const actor = await getActor(supabase)

  const { error } = await supabase
    .from('expenses')
    .update({ is_archived: true })
    .eq('id', id)

  if (error) return { error: error.message }

  await logActivity(supabase, {
    entity_type: 'expense',
    entity_id: id,
    action: 'archived',
    summary: `Archived expense ${name}`,
    created_by: actor.id,
    created_by_name: actor.name,
  })

  revalidatePath('/expenses')
  revalidatePath(`/expenses/${id}`)
  return { success: true }
}

export async function restoreExpense(id: string, name: string): Promise<ActionResult> {
  const supabase = await createClient()
  const actor = await getActor(supabase)

  const { error } = await supabase
    .from('expenses')
    .update({ is_archived: false })
    .eq('id', id)

  if (error) return { error: error.message }

  await logActivity(supabase, {
    entity_type: 'expense',
    entity_id: id,
    action: 'restored',
    summary: `Restored expense ${name}`,
    created_by: actor.id,
    created_by_name: actor.name,
  })

  revalidatePath('/expenses')
  revalidatePath(`/expenses/${id}`)
  return { success: true }
}
