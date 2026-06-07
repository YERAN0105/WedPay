'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toMinorUnits, formatMoney } from '@/lib/money'
import type { Tables } from '@/lib/supabase/types'

type Expense = Tables<'expenses'>
type Payment = Tables<'payments'>
type Contribution = Tables<'contributions'>

interface ExportData {
  groomPct: number
  expenses: Expense[]
  payments: Payment[]
  contributions: Contribution[]
}

// ── Data ──────────────────────────────────────────────────────────────────────

async function loadData(): Promise<ExportData> {
  const supabase = createClient()

  const [{ data: settings }, { data: expenses }, { data: contributions }] =
    await Promise.all([
      supabase.from('app_settings').select('groom_percentage').eq('id', 1).single(),
      supabase
        .from('expenses')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('contributions')
        .select('*')
        .eq('is_archived', false)
        .order('contributed_on', { ascending: false }),
    ])

  const allExpenses = expenses ?? []
  const expenseIds = allExpenses.map(e => e.id)
  const allPayments =
    expenseIds.length > 0
      ? ((
          await supabase
            .from('payments')
            .select('*')
            .eq('is_archived', false)
            .in('expense_id', expenseIds)
            .order('paid_on', { ascending: false })
        ).data ?? [])
      : []

  return {
    groomPct: settings?.groom_percentage ?? 50,
    expenses: allExpenses,
    payments: allPayments,
    contributions: contributions ?? [],
  }
}

// ── Shared formulas ───────────────────────────────────────────────────────────

function computeSummary(data: ExportData) {
  const { expenses, payments, contributions, groomPct } = data

  const paidMap: Record<string, number> = {}
  for (const p of payments) {
    paidMap[p.expense_id] = (paidMap[p.expense_id] ?? 0) + toMinorUnits(p.amount)
  }

  const totalBudget = expenses.reduce((s, e) => s + toMinorUnits(e.expected_cost), 0)
  const totalSpent = payments.reduce((s, p) => s + toMinorUnits(p.amount), 0)
  const totalContributed = contributions.reduce((s, c) => s + toMinorUnits(c.amount), 0)
  const groomContributed = contributions
    .filter(c => c.side === 'groom')
    .reduce((s, c) => s + toMinorUnits(c.amount), 0)
  const brideContributed = contributions
    .filter(c => c.side === 'bride')
    .reduce((s, c) => s + toMinorUnits(c.amount), 0)
  const stillToPay = expenses.reduce((s, e) => {
    const paid = paidMap[e.id] ?? 0
    return s + Math.max(0, toMinorUnits(e.expected_cost) - paid)
  }, 0)

  const groomRatio = groomPct / 100
  const groomFairShare = Math.round(totalSpent * groomRatio)
  const brideFairShare = Math.round(totalSpent * (1 - groomRatio))
  const groomBalance = groomContributed - groomFairShare
  const brideBalance = brideContributed - brideFairShare
  const leftover = totalContributed - totalSpent

  return {
    paidMap,
    totalBudget,
    totalSpent,
    totalContributed,
    groomContributed,
    brideContributed,
    stillToPay,
    groomFairShare,
    brideFairShare,
    groomBalance,
    brideBalance,
    leftover,
  }
}

function statusLabel(paid: number, expected: number): string {
  if (paid === 0) return 'Not paid'
  if (paid < expected) return 'Partly paid'
  if (paid === expected) return 'Fully paid'
  return 'Overpaid'
}

// ── CSV ───────────────────────────────────────────────────────────────────────

