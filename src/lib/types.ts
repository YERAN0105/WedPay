import type { Tables } from './supabase/types'

// Expense row enriched with the pre-computed paid total (integer paisa).
// Passed from server pages into client components so paid_so_far is real
// without each client needing its own Supabase query.
export type ExpenseWithPaid = Tables<'expenses'> & { paid_paisa: number }
