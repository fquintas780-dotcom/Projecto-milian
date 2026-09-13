import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { db } from '../db/dexie'

export function Onboarding() {
  const { session, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!session) return <Navigate to="/login" replace />
  if (profile?.monthly_income != null) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const income = Number(monthlyIncome)
      if (!Number.isFinite(income) || income < 0) {
        throw new Error('Indica um valor de renda válido.')
      }

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: session!.user.id,
        email: session!.user.email ?? '',
        full_name: fullName || null,
        phone: phone || null,
        monthly_income: income,
      })
      if (profileError) throw profileError

      const { data: existing } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .limit(1)

      if (!existing || existing.length === 0) {
        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .insert({ name: fullName ? `Workspace de ${fullName}` : 'O meu workspace', owner_id: session!.user.id })
          .select()
          .single()
        if (workspaceError) throw workspaceError

        const { error: memberError } = await supabase
          .from('workspace_members')
          .insert({ workspace_id: workspace.id, user_id: session!.user.id, role: 'admin' })
        if (memberError) throw memberError
      }

      await db.profile.put({
        id: session!.user.id,
        email: session!.user.email ?? '',
        full_name: fullName || null,
        phone: phone || null,
        monthly_income: income,
        created_at: new Date().toISOString(),
      })

      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-brand-700">Bem-vindo ao +Tabua</h1>
        <p className="mb-6 text-sm text-slate-500">
          Vamos configurar o teu perfil para começares a gerir as tuas finanças.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-700">
            Nome completo
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Número de telefone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9xx xxx xxx"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Renda fixa mensal (Kz)
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Continuar
          </button>
        </form>
      </div>
    </div>
  )
}
