import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { submitPayment, type VerifyPaymentResult } from '../features/payments'
import { env } from '../lib/env'
import { formatKz } from '../lib/format'
import type { Plan } from '../types'

export function Subscription() {
  const { session } = useAuth()
  const { currentWorkspace, workspaces } = useWorkspace()
  const [searchParams] = useSearchParams()

  const targetWorkspaceId = searchParams.get('workspace') ?? currentWorkspace?.id ?? ''
  const targetWorkspace = workspaces.find((w) => w.id === targetWorkspaceId) ?? currentWorkspace

  const [plan, setPlan] = useState<Plan>('basico')
  const [step, setStep] = useState<'plan' | 'upload' | 'result'>('plan')
  const [file, setFile] = useState<File | null>(null)
  const [payerName, setPayerName] = useState('')
  const [copyLabel, setCopyLabel] = useState('Copiar número')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VerifyPaymentResult | null>(null)

  const price = plan === 'pro' ? env.subscriptionPricePro : env.subscriptionPriceBasico

  function handleCopy() {
    navigator.clipboard.writeText(env.mcxNumber)
    setCopyLabel('Copiado!')
    setTimeout(() => setCopyLabel('Copiar número'), 2000)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file || !session || !targetWorkspace) return
    setError(null)
    setSubmitting(true)
    try {
      const verification = await submitPayment({
        workspaceId: targetWorkspace.id,
        userId: session.user.id,
        plan,
        amount: price,
        file,
        payerNameOverride: payerName || null,
      })
      setResult(verification)
      setStep('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível processar o pagamento.')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'result' && result) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {result.status === 'auto_approved' ? (
          <>
            <h2 className="mb-2 text-lg font-semibold text-emerald-700">Pagamento aprovado</h2>
            <p className="text-sm text-slate-600">
              O teu workspace já está ativo. Obrigado por usares o +Tabua.
            </p>
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Verificação automática — recomenda-se confirmação cruzada periódica.
            </p>
          </>
        ) : (
          <>
            <h2 className="mb-2 text-lg font-semibold text-amber-700">Pendente de revisão manual</h2>
            <p className="text-sm text-slate-600">
              Recebemos o teu comprovativo. A nossa equipa vai confirmar o pagamento manualmente e ativar o
              workspace assim que possível.
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Assinatura</h1>
        {targetWorkspace && <p className="text-sm text-slate-500">Para o workspace: {targetWorkspace.name}</p>}
      </div>

      {step === 'plan' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                { id: 'basico' as Plan, label: 'Básico', price: env.subscriptionPriceBasico, desc: '1 workspace' },
                { id: 'pro' as Plan, label: 'Pro', price: env.subscriptionPricePro, desc: 'Até 5 workspaces' },
              ]
            ).map((option) => (
              <button
                key={option.id}
                onClick={() => setPlan(option.id)}
                className={clsx(
                  'rounded-2xl border p-5 text-left shadow-sm transition-colors',
                  plan === option.id ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white',
                )}
              >
                <p className="text-sm font-semibold text-slate-700">{option.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{formatKz(option.price)}</p>
                <p className="mt-1 text-xs text-slate-500">{option.desc}</p>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Pagar por Multicaixa Express</h2>
            <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-lg font-mono font-semibold text-slate-800">{env.mcxNumber}</span>
              <button
                onClick={handleCopy}
                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-white"
              >
                {copyLabel}
              </button>
            </div>
            <p className="text-sm text-slate-500">
              Transfere {formatKz(price)} para este número pela app MCX Express e depois confirma abaixo.
            </p>
            <button
              onClick={() => setStep('upload')}
              className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Já paguei — confirmar pagamento
            </button>
          </div>
        </>
      )}

      {step === 'upload' && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Enviar comprovativo</h2>

          <label className="mb-3 block text-sm font-medium text-slate-700">
            Comprovativo (imagem ou PDF)
            <input
              type="file"
              accept="image/*,application/pdf"
              required
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm"
            />
          </label>

          <label className="mb-4 block text-sm font-medium text-slate-700">
            Nome de quem pagou (opcional, se diferente do titular da conta)
            <input
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? 'A enviar…' : 'Enviar comprovativo'}
            </button>
            <button
              type="button"
              onClick={() => setStep('plan')}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
            >
              Voltar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
