import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default function SettingsPage() {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Settings</h2>
      <p className="text-gray-500 mb-8">
        Split ratio, display name, and export will appear here.
      </p>

      <form action={signOut}>
        <button
          type="submit"
          className="w-full border border-red-200 text-red-600 font-medium py-3 rounded-xl text-base active:bg-red-50 transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
