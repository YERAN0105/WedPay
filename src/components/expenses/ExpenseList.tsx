'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatMoney, toMinorUnits, expenseStatus } from '@/lib/money'
import type { ExpenseWithPaid } from '@/lib/types'
import { ExpenseSheet } from './ExpenseSheet'

const STATUS_COLORS: Record<string, string> = {
  'Not paid':    'bg-stone-100 text-stone-500',
  'Partly paid': 'bg-amber-100 text-amber-700',
  'Fully paid':  'bg-emerald-100 text-emerald-700',
  'Overpaid':    'bg-sky-100 text-sky-700',
}

// Left-border accent color per status (inline style so Tailwind purge doesn't strip dynamic values)
const STATUS_BORDER: Record<string, string> = {
  'Not paid':    '#d1d5db',
  'Partly paid': '#f59e0b',
  'Fully paid':  '#10b981',
  'Overpaid':    '#38bdf8',
}

const ALL_STATUSES = ['Not paid', 'Partly paid', 'Fully paid', 'Overpaid']

export function ExpenseList({ expenses }: { expenses: ExpenseWithPaid[] }) {
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toast, setToast] = useState('')

  const withComputed = useMemo(
    () =>
      expenses.map((e) => {
        const costPaisa = toMinorUnits(e.expected_cost)
        const paidPaisa = e.paid_paisa
        return {
          ...e,
          costPaisa,
          paidPaisa,
          remainingPaisa: Math.max(0, costPaisa - paidPaisa),
          status: expenseStatus(paidPaisa, costPaisa),
        }
      }),
    [expenses]
  )

  const categories = useMemo(() => {
    const s = new Set(withComputed.map((e) => e.category).filter(Boolean) as string[])
    return Array.from(s).sort()
  }, [withComputed])

  const filtered = useMemo(() => {
    let list = withComputed
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.vendor_name ?? '').toLowerCase().includes(q)
      )
    }
    if (filterCategory) list = list.filter((e) => e.category === filterCategory)
    if (filterStatus) list = list.filter((e) => e.status === filterStatus)

    return [...list].sort((a, b) => {
      if (sortBy === 'cost') return b.costPaisa - a.costPaisa
      if (sortBy === 'remaining') return b.remainingPaisa - a.remainingPaisa
      return a.name.localeCompare(b.name)
    })
  }, [withComputed, search, filterCategory, filterStatus, sortBy])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="pb-4">
      {/* Search + sort + filter */}
      <div className="px-4 pt-4 space-y-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or vendor…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="name">Sort: Name</option>
            <option value="cost">Sort: Cost</option>
            <option value="remaining">Sort: Remaining</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="mt-3 px-4 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16">
            {expenses.length === 0 ? (
              <>
                <p className="text-4xl mb-3">🧾</p>
                <p className="font-semibold text-stone-700 mb-1">No expenses yet</p>
                <p className="text-sm text-stone-400">Tap + to add your first wedding expense.</p>
              </>
            ) : (
              <>
                <p className="text-3xl mb-3">🔍</p>
                <p className="font-semibold text-stone-700 mb-1">No results</p>
                <p className="text-sm text-stone-400">Try adjusting your search or filters.</p>
              </>
            )}
          </div>
        )}

        {filtered.map((e) => {
          const pct =
            e.costPaisa > 0
              ? Math.min(100, Math.round((e.paidPaisa / e.costPaisa) * 100))
              : 0

          return (
            <Link
              key={e.id}
              href={`/expenses/${e.id}`}
              className="block bg-white rounded-2xl border border-stone-100 p-4 active:opacity-75 transition-opacity"
              style={{
                borderLeft: `4px solid ${STATUS_BORDER[e.status] ?? '#d1d5db'}`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900 truncate text-[15px]">{e.name}</p>
                  {e.category && (
                    <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                      {e.category}
                    </span>
                  )}
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[e.status]}`}
                >
                  {e.status}
                </span>
              </div>

              <div className="flex justify-between text-xs text-stone-500 mb-2">
                <span>Budget <span className="font-semibold text-stone-700">{formatMoney(e.costPaisa)}</span></span>
                <span>Paid <span className="font-semibold text-stone-700">{formatMoney(e.paidPaisa)}</span></span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #be123c, #e11d48)',
                  }}
                />
              </div>

              <p className="mt-1.5 text-xs text-stone-400 text-right">
                {formatMoney(e.remainingPaisa)} remaining
              </p>
            </Link>
          )
        })}
      </div>

      {/* Floating add button */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 text-white rounded-2xl flex items-center justify-center text-2xl font-bold leading-none active:scale-95 transition-transform"
        style={{
          background: 'linear-gradient(135deg, #9f1239, #e11d48)',
          boxShadow: '0 6px 20px rgba(159,18,57,0.45)',
        }}
        aria-label="Add expense"
      >
        +
      </button>

      <ExpenseSheet
        open={sheetOpen}
        expense={null}
        onClose={() => setSheetOpen(false)}
        onSuccess={showToast}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg text-center pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
