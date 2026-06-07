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
        ).map(({ side, label, total }) => {
          const active = activeSide === side
          return (
            <button
              key={side}
              onClick={() => setActiveSide(side)}
              className="text-left p-4 rounded-2xl border-2 transition-all duration-200"
              style={active ? {
                borderColor: '#be123c',
                background: 'linear-gradient(135deg, #fff1f2, #fff5f5)',
                boxShadow: '0 4px 16px rgba(190,18,60,0.18)',
              } : {
                borderColor: '#f1f0ef',
                background: '#ffffff',
              }}
            >
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
                active ? 'text-rose-600' : 'text-stone-400'
              }`}>
                {label}
              </p>
              <p className={`text-base font-bold ${active ? 'text-rose-800' : 'text-stone-700'}`}>
                {formatMoney(total)}
              </p>
            </button>
          )
        })}
      </div>

      {/* List for active side */}
      <div className="px-4 mt-4">
        {activeList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <p className="text-3xl mb-2">💰</p>
            <p className="font-semibold text-stone-700 mb-1">No contributions yet</p>
            <p className="text-sm text-stone-400">
              Tap + to record the first contribution from {activeSide === 'groom' ? "Groom's" : "Bride's"} side.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeList.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-stone-100 p-4"
                style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-900 text-lg leading-tight">
                      {formatMoney(toMinorUnits(c.amount))}
                    </p>
                    <p className="text-sm text-stone-500 mt-0.5">{formatDate(c.contributed_on)}</p>
                    {c.note && <p className="text-sm text-stone-600 mt-1">{c.note}</p>}
                    <p className="text-xs text-stone-400 mt-1">
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
                    className="flex-1 min-h-[44px] text-sm font-semibold text-stone-600 border border-stone-200 rounded-xl active:bg-stone-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleArchive(c)}
                    disabled={archivingId === c.id}
                    className="flex-1 min-h-[44px] text-sm font-semibold text-red-600 border border-red-100 rounded-xl active:bg-red-50 disabled:opacity-50 transition-colors"
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
        className="fixed bottom-20 right-4 z-30 w-14 h-14 text-white rounded-2xl flex items-center justify-center text-2xl font-bold leading-none active:scale-95 transition-transform"
        style={{
          background: 'linear-gradient(135deg, #9f1239, #e11d48)',
          boxShadow: '0 6px 20px rgba(159,18,57,0.45)',
        }}
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
