'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createContribution,
  setContributionReceipt,
  updateContribution,
  type ContributionFormData,
} from '@/lib/contributions'
import type { Tables } from '@/lib/supabase/types'

type Props = {
  open: boolean
  defaultSide: 'groom' | 'bride'
  contribution?: Tables<'contributions'> | null
  onClose: () => void
  onSuccess: (message: string) => void
}

function todayString() {
  return new Date().toISOString().split('T')[0]
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function ContributionSheet({
  open,
  defaultSide,
  contribution,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = !!contribution
  const [form, setForm] = useState<ContributionFormData>({
    side: defaultSide,
    amount: '',
    contributed_on: todayString(),
    note: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (contribution) {
      setForm({
        side: contribution.side,
        amount: contribution.amount,
        contributed_on: contribution.contributed_on,
        note: contribution.note ?? '',
      })
    } else {
      setForm({ side: defaultSide, amount: '', contributed_on: todayString(), note: '' })
    }
    setFile(null)
    setUploadStatus('')
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }, [open, contribution, defaultSide])

  function set<K extends keyof ContributionFormData>(field: K, value: ContributionFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt < 0) {
      setError('Amount must be 0 or more.')
      return
    }
    setError('')
    setLoading(true)

    if (isEdit && contribution) {
      // ── Edit path ──
      const result = await updateContribution(contribution.id, form, contribution.amount)
      if ('error' in result) { setError(result.error); setLoading(false); return }

      if (file) {
        setUploadStatus('Uploading receipt…')
        const path = `contributions/${contribution.id}/${sanitizeFilename(file.name)}`
        const { error: upErr } = await createClient()
          .storage.from('receipts')
          .upload(path, file, { upsert: true })
        if (upErr) { setError(`Receipt upload failed: ${upErr.message}`); setLoading(false); setUploadStatus(''); return }
        await setContributionReceipt(contribution.id, path)
      }

      setLoading(false)
      onSuccess('Contribution updated.')
      onClose()
    } else {
      // ── Create path ──
      const result = await createContribution(form)
      if ('error' in result) { setError(result.error); setLoading(false); return }

      if (file) {
        setUploadStatus('Uploading receipt…')
        const path = `contributions/${result.id}/${sanitizeFilename(file.name)}`
        const { error: upErr } = await createClient()
          .storage.from('receipts')
          .upload(path, file)
        if (upErr) {
          setLoading(false)
          onSuccess('Contribution added. Receipt upload failed — edit to re-attach.')
          onClose()
          return
        }
        await setContributionReceipt(result.id, path)
      }

      setLoading(false)
      onSuccess('Contribution added.')
      onClose()
    }
  }

  const buttonLabel =
    uploadStatus || (loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Contribution')

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit contribution' : 'Add contribution'}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl
          transition-transform duration-300 ease-out
          ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '92vh' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit ? 'Edit Contribution' : 'Add Contribution'}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-gray-400 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 115px)' }}>
          <form onSubmit={handleSubmit} className="px-4 pt-4 pb-10 space-y-4">

            {/* Side selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Side <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['groom', 'bride'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('side', s)}
                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                      form.side === s
                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                        : 'border-gray-200 bg-white text-gray-500'
                    }`}
                    // Prevent side changes on edit — contribution side is fixed
                    disabled={isEdit}
                  >
                    {s === 'groom' ? "💍 Groom's side" : "💐 Bride's side"}
                  </button>
                ))}
              </div>
            </div>

            {/* Own-pocket helper */}
            <div className="bg-blue-50 rounded-xl px-3 py-2.5 text-xs text-blue-700 leading-relaxed">
              Record money your side paid <strong>from its own pocket</strong> here.
              Money you are holding for the other side is <strong>not</strong> your contribution.
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (Rs) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="0.00"
                autoFocus={!isEdit}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={form.contributed_on}
                onChange={(e) => set('contributed_on', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => set('note', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="e.g. Cash handed over on wedding day"
              />
            </div>

            {/* Receipt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receipt
                {isEdit && contribution?.receipt_path ? ' (tap to replace)' : ' (optional)'}
              </label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border border-dashed border-gray-300 rounded-lg px-3 py-3 text-base text-left bg-gray-50 active:bg-gray-100"
              >
                {file ? (
                  <span className="text-gray-800">📎 {file.name}</span>
                ) : isEdit && contribution?.receipt_path ? (
                  <span className="text-gray-500">📎 Receipt attached — tap to replace</span>
                ) : (
                  <span className="text-gray-400">Tap to attach image or PDF</span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-60 active:bg-rose-700 transition-colors"
            >
              {buttonLabel}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
