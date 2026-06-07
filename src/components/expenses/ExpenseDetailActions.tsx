'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/lib/supabase/types'
import { archiveExpense, restoreExpense } from '@/lib/expenses'
import { ExpenseSheet } from './ExpenseSheet'

export function ExpenseDetailActions({ expense }: { expense: Tables<'expenses'> }) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [confirmingArchive, setConfirmingArchive] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function handleArchive() {
    setLoading(true)
    const result = await archiveExpense(expense.id, expense.name)
    setLoading(false)
    if ('error' in result) {
      setConfirmingArchive(false)
      showToast(`Error: ${result.error}`)
      return
    }
    router.push('/expenses')
  }

  async function handleRestore() {
    setLoading(true)
    const result = await restoreExpense(expense.id, expense.name)
    setLoading(false)
    if ('error' in result) { showToast(`Error: ${result.error}`); return }
    showToast('Expense restored.')
    router.refresh()
  }

  return (
    <>
      <div className="mx-4 mt-3 flex gap-3">
        {!expense.is_archived && (
          <button
            onClick={() => setSheetOpen(true)}
            className="flex-1 min-h-[44px] bg-white border border-gray-200 text-gray-700 font-medium rounded-xl text-sm active:bg-gray-50"
          >
            Edit
          </button>
        )}
        {expense.is_archived ? (
          <button
            onClick={handleRestore}
            disabled={loading}
            className="flex-1 min-h-[44px] bg-white border border-green-300 text-green-700 font-medium rounded-xl text-sm disabled:opacity-50 active:bg-green-50"
          >
            {loading ? 'Restoring…' : 'Restore'}
          </button>
        ) : (
          <button
            onClick={() => setConfirmingArchive(true)}
            className="flex-1 min-h-[44px] bg-white border border-red-200 text-red-600 font-medium rounded-xl text-sm active:bg-red-50"
          >
            Archive
          </button>
        )}
      </div>

      {/* Archive confirmation modal */}
      {confirmingArchive && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setConfirmingArchive(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-base font-semibold text-gray-900">Archive expense?</h2>
              <p className="mt-1 text-sm text-gray-500">
                &ldquo;{expense.name}&rdquo; will be hidden from all lists and totals. You can restore it later.
              </p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setConfirmingArchive(false)}
                className="flex-1 py-4 text-sm font-medium text-gray-600 active:bg-gray-50"
              >
                Cancel
              </button>
              <div className="w-px bg-gray-100" />
              <button
                onClick={handleArchive}
                disabled={loading}
                className="flex-1 py-4 text-sm font-semibold text-red-600 active:bg-red-50 disabled:opacity-50"
              >
                {loading ? 'Archiving…' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ExpenseSheet
        open={sheetOpen}
        expense={expense}
        onClose={() => setSheetOpen(false)}
        onSuccess={(msg) => {
          showToast(msg)
          router.refresh()
        }}
      />

      {toast && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg text-center pointer-events-none">
          {toast}
        </div>
      )}
    </>
  )
}
