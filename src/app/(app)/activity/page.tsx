import { createClient } from '@/lib/supabase/server'
import { ActivityView } from '@/components/activity/ActivityView'

const PAGE_SIZE = 20

export default async function ActivityPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .range(0, PAGE_SIZE - 1)

  const rows = data ?? []

  return (
    <ActivityView
      initialRows={rows}
      initialHasMore={rows.length === PAGE_SIZE}
    />
  )
}
