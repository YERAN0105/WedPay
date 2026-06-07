'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/lib/supabase/types'
import { formatMoney, toMinorUnits } from '@/lib/money'
import { archivePayment } from '@/lib/payments'
import { ReceiptThumbnail } from '@/components/ReceiptThumbnail'
import { PaymentSheet } from './PaymentSheet'

type Payment = Tables<'payments'>

type Props = {
  payments: Payment[]
  expenseId: string
  expenseName: string
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-LK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function PaymentList({ payments, expenseId, expenseName }: Props) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editPayment, setEditPayment] = useState<Payment | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
    router.refresh()
  }

  async function handleArchive(p: Payment) {
    if (
      !confirm(
        `Remove this payment of ${formatMoney(toMinorUnits(p.amount))}?\n\nIt will no longer count toward totals.`
      )
    )
      return
    setArchivingId(p.id)
    const result = await archivePayment(p.id, expenseId, expenseName, p.amount)
    setArchivingId(null)
    if ('error' in result) { showToast(`Error: ${result.error}`); return }
    showToast('Payment removed.')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-800">Payments</h3>
        <button
          onClick={() => { setEditPayment(null); setSheetOpen(true) }}
          className="flex items-center gap-1 bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-xl min-h-[44px] active:bg-rose-700 transition-colors"
        >
          + Add payment
        </button>
      </div>

      {payments.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 text-center text-gray-400 text-sm">
          No payments yet. Tap &ldquo;+ Add payment&rdquo; to record the first one.
        </div>
      )}

      <div className="space-y-2">
        {payments.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-base">
                  {formatMoney(toMinorUnits(p.amount))}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{formatDate(p.paid_on)}</p>
                {p.note && <p className="text-sm text-gray-600 mt-1">{p.note}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Added by {p.created_by_name ?? 'Unknown'}
                </p>
              </div>

              {p.receipt_path && (
                <ReceiptThumbnail
                  receiptPath={p.receipt_path}
                  onOpen={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
                />
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { setEditPayment(p); setSheetOpen(true) }}
                className="flex-1 min-h-[44px] text-sm font-medium text-gray-600 border border-gray-200 rounded-xl active:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={() => handleArchive(p)}
                disabled={archivingId === p.id}
                className="flex-1 min-h-[44px] text-sm font-medium text-red-600 border border-red-200 rounded-xl active:bg-red-50 disabled:opacity-50"
              >
                {archivingId === p.id ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <PaymentSheet
        open={sheetOpen}
        expenseId={expenseId}
        expenseName={expenseName}
        payment={editPayment}
        onClose={() => setSheetOpen(false)}
        onSuccess={showToast}
      />

      {toast && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg text-center pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
