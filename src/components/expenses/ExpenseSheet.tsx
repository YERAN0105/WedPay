'use client'

import { useState, useEffect } from 'react'
import { createExpense, updateExpense, type ExpenseFormData } from '@/lib/expenses'
import type { Tables } from '@/lib/supabase/types'

const CATEGORIES = [
  'Venue',
  'Catering',
  'Attire',
  'Photography',
  'Decor',
  'Music',
  'Transport',
  'Invitations',
  'Jewellery',
  'Gifts',
  'Other',
]

type Props = {
  open: boolean
  expense?: Tables<'expenses'> | null
  onClose: () => void
  onSuccess: (message: string) => void
}

const EMPTY: ExpenseFormData = {
  name: '',
  description: '',
  expected_cost: '',
  category: '',
  vendor_name: '',
  vendor_phone: '',
  next_due_amount: '',
  next_due_date: '',
}

export function ExpenseSheet({ open, expense, onClose, onSuccess }: Props) {
  const isEdit = !!expense
  const [form, setForm] = useState<ExpenseFormData>(EMPTY)
  const [customCategory, setCustomCategory] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [phoneDigits, setPhoneDigits] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (expense) {
      const existingIsCustom = expense.category
        ? !CATEGORIES.includes(expense.category)
        : false
      const raw = expense.vendor_phone ?? ''
      // Strip +94 prefix if present; otherwise keep only digits
      const digits = raw.startsWith('+94')
        ? raw.slice(3)
        : raw.replace(/\D/g, '')
      setForm({
        name: expense.name,
        description: expense.description ?? '',
        expected_cost: expense.expected_cost,
        category: existingIsCustom ? '' : (expense.category ?? ''),
        vendor_name: expense.vendor_name ?? '',
        vendor_phone: expense.vendor_phone ?? '',
        next_due_amount: expense.next_due_amount ?? '',
        next_due_date: expense.next_due_date ?? '',
      })
      setPhoneDigits(digits)
      setIsCustom(existingIsCustom)
      setCustomCategory(existingIsCustom ? (expense.category ?? '') : '')
    } else {
      setForm(EMPTY)
      setPhoneDigits('')
      setIsCustom(false)
      setCustomCategory('')
    }
    setError('')
  }, [open, expense])

  function set(field: keyof ExpenseFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cost = parseFloat(form.expected_cost)
    if (isNaN(cost) || cost < 0) {
      setError('Expected cost must be 0 or more.')
      return
    }
    if (phoneDigits && phoneDigits.length !== 9) {
      setError('Phone number must be exactly 9 digits after +94.')
      return
    }
    const finalCategory = isCustom ? customCategory.trim() : form.category
    const fullPhone = phoneDigits ? `+94${phoneDigits}` : ''
    const submitData: ExpenseFormData = { ...form, category: finalCategory, vendor_phone: fullPhone }

    setError('')
    setLoading(true)

    const result = isEdit && expense
      ? await updateExpense(expense.id, submitData, expense.expected_cost)
      : await createExpense(submitData)

    setLoading(false)

    if ('error' in result) {
      setError(result.error)
      return
    }

    onSuccess(isEdit ? 'Expense updated.' : 'Expense added.')
    onClose()
  }

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
        aria-label={isEdit ? 'Edit expense' : 'Add expense'}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl
          transition-transform duration-300 ease-out
          ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '92vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-gray-400 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 110px)' }}>
          <form onSubmit={handleSubmit} className="px-4 pt-4 pb-10 space-y-4">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="e.g. Photographer"
              />
            </div>

            {/* Expected cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Cost (Rs) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.expected_cost}
                onChange={(e) => set('expected_cost', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="0.00"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={isCustom ? '__custom__' : form.category}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustom(true)
                    set('category', '')
                  } else {
                    setIsCustom(false)
                    set('category', e.target.value)
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">— None —</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__custom__">Custom…</option>
              </select>
              {isCustom && (
                <input
                  type="text"
                  autoFocus
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Type category name"
                />
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                placeholder="Optional notes"
              />
            </div>

            {/* Vendor name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
              <input
                type="text"
                value={form.vendor_name}
                onChange={(e) => set('vendor_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Optional"
              />
            </div>

            {/* Vendor phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Phone</label>
              <div className="flex items-center gap-2">
                <span className="shrink-0 px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-base text-gray-500 font-medium select-none">
                  +94
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={9}
                  value={phoneDigits}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
                    setPhoneDigits(digits)
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="712345678"
                />
              </div>
              {phoneDigits.length > 0 && phoneDigits.length !== 9 && (
                <p className="mt-1 text-xs text-amber-600">
                  {9 - phoneDigits.length} more digit{9 - phoneDigits.length !== 1 ? 's' : ''} needed
                </p>
              )}
            </div>

            {/* Next payment due */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next Payment Due
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.next_due_amount}
                  onChange={(e) => set('next_due_amount', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Amount"
                />
                <input
                  type="date"
                  value={form.next_due_date}
                  onChange={(e) => set('next_due_date', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-60 active:bg-rose-700 transition-colors"
            >
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
