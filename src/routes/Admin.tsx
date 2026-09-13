import { useEffect, useState } from 'react'
import clsx from 'clsx'
import {
  approvePaymentManually,
  fetchPayments,
  getProofSignedUrl,
  rejectPayment,
  type AdminPayment,
} from '../features/admin'
import { formatKz } from '../lib/format'
import type { PaymentStatus } from '../types'

const FILTERS: { label: string; value: PaymentStatus | undefined }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Aprovados automaticamente', value: 'auto_approved' },
  { label: 'Pendentes de revisão', value: 'pending_review' },
  { label: 'Aprovados manualmente', value: 'approved_manual' },
  { label: 'Rejeitados', value: 'rejected' },
]

export function Admin() {
  const [filter, setFilter] = useState<PaymentStatus | undefined>('pending_review')
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const data = await fetchPayments(filter)
    setPayments(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function toggleProof(payment: AdminPayment) {
    if (proofUrls[payment.id]) {
      setProofUrls((prev) => {
        const next = { ...prev }
        delete next[payment.id]
        return next
      })
      return
    }
    const url = await getProofSignedUrl(payment.proof_path)
    if (url) setProofUrls((prev) => ({ ...prev, [payment.id]: url }))
  }

  async function handleApprove(payment: AdminPayment) {
    await approvePaymentManually(payment.id, payment.subscription_id)
    await load()
  }

  async function handleReject(payment: AdminPayment) {
    await rejectPayment(payment.id)
    await load()
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-800">Painel de administrador</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={clsx(
              'rounded-full px-3 py-1.5 text-xs font-medium',
              filter === f.value ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">A carregar…</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum pagamento nesta categoria.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {payments.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-800">
                    {p.workspace_name} · {formatKz(p.amount)} · {p.plan === 'pro' ? 'Pro' : 'Básico'}
                  </p>
                  <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleString('pt-PT')}</p>
                  {p.payer_name_override && (
                    <p className="text-xs text-slate-500">Pago por: {p.payer_name_override}</p>
                  )}
                </div>
                <span
                  className={clsx(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    p.status === 'auto_approved' && 'bg-emerald-50 text-emerald-700',
                    p.status === 'approved_manual' && 'bg-emerald-50 text-emerald-700',
                    p.status === 'pending_review' && 'bg-amber-50 text-amber-700',
                    p.status === 'rejected' && 'bg-red-50 text-red-700',
                  )}
                >
                  {p.status}
                </span>
              </div>

              {p.ai_result && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <p>Valores batem: {p.ai_result.valores_batem ? 'Sim' : 'Não'}</p>
                  <p>Confiança: {p.ai_result.confianca}</p>
                  {p.ai_result.sinais_suspeitos.length > 0 && (
                    <p>Sinais suspeitos: {p.ai_result.sinais_suspeitos.join(', ')}</p>
                  )}
                  <p>
                    Extraído: {p.ai_result.valores_extraidos.valor} Kz ·{' '}
                    {p.ai_result.valores_extraidos.numero_destino} · {p.ai_result.valores_extraidos.data}
                  </p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <button onClick={() => toggleProof(p)} className="text-brand-600 hover:underline">
                  {proofUrls[p.id] ? 'Ocultar comprovativo' : 'Ver comprovativo'}
                </button>
                {p.status === 'pending_review' && (
                  <>
                    <button
                      onClick={() => handleApprove(p)}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Aprovar manualmente
                    </button>
                    <button
                      onClick={() => handleReject(p)}
                      className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      Rejeitar
                    </button>
                  </>
                )}
              </div>

              {proofUrls[p.id] && (
                <div className="mt-3">
                  {p.proof_path.endsWith('.pdf') ? (
                    <a href={proofUrls[p.id]} target="_blank" rel="noreferrer" className="text-sm text-brand-600 underline">
                      Abrir PDF
                    </a>
                  ) : (
                    <img src={proofUrls[p.id]} alt="Comprovativo" className="max-h-96 rounded-lg border border-slate-200" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
