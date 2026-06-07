import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsView } from '@/components/settings/SettingsView'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: settings }, { data: profile }] = await Promise.all([
    supabase.from('app_settings').select('groom_percentage').eq('id', 1).single(),
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
  ])

  return (
    <SettingsView
      currentSplitPct={settings?.groom_percentage ?? 50}
      currentDisplayName={profile?.display_name ?? ''}
    />
  )
}
