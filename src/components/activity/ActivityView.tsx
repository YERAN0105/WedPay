'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/types'

type ActivityRow = Tables<'activity_log'>
type FilterType = 'all' | 'expense' | 'payment' | 'contribution' | 'settings'

const PAGE_SIZE = 20

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'expense', label: 'Expenses' },
  { key: 'payment', label: 'Payments' },
  { key: 'contribution', label: 'Contribs' },
  { key: 'settings', label: 'Settings' },
]

const ACTION_DOT: Record<string, string> = {
  created: 'bg-green-500',
  updated: 'bg-blue-500',
  archived: 'bg-gray-400',
  restored: 'bg-purple-500',
}

const ACTION_LABEL: Record<string, string> = {
  created: 'Added',
  updated: 'Edited',
  archived: 'Archived',
  restored: 'Restored',
}

const ENTITY_COLOR: Record<string, string> = {
  expense: 'text-rose-600',
  payment: 'text-blue-600',
  contribution: 'text-green-600',
  settings: 'text-gray-500',
}

const ENTITY_LABEL: Record<string, string> = {
  expense: 'Expense',
  payment: 'Payment',
  contribution: 'Contribution',
  settings: 'Settings',
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatExact(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-LK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

async function fetchActivity(
  filterType: FilterType,
  offset: number,
): Promise<ActivityRow[]> {
  const supabase = createClient()
  if (filterType === 'all') {
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
    return data ?? []
  } else {
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .eq('entity_type', filterType)
      .range(offset, offset + PAGE_SIZE - 1)
    return data ?? []
  }
}

type Props = {
  initialRows: ActivityRow[]
  initialHasMore: boolean
}

export function ActivityView({ initialRows, initialHasMore }: Props) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [rows, setRows] = useState<ActivityRow[]>(initialRows)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [filterLoading, setFilterLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  async function handleFilterChange(newFilter: FilterType) {
    if (newFilter === filter) return
    setFilterLoading(true)
    const fetched = await fetchActivity(newFilter, 0)
    setFilter(newFilter)
    setRows(fetched)
    setHasMore(fetched.length === PAGE_SIZE)
    setFilterLoading(false)
  }

  async function handleLoadMore() {
    setLoadingMore(true)
    const fetched = await fetchActivity(filter, rows.length)
    setRows(prev => [...prev, ...fetched])
    setHasMore(fetched.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  return (
    <div className="px-4 py-4 pb-8">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Activity</h2>

      {/* Filter chips — scrollable row */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleFilterChange(key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-rose-600 text-white'
                : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {filterLoading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          No activity
          {filter !== 'all' ? ` for ${ENTITY_LABEL[filter] ?? filter}s` : ''} yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {rows.map((row, idx) => (
            <div
              key={row.id}
              className={`flex items-start gap-3 px-4 py-3.5 ${
                idx !== rows.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              {/* Colored action dot */}
              <div
                className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                  ACTION_DOT[row.action] ?? 'bg-gray-400'
                }`}
              />

              {/* Row content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-snug">{row.summary}</p>
                <div className="flex flex-wrap items-center gap-x-1.5 mt-1">
                  <span
                    className={`text-xs font-semibold ${
                      ENTITY_COLOR[row.entity_type] ?? 'text-gray-400'
                    }`}
                  >
                    {ACTION_LABEL[row.action] ?? row.action}
                  </span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-500">
                    {row.created_by_name ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{timeAgo(row.created_at)}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{formatExact(row.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {!filterLoading && hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full mt-3 py-3 text-sm font-medium text-rose-600 border border-rose-200 rounded-xl disabled:opacity-50 active:bg-rose-50 transition-colors"
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}

      {!filterLoading && !hasMore && rows.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-4">All activity loaded.</p>
      )}
    </div>
  )
}
