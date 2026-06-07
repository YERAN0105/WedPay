'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/lib/supabase/types'
import { formatMoney, toMinorUnits } from '@/lib/money'
import { archiveContribution } from '@/lib/contributions'
import { ReceiptThumbnail } from '@/components/ReceiptThumbnail'
import { ContributionSheet } from './ContributionSheet'

type Contribution = Tables<'contributions'>

type Props = {
  groomContributions: Contribution[]
  brideContributions: Contribution[]
  groomTotal: number   // integer paisa
  brideTotal: number   // integer paisa
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

export function ContributionsView({
  groomContributions,
  brideContributions,
  groomTotal,
  brideTotal,
}: Props) {
  const router = useRouter()
  const [activeSide, setActiveSide] = useState<'groom' | 'bride'>('groom')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editContribution, setEditContribution] = useState<Contribution | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const activeList = activeSide === 'groom' ? groomContributions : brideContributions

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
    router.refresh()
  }

  function openAdd() {
    setEditContribution(null)
    setSheetOpen(true)
  }

  function openEdit(c: Contribution) {
    setEditContribution(c)
    setSheetOpen(true)
  }

  async function handleArchive(c: Contribution) {
    if (
      !confirm(
        `Remove this contribution of ${formatMoney(toMinorUnits(c.amount))}?\n\nIt will no longer count toward totals.`
      )
    )
      return
    setArchivingId(c.id)
    const result = await archiveContribution(c.id, c.amount, c.side)
    setArchivingId(null)
    if ('error' in result) { showToast(`Error: ${result.error}`); return }
    showToast('Contribution removed.')
  }

  return (
    <div className="pb-4">
      {/* Side toggle cards — always show both totals */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        {(
          [
            { side: 'groom' as const, label: "Groom's side", total: groomTotal },
            { side: 'bride' as const, label: "Bride's side", total: brideTotal },
          ] as const
        ).map(({ side, label, total }) => (
          <button
            key={side}
            onClick={() => setActiveSide(side)}
            className={`text-left p-3 rounded-xl border-2 transition-colors ${
              activeSide === side
                ? 'border-rose-500 bg-rose-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-wide ${
                activeSide === side ? 'text-rose-600' : 'text-gray-400'
              }`}
            >
              {label}
            </p>
            <p
              className={`text-sm font-bold mt-0.5 ${
                activeSide === side ? 'text-rose-700' : 'text-gray-700'
              }`}
            >
              {formatMoney(total)}
            </p>
          </button>
        ))}
      </div>

      {/* List for active side */}
      <div className="px-4 mt-4">
        {activeList.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
            No contributions from {activeSide === 'groom' ? "Groom's" : "Bride's"} side yet.
            <br />
            Tap + to record the first one.
          </div>
        ) : (
          <div className="space-y-2">
            {activeList.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-base">
                      {formatMoney(toMinorUnits(c.amount))}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{formatDate(c.contributed_on)}</p>
                    {c.note && <p className="text-sm text-gray-600 mt-1">{c.note}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      Added by {c.created_by_name ?? 'Unknown'}
                    </p>
                  </div>

                  {c.receipt_path && (
                    <ReceiptThumbnail
                      receiptPath={c.receipt_path}
                      onOpen={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
                    />
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openEdit(c)}
                    className="flex-1 min-h-[44px] text-sm font-medium text-gray-600 border border-gray-200 rounded-xl active:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleArchive(c)}
                    disabled={archivingId === c.id}
                    className="flex-1 min-h-[44px] text-sm font-medium text-red-600 border border-red-200 rounded-xl active:bg-red-50 disabled:opacity-50"
                  >
                    {archivingId === c.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating add button */}
      <button
        onClick={openAdd}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 bg-rose-600 text-white rounded-full shadow-lg flex items-center justify-center text-3xl leading-none active:bg-rose-700"
        aria-label="Add contribution"
      >
        +
      </button>

      <ContributionSheet
        open={sheetOpen}
        defaultSide={activeSide}
        contribution={editContribution}
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
