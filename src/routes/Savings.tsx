import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { createSavingsGoal, deleteSavingsGoal, useSavingsGoals } from '../features/savingsGoals'
import { formatKz } from '../lib/format'

function monthsBetween(from: Date, to: Date): number {
  return Math.max(1, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()))
}

export function Savings() {
  const { session, profile } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const goals = useSavingsGoals(currentWorkspace?.id ?? null)

  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [incomePct, setIncomePct] = useState('10')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const months = targetDate ? monthsBetween(new Date(), new Date(targetDate)) : null
  const requiredMonthly =
    months && targetAmount ? Number(targetAmount) / months : null

  const income = profile?.monthly_income ?? 0
  const suggestedFromPct = income > 0 ? (income * Number(incomePct || 0)) / 100 : 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!currentWorkspace || !session || !requiredMonthly) return
    setError(null)
    setSaving(true)
    try {
      await createSavingsGoal({
        workspaceId: currentWorkspace.id,
        userId: session.user.id,
        name,
        targetAmount: Number(targetAmount),
        targetDate,
        monthlyContribution: requiredMonthly,
      })
      setName('')
      setTargetAmount('')
      setTargetDate('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro.')
    } finally {
      setSaving(false)
    }
  }

  const totalMonthlyCommitted = useMemo(
    () => goals.reduce((sum, g) => sum + g.monthly_contribution, 0),
    [goals],
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={handleSubmit} className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Nova meta de poupança</h2>

        <label className="mb-3 block text-sm font-medium text-slate-700">
          Nome da meta
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="mb-3 block text-sm font-medium text-slate-700">
          Valor alvo (Kz)
          <input
            type="number"
            required
            min={0}
            step="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="mb-3 block text-sm font-medium text-slate-700">
          Prazo
          <input
            type="date"
            required
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="mb-3 block text-sm font-medium text-slate-700">
          % da renda que gostarias de destinar (referência)
          <input
            type="number"
            min={0}
            max={100}
            value={incomePct}
            onChange={(e) => setIncomePct(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        {income > 0 && (
          <p className="mb-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            Com {incomePct}% da tua renda, pouparias {formatKz(suggestedFromPct)}/mês.
          </p>
        )}

        {months && requiredMonthly !== null && (
          <p className="mb-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
            Precisas de poupar <strong>{formatKz(requiredMonthly)}/mês</strong> durante {months}{' '}
            {months === 1 ? 'mês' : 'meses'} para atingir esta meta.
            {income > 0 && ` Isto equivale a ${((requiredMonthly / income) * 100).toFixed(1)}% da tua renda.`}
          </p>
        )}

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Criar meta
        </button>
      </form>

      <div className="flex flex-col gap-4">
        {totalMonthlyCommitted > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            Total comprometido em poupanças: <strong>{formatKz(totalMonthlyCommitted)}/mês</strong>
          </div>
        )}
        {goals.map((g) => (
          <div key={g.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">{g.name}</h3>
                <p className="text-sm text-slate-500">
                  Alvo: {formatKz(g.target_amount)} até {g.target_date}
                </p>
              </div>
              <button onClick={() => deleteSavingsGoal(g.id)} className="text-xs text-red-500 hover:underline">
                Remover
              </button>
            </div>
            <p className="mt-3 text-sm font-medium text-brand-700">
              Poupar {formatKz(g.monthly_contribution)}/mês
            </p>
          </div>
        ))}
        {goals.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            Ainda não tens metas de poupança.
          </div>
        )}
      </div>
    </div>
  )
}
