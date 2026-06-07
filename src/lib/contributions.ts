'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from './supabase/server'
import { logActivity } from './activity'
import { formatMoney, toMinorUnits } from './money'

export type ContributionFormData = {
  side: 'groom' | 'bride'
  amount: string
  contributed_on: string
  note: string
}

export type ActionResult = { success: true } | { error: string }
export type CreateContributionResult = { success: true; id: string } | { error: string }

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

function sideLabel(side: 'groom' | 'bride') {
  return side === 'groom' ? "Groom's side" : "Bride's side"
}

export async function createContribution(
  data: ContributionFormData
): Promise<CreateContributionResult> {
  const supabase = await createClient()
  const actor = await getActor(supabase)

  const { data: contribution, error } = await supabase
    .from('contributions')
    .insert({
      side: data.side,
      amount: data.amount,
      contributed_on: data.contributed_on,
      note: data.note.trim() || null,
      created_by: actor.id,
      created_by_name: actor.name,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logActivity(supabase, {
    entity_type: 'contribution',
    entity_id: contribution.id,
    action: 'created',
    summary: `Added contribution ${formatMoney(toMinorUnits(data.amount))} (${sideLabel(data.side)})`,
    created_by: actor.id,
    created_by_name: actor.name,
  })

  revalidatePath('/contributions')
  return { success: true, id: contribution.id }
}

export async function setContributionReceipt(
  id: string,
  receiptPath: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contributions')
    .update({ receipt_path: receiptPath })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/contributions')
  return { success: true }
}

export async function updateContribution(
  id: string,
  data: ContributionFormData,
  prevAmount: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const actor = await getActor(supabase)

  const { error } = await supabase
    .from('contributions')
    .update({
      amount: data.amount,
      contributed_on: data.contributed_on,
      note: data.note.trim() || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  const amountChanged = toMinorUnits(data.amount) !== toMinorUnits(prevAmount)
  const summary = amountChanged
    ? `Changed contribution ${formatMoney(toMinorUnits(prevAmount))} → ${formatMoney(toMinorUnits(data.amount))} (${sideLabel(data.side)})`
    : `Updated contribution ${formatMoney(toMinorUnits(data.amount))} (${sideLabel(data.side)})`

  await logActivity(supabase, {
    entity_type: 'contribution',
    entity_id: id,
    action: 'updated',
    summary,
    created_by: actor.id,
    created_by_name: actor.name,
  })

  revalidatePath('/contributions')
  return { success: true }
}

export async function archiveContribution(
  id: string,
  amount: string,
  side: 'groom' | 'bride'
): Promise<ActionResult> {
  const supabase = await createClient()
  const actor = await getActor(supabase)

  const { error } = await supabase
    .from('contributions')
    .update({ is_archived: true })
    .eq('id', id)

  if (error) return { error: error.message }

  await logActivity(supabase, {
    entity_type: 'contribution',
    entity_id: id,
    action: 'archived',
    summary: `Archived contribution ${formatMoney(toMinorUnits(amount))} (${sideLabel(side)})`,
    created_by: actor.id,
    created_by_name: actor.name,
  })

  revalidatePath('/contributions')
  return { success: true }
}

export async function restoreContribution(
  id: string,
  amount: string,
  side: 'groom' | 'bride'
): Promise<ActionResult> {
  const supabase = await createClient()
  const actor = await getActor(supabase)

  const { error } = await supabase
    .from('contributions')
    .update({ is_archived: false })
    .eq('id', id)

  if (error) return { error: error.message }

  await logActivity(supabase, {
    entity_type: 'contribution',
    entity_id: id,
    action: 'restored',
    summary: `Restored contribution ${formatMoney(toMinorUnits(amount))} (${sideLabel(side)})`,
    created_by: actor.id,
    created_by_name: actor.name,
  })

  revalidatePath('/contributions')
  return { success: true }
}
