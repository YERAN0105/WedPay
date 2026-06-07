import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase/types'

type LogInput = {
  entity_type: 'expense' | 'payment' | 'contribution' | 'settings'
  entity_id?: string | null
  action: 'created' | 'updated' | 'archived' | 'restored'
  summary: string
  created_by: string
  created_by_name: string
}

export async function logActivity(
  supabase: SupabaseClient<Database>,
  input: LogInput
): Promise<void> {
  await supabase.from('activity_log').insert({
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    action: input.action,
    summary: input.summary,
    created_by: input.created_by,
    created_by_name: input.created_by_name,
  })
}