function esc(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function csvRow(...cells: (string | number | null | undefined)[]): string {
  return cells.map(esc).join(',')
}

function rawAmt(paisa: number): string {
  return (paisa / 100).toFixed(2)
}

function buildCSV(data: ExportData): string {
  const { expenses, payments, contributions } = data
  const s = computeSummary(data)
  const now = new Date().toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const nameMap: Record<string, string> = {}
  for (const e of expenses) nameMap[e.id] = e.name

  const lines: string[] = []

  lines.push(csvRow('WedPay Export', `Generated: ${now}`, 'Currency: LKR'))
  lines.push('')

  // Summary
  lines.push('Summary')
  lines.push(csvRow('Total Budget', 'Total Spent', 'Still To Pay', 'Total Contributed', 'Leftover'))
  lines.push(csvRow(
    rawAmt(s.totalBudget),
    rawAmt(s.totalSpent),
    rawAmt(s.stillToPay),
    rawAmt(s.totalContributed),
    rawAmt(s.leftover),
  ))
  lines.push('')

  // Expenses
  lines.push('Expenses')
  lines.push(csvRow(
    'Name', 'Category', 'Expected Cost', 'Paid So Far', 'Remaining',
    'Status', 'Vendor', 'Next Due Amount', 'Next Due Date', 'Created By',
  ))
  for (const e of expenses) {
    const paid = s.paidMap[e.id] ?? 0
    const expected = toMinorUnits(e.expected_cost)
    lines.push(csvRow(
      e.name,
      e.category,
      rawAmt(expected),
      rawAmt(paid),
      rawAmt(Math.max(0, expected - paid)),
      statusLabel(paid, expected),
      e.vendor_name,
      e.next_due_amount ? rawAmt(toMinorUnits(e.next_due_amount)) : '',
      e.next_due_date,
      e.created_by_name,
    ))
  }
  lines.push('')

  // Payments
  lines.push('Payments')
  lines.push(csvRow('Expense', 'Amount', 'Date', 'Note', 'Added By'))
  for (const p of payments) {
    lines.push(csvRow(
      nameMap[p.expense_id] ?? '',
      rawAmt(toMinorUnits(p.amount)),
      p.paid_on,
      p.note,
      p.created_by_name,
    ))
  }
  lines.push('')

  // Contributions
  lines.push('Contributions')
  lines.push(csvRow('Side', 'Amount', 'Date', 'Note', 'Added By'))
  for (const c of contributions) {
    lines.push(csvRow(
      c.side === 'groom' ? "Groom's side" : "Bride's side",
      rawAmt(toMinorUnits(c.amount)),
      c.contributed_on,
      c.note,
      c.created_by_name,
    ))
  }

  return lines.join('\n')
}

// ── PDF ───────────────────────────────────────────────────────────────────────

async function buildPDF(data: ExportData): Promise<void> {
  // Dynamic imports keep jspdf out of the SSR bundle — it uses browser globals
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const { expenses, payments, contributions, groomPct } = data
  const s = computeSummary(data)
  const now = new Date().toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const ml = 14
  const mr = 14
  const contentW = pageW - ml - mr

  let y = 20

  // Rose-700 in RGB
  const rose: [number, number, number] = [190, 18, 60]
  const roseLight: [number, number, number] = [255, 240, 244]

  // Table style shorthands
  const tblHead = { fillColor: rose, textColor: 255, fontStyle: 'bold' as const }
  const tblAlt  = { fillColor: roseLight }
  const tblFont = { fontSize: 8 }

  // After each autoTable call, read the final Y from jspdf-autotable's lastAutoTable
  function afterTable() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // Section heading with page-break guard
  function heading(title: string) {
    if (y + 28 > pageH - 15) { doc.addPage(); y = 20 }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(rose[0], rose[1], rose[2])
    doc.text(title, ml, y)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    y += 6
  }

  // ── Title block ──
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('WedPay Report', ml, y)
  y += 8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(130, 130, 130)
  doc.text(`Generated: ${now}`, ml, y)
  doc.setTextColor(0, 0, 0)
  y += 10

  // ── Who owes whom ──
  heading('Summary')

  const { groomBalance, brideBalance, leftover } = s
  const isWarning = leftover < 0
  const groomOwes = !isWarning && groomBalance < 0
  const brideOwes = !isWarning && !groomOwes && brideBalance < 0

  let debtLine: string
  if (isWarning) {
    debtLine = `Note: Contributions are ${formatMoney(Math.abs(leftover))} less than recorded spending.`
  } else if (groomOwes) {
    debtLine = `Groom's side owes Bride's side ${formatMoney(Math.abs(groomBalance))}`
    if (leftover > 0) debtLine += ` (Plus ${formatMoney(leftover)} paid toward future expenses.)`
  } else if (brideOwes) {
    debtLine = `Bride's side owes Groom's side ${formatMoney(Math.abs(brideBalance))}`
    if (leftover > 0) debtLine += ` (Plus ${formatMoney(leftover)} paid toward future expenses.)`
  } else {
    debtLine = 'All settled up.'
  }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  const debtWrapped = doc.splitTextToSize(debtLine, contentW)
  doc.text(debtWrapped, ml, y)
  doc.setFont('helvetica', 'normal')
  y += (debtWrapped as string[]).length * 5 + 5

  // Summary metrics table
  const summaryBody: string[][] = [
    ['Total budget', formatMoney(s.totalBudget)],
    ['Total spent',  formatMoney(s.totalSpent)],
    ['Still to pay', formatMoney(s.stillToPay)],
    ['Total contributed', formatMoney(s.totalContributed)],
  ]
  if (s.leftover > 0) summaryBody.push(['Leftover (unspent)', formatMoney(s.leftover)])

  autoTable(doc, {
    startY: y,
    margin: { left: ml, right: mr },
    head: [['Metric', 'Amount']],
    body: summaryBody,
    styles: tblFont,
    headStyles: tblHead,
    alternateRowStyles: tblAlt,
    columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: contentW - 110 } },
  })
  afterTable()

  // ── Each side's position ──
  heading(`Each Side's Position · Split ${groomPct} / ${100 - groomPct}`)

  autoTable(doc, {
    startY: y,
    margin: { left: ml, right: mr },
    head: [['Side', 'Split', 'Contributed', 'Fair Share', 'Balance']],
    body: [
      [
        "Groom's side",
        `${groomPct}%`,
        formatMoney(s.groomContributed),
        formatMoney(s.groomFairShare),
        groomBalance >= 0
          ? `Overpaid ${formatMoney(groomBalance)}`
          : `Underpaid ${formatMoney(Math.abs(groomBalance))}`,
      ],
      [
        "Bride's side",
        `${100 - groomPct}%`,
        formatMoney(s.brideContributed),
        formatMoney(s.brideFairShare),
        s.brideBalance >= 0
          ? `Overpaid ${formatMoney(s.brideBalance)}`
          : `Underpaid ${formatMoney(Math.abs(s.brideBalance))}`,
      ],
    ],
    styles: tblFont,
    headStyles: tblHead,
    alternateRowStyles: tblAlt,
  })
  afterTable()

  // ── Expenses table ──
  heading('Expenses')

  autoTable(doc, {
    startY: y,
    margin: { left: ml, right: mr },
    head: [['Expense', 'Category', 'Expected', 'Paid', 'Remaining', 'Status']],
    body: expenses.map(e => {
      const paid = s.paidMap[e.id] ?? 0
      const expected = toMinorUnits(e.expected_cost)
      return [
        e.name,
        e.category ?? '',
        formatMoney(expected),
        formatMoney(paid),
        formatMoney(Math.max(0, expected - paid)),
        statusLabel(paid, expected),
      ]
    }),
    styles: tblFont,
    headStyles: tblHead,
    alternateRowStyles: tblAlt,
  })
  afterTable()

  // ── Payments table ──
  heading('Payments')

  const nameMap: Record<string, string> = {}
  for (const e of expenses) nameMap[e.id] = e.name

  autoTable(doc, {
    startY: y,
    margin: { left: ml, right: mr },
    head: [['Expense', 'Amount', 'Date', 'Note', 'Added By']],
    body: payments.map(p => [
      nameMap[p.expense_id] ?? '',
      formatMoney(toMinorUnits(p.amount)),
      p.paid_on,
      p.note ?? '',
      p.created_by_name ?? '',
    ]),
    styles: tblFont,
    headStyles: tblHead,
    alternateRowStyles: tblAlt,
  })
  afterTable()

  // ── Contributions table ──
  heading('Contributions')

  autoTable(doc, {
    startY: y,
    margin: { left: ml, right: mr },
    head: [['Side', 'Amount', 'Date', 'Note', 'Added By']],
    body: contributions.map(c => [
      c.side === 'groom' ? "Groom's side" : "Bride's side",
      formatMoney(toMinorUnits(c.amount)),
      c.contributed_on,
      c.note ?? '',
      c.created_by_name ?? '',
    ]),
    styles: tblFont,
    headStyles: tblHead,
    alternateRowStyles: tblAlt,
  })

  doc.save(`wedpay-report-${new Date().toISOString().split('T')[0]}.pdf`)
}

