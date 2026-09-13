import { useMemo, useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { useCategories } from '../features/categories'
import { useTransactions } from '../features/transactions'
import { formatKz, monthLabel } from '../lib/format'
import type { LocalTransaction } from '../db/dexie'

function startOfMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

function endOfMonth(year: number, month: number): string {
  const last = new Date(year, month + 1, 0).getDate()
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

function totalsByCategory(transactions: LocalTransaction[], range: string[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense' || t.date < range[0] || t.date > range[1]) continue
    const key = t.category_id ?? 'sem-categoria'
    totals.set(key, (totals.get(key) ?? 0) + t.amount)
  }
  return totals
}

export function History() {
  const { currentWorkspace } = useWorkspace()
  const categories = useCategories(currentWorkspace?.id ?? null)
  const transactions = useTransactions(currentWorkspace?.id ?? null)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  function goToPrevious() {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function goToNext() {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const currentStart = startOfMonth(year, month)
  const currentEnd = endOfMonth(year, month)
  const currentRange = [currentStart, currentEnd]

  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const previousStart = startOfMonth(prevYear, prevMonth)
  const previousEnd = endOfMonth(prevYear, prevMonth)
  const previousRange = [previousStart, previousEnd]

  const currentTotals = useMemo(
    () => totalsByCategory(transactions, currentRange),
    [transactions, currentStart, currentEnd],
  )
  const previousTotals = useMemo(
    () => totalsByCategory(transactions, previousRange),
    [transactions, previousStart, previousEnd],
  )

  const monthTransactions = transactions.filter((t) => t.date >= currentRange[0] && t.date <= currentRange[1])
  const income = monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const comparisons = Array.from(currentTotals.entries()).map(([categoryId, value]) => {
    const category = categories.find((c) => c.id === categoryId)
    const previous = previousTotals.get(categoryId) ?? 0
    const pct = previous > 0 ? ((value - previous) / previous) * 100 : null
    return { name: category?.name ?? 'Sem categoria', value, pct }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <button onClick={goToPrevious} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
          ← Anterior
        </button>
        <h2 className="text-lg font-semibold text-slate-800">{monthLabel(year, month)}</h2>
        <button onClick={goToNext} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
          Seguinte →
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Receitas</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{formatKz(income)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Despesas</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatKz(expense)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Comparação por categoria com o mês anterior</h3>
        {comparisons.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Sem despesas neste mês.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {comparisons.map((c) => (
              <li key={c.name} className="flex items-center justify-between border-b border-slate-50 py-2 text-sm last:border-0">
                <span className="text-slate-700">{c.name}</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{formatKz(c.value)}</span>
                  {c.pct !== null && (
                    <span className={c.pct > 0 ? 'text-red-500' : 'text-emerald-600'}>
                      {c.pct > 0 ? '+' : ''}
                      {c.pct.toFixed(0)}% vs. mês anterior
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
