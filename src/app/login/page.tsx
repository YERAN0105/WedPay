'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Incorrect email or password.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#fdf8f6' }}>

      {/* Rose gradient hero */}
      <div
        className="flex flex-col items-center justify-end pb-10 pt-16 px-4"
        style={{
          background: 'linear-gradient(160deg, #9f1239 0%, #be123c 50%, #e11d48 100%)',
          minHeight: '42vh',
        }}
      >
        {/* Logo mark */}
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mb-4 shadow-lg">
          <span className="text-white font-bold text-3xl leading-none" style={{ fontFamily: 'Georgia, serif' }}>W</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">WedPay</h1>
        <p className="text-rose-200 text-sm mt-1">Wedding expense tracker</p>
      </div>

      {/* Form card — overlapping */}
      <div className="flex-1 -mt-6 rounded-t-3xl bg-white px-6 pt-8 pb-10 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <h2 className="text-xl font-bold text-stone-900 mb-1">Welcome back</h2>
        <p className="text-stone-500 text-sm mb-6">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-stone-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-shadow"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-stone-700 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-shadow"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-700 text-white font-semibold py-3.5 rounded-xl text-base disabled:opacity-60 active:bg-rose-800 transition-colors shadow-sm mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-stone-400 mt-8">
          Private app — invitation only
        </p>
      </div>
    </div>
  )
}
