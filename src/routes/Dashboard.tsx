import { useMemo } from 'react'
import { Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useWorkspace } from '../context/WorkspaceContext'
import { useCategories } from '../features/categories'
import { useTransactions } from '../features/transactions'
import { formatKz } from '../lib/format'

function monthKey(date: string): string {
  return date.slice(0, 7)
}

export function Dashboard() {
  const { currentWorkspace } = useWorkspace()
  const categories = useCategories(currentWorkspace?.id ?? null)
  const transactions = useTransactions(currentWorkspace?.id ?? null)

  const balance = useMemo(
    () =>
      transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0),
    [transactions],
  )

  const currentMonth = new Date().toISOString().slice(0, 7)

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>()
    for (const t of transactions) {
      if (t.type !== 'expense' || monthKey(t.date) !== currentMonth) continue
      const key = t.category_id ?? 'sem-categoria'
      totals.set(key, (totals.get(key) ?? 0) + t.amount)
    }
    return Array.from(totals.entries()).map(([categoryId, value]) => {
      const category = categories.find((c) => c.id === categoryId)
      return { name: category?.name ?? 'Sem categoria', value, color: category?.color ?? '#94a3b8' }
    })
  }, [transactions, categories, currentMonth])

  const monthlyEvolution = useMemo(() => {
    const totals = new Map<string, { income: number; expense: number }>()
    for (const t of transactions) {
      const key = monthKey(t.date)
      const entry = totals.get(key) ?? { income: 0, expense: 0 }
      if (t.type === 'income') entry.income += t.amount
      else entry.expense += t.amount
      totals.set(key, entry)
    }
    return Array.from(totals.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, v]) => ({ month, saldo: v.income - v.expense }))
  }, [transactions])

  const totalExpenseThisMonth = categoryBreakdown.reduce((sum, c) => sum + c.value, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Saldo atual</p>
        <p className={`mt-1 text-3xl font-semibold ${balance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
          {formatKz(balance)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Gastos por categoria (este mês)</h2>
          {categoryBreakdown.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Sem despesas este mês.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                  {categoryBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatKz(Number(value ?? 0))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
          {totalExpenseThisMonth > 0 && (
            <p className="mt-2 text-center text-sm text-slate-500">Total: {formatKz(totalExpenseThisMonth)}</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Evolução do saldo mensal</h2>
          {monthlyEvolution.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Ainda não há dados suficientes.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyEvolution}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip formatter={(value) => formatKz(Number(value ?? 0))} />
                <Line type="monotone" dataKey="saldo" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
