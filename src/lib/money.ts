// All arithmetic uses integer paisa (minor units × 100) to avoid floating-point drift.
// Only divide back to rupees at the display layer via formatMoney.

export function toMinorUnits(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  return Math.round(parseFloat(String(value)) * 100)
}

export function formatMoney(paisa: number): string {
  return (
    'Rs ' +
    new Intl.NumberFormat('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(paisa / 100)
  )
}

export function expenseStatus(paidPaisa: number, costPaisa: number): string {
  if (paidPaisa === 0) return 'Not paid'
  if (paidPaisa < costPaisa) return 'Partly paid'
  if (paidPaisa === costPaisa) return 'Fully paid'
  return 'Overpaid'
}
