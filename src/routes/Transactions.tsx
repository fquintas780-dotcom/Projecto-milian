import { useState, type FormEvent } from 'react'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { useCategories } from '../features/categories'
import { createTransaction, deleteTransaction, updateTransaction, useTransactions } from '../features/transactions'
import { formatKz } from '../lib/format'
import type { TransactionType } from '../types'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function Transactions() {
  const { session } = useAuth()
  const { currentWorkspace, isAdmin } = useWorkspace()
  const categories = useCategories(currentWorkspace?.id ?? null)
  const transactions = useTransactions(currentWorkspace?.id ?? null)

  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayIso())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setType('expense')
    setAmount('')
    setCategoryId('')
    setDescription('')
    setDate(todayIso())
    setEditingId(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!currentWorkspace || !session) return
    setError(null)

    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Indica um valor válido.')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateTransaction(editingId, {
          amount: value,
          type,
          categoryId: categoryId || null,
          description: description || null,
          date,
        })
      } else {
        await createTransaction({
          workspaceId: currentWorkspace.id,
          userId: session.user.id,
          amount: value,
          type,
          categoryId: categoryId || null,
          description: description || null,
          date,
        })
      }
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro.')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(id: string) {
    const tx = transactions.find((t) => t.id === id)
    if (!tx) return
    setEditingId(id)
    setType(tx.type)
    setAmount(String(tx.amount))
    setCategoryId(tx.category_id ?? '')
    setDescription(tx.description ?? '')
    setDate(tx.date)
  }

  const canManage = (userId: string) => isAdmin || userId === session?.user.id

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <form onSubmit={handleSubmit} className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          {editingId ? 'Editar transação' : 'Nova transação'}
        </h2>

        <div className="mb-3 flex gap-2">
          {(['expense', 'income'] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={clsx(
                'flex-1 rounded-lg border px-3 py-2 text-sm font-medium',
                type === t ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500',
              )}
            >
              {t === 'expense' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>

        <label className="mb-3 block text-sm font-medium text-slate-700">
          Valor (Kz)
          <input
            type="number"
            required
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="mb-3 block text-sm font-medium text-slate-700">
          Categoria
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-3 block text-sm font-medium text-slate-700">
          Descrição
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="mb-4 block text-sm font-medium text-slate-700">
          Data
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {editingId ? 'Guardar' : 'Adicionar'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const category = categories.find((c) => c.id === t.category_id)
              return (
                <tr key={t.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 text-slate-500">{t.date}</td>
                  <td className="px-4 py-3 text-slate-700">{t.description || '—'}</td>
                  <td className="px-4 py-3">
                    {category && (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `${category.color}20`, color: category.color }}
                      >
                        {category.name}
                      </span>
                    )}
                  </td>
                  <td
                    className={clsx(
                      'px-4 py-3 text-right font-medium',
                      t.type === 'income' ? 'text-emerald-600' : 'text-slate-800',
                    )}
                  >
                    {t.type === 'income' ? '+' : '-'}
                    {formatKz(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage(t.user_id) && (
                      <div className="flex justify-end gap-2 text-xs">
                        <button onClick={() => startEdit(t.id)} className="text-brand-600 hover:underline">
                          Editar
                        </button>
                        <button
                          onClick={() => deleteTransaction(t.id)}
                          className="text-red-500 hover:underline"
                        >
                          Apagar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Ainda não há transações.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
