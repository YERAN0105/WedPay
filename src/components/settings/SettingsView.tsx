'use client'

import { useState } from 'react'
import { updateSplitRatio, updateDisplayName, signOut } from '@/lib/settings'
import { ExportSection } from './ExportSection'

type Props = {
  currentSplitPct: number
  currentDisplayName: string
}

export function SettingsView({ currentSplitPct, currentDisplayName }: Props) {
  const [splitPct, setSplitPct] = useState(currentSplitPct)
  const [displayName, setDisplayName] = useState(currentDisplayName)
  const [toast, setToast] = useState('')
  const [splitSaving, setSplitSaving] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function handleSaveSplit() {
    const rounded = Math.round(splitPct)
    if (rounded === currentSplitPct) {
      showToast('No changes to save.')
      return
    }
    setSplitSaving(true)
    const result = await updateSplitRatio(rounded)
    setSplitSaving(false)
    if ('error' in result) {
      showToast(`Error: ${result.error}`)
      return
    }
    showToast('Split ratio saved.')
  }

  async function handleSaveName() {
    if (displayName.trim().length < 2) {
      showToast('Name must be at least 2 characters.')
      return
    }
    setNameSaving(true)
    const result = await updateDisplayName(displayName)
    setNameSaving(false)
    if ('error' in result) {
      showToast(`Error: ${result.error}`)
      return
    }
    showToast('Display name saved.')
  }

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
  }

  return (
    <div className="px-4 py-4 space-y-4 pb-8">

      {/* Split ratio */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Split ratio
        </p>
        <div className="text-center mb-4">
          <p className="text-2xl font-bold text-gray-800">
            {splitPct} / {100 - splitPct}
          </p>
          <p className="text-sm text-gray-400 mt-0.5">
            Groom&apos;s share / Bride&apos;s share
          </p>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={splitPct}
          onChange={(e) => setSplitPct(Number(e.target.value))}
          className="w-full accent-rose-600 mb-1"
          aria-label="Groom split percentage"
        />
        <div className="flex justify-between text-xs text-gray-300 mb-4">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
        <button
          onClick={handleSaveSplit}
          disabled={splitSaving}
          className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-60 active:bg-rose-700 transition-colors"
        >
          {splitSaving ? 'Saving…' : 'Save split'}
        </button>
      </div>

      {/* Display name */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Your name
        </p>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500 mb-3"
          placeholder="Your display name"
        />
        <button
          onClick={handleSaveName}
          disabled={nameSaving}
          className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-60 active:bg-rose-700 transition-colors"
        >
          {nameSaving ? 'Saving…' : 'Save name'}
        </button>
      </div>

      {/* Currency (read-only) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
          Currency
        </p>
        <p className="text-base font-bold text-gray-800">LKR</p>
        <p className="text-xs text-gray-400 mt-0.5">Sri Lankan Rupee (Rs) — fixed for v1</p>
      </div>

      {/* Export */}
      <ExportSection />

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="w-full border border-red-200 text-red-600 font-medium py-3 rounded-xl text-base active:bg-red-50 transition-colors disabled:opacity-60"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>

      {toast && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg text-center pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
