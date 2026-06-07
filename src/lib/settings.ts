'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'
import { logActivity } from './activity'

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

export async function updateSplitRatio(newPct: number): Promise<ActionResult> {
  if (!Number.isInteger(newPct) || newPct < 0 || newPct > 100) {
    return { error: 'Split must be a whole number between 0 and 100.' }
  }

  const supabase = await createClient()
  const actor = await getActor(supabase)

  const { error } = await supabase
    .from('app_settings')
    .update({
      groom_percentage: newPct,
      updated_at: new Date().toISOString(),
      updated_by: actor.id,
    })
    .eq('id', 1)
  if (error) return { error: error.message }

  await logActivity(supabase, {
    entity_type: 'settings',
    entity_id: null,
    action: 'updated',
    summary: `Changed split to Groom ${newPct} / Bride ${100 - newPct}`,
    created_by: actor.id,
    created_by_name: actor.name,
  })

  revalidatePath('/dashboard')
  revalidatePath('/settings')
  return { success: true }
}

export async function updateDisplayName(newName: string): Promise<ActionResult> {
  const trimmed = newName.trim()
  if (trimmed.length < 2) return { error: 'Name must be at least 2 characters.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: trimmed })
    .eq('id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