// ── Download helper ───────────────────────────────────────────────────────────

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExportSection() {
  const [csvBusy, setCsvBusy] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [error, setError]     = useState('')

  async function handleCSV() {
    setCsvBusy(true)
    setError('')
    try {
      const data = await loadData()
      const csv  = buildCSV(data)
      const date = new Date().toISOString().split('T')[0]
      triggerDownload(csv, `wedpay-export-${date}.csv`, 'text/csv;charset=utf-8;')
    } catch {
      setError('CSV export failed. Please try again.')
    }
    setCsvBusy(false)
  }

  async function handlePDF() {
    setPdfBusy(true)
    setError('')
    try {
      const data = await loadData()
      await buildPDF(data)
    } catch {
      setError('PDF generation failed. Please try again.')
    }
    setPdfBusy(false)
  }

  const busy = csvBusy || pdfBusy

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
        Export / Reports
      </p>

      <div className="space-y-2">
        <button
          onClick={handleCSV}
          disabled={busy}
          className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 text-left active:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <span className="text-2xl leading-none" aria-hidden="true">📊</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Download CSV</p>
            <p className="text-xs text-gray-400">Expenses, payments &amp; contributions</p>
          </div>
          {csvBusy && (
            <span className="text-xs text-gray-400 shrink-0">Generating…</span>
          )}
        </button>

        <button
          onClick={handlePDF}
          disabled={busy}
          className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 text-left active:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <span className="text-2xl leading-none" aria-hidden="true">📄</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Download PDF summary</p>
            <p className="text-xs text-gray-400">Dashboard numbers + all tables</p>
          </div>
          {pdfBusy && (
            <span className="text-xs text-gray-400 shrink-0">Generating…</span>
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">
          {error}
        </p>
      )}
    </div>
  )
}
