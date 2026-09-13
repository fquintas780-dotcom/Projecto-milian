import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const { session } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: authError } =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password })
      if (authError) throw authError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-brand-700">+Tabua</h1>
        <p className="mb-6 text-sm text-slate-500">Gestão de finanças pessoais e familiares</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          {mode === 'login' ? 'Ainda não tens conta? Regista-te' : 'Já tens conta? Entra'}
        </button>
      </div>
    </div>
  )
}
