'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetNamePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) { setError('Name must be at least 2 characters.'); return }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase
      .from('profiles')
      .insert({ id: user.id, display_name: trimmed })

    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#fdf8f6' }}>

      {/* Rose gradient hero */}
      <div
        className="flex flex-col items-center justify-end pb-10 pt-16 px-4"
        style={{
          background: 'linear-gradient(160deg, #9f1239 0%, #be123c 50%, #e11d48 100%)',
          minHeight: '35vh',
        }}
      >
        <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mb-4">
          <span className="text-white font-bold text-2xl leading-none" style={{ fontFamily: 'Georgia, serif' }}>W</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">WedPay</h1>
      </div>

      {/* Card */}
      <div className="flex-1 -mt-6 rounded-t-3xl bg-white px-6 pt-8 pb-10 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <h2 className="text-xl font-bold text-stone-900 mb-1">What should we call you?</h2>
        <p className="text-stone-500 text-sm mb-6">
          Your name appears next to every change you make.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-stone-700 mb-1.5">
              Your display name
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-shadow"
              placeholder="e.g. Nuwan"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-700 text-white font-semibold py-3.5 rounded-xl text-base disabled:opacity-60 active:bg-rose-800 transition-colors shadow-sm"
          >
            {loading ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
