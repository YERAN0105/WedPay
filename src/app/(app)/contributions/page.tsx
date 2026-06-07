import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { toMinorUnits } from '@/lib/money'
import { ContributionsView } from '@/components/contributions/ContributionsView'

export default async function ContributionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: contributions } = await supabase
    .from('contributions')
    .select('*')
    .eq('is_archived', false)
    .order('contributed_on', { ascending: false })

  const all = contributions ?? []
  const groom = all.filter((c) => c.side === 'groom')
  const bride = all.filter((c) => c.side === 'bride')

  const groomTotal = groom.reduce((sum, c) => sum + toMinorUnits(c.amount), 0)
  const brideTotal = bride.reduce((sum, c) => sum + toMinorUnits(c.amount), 0)

  return (
    <ContributionsView
      groomContributions={groom}
      brideContributions={bride}
      groomTotal={groomTotal}
      brideTotal={brideTotal}
    />
  )
}
