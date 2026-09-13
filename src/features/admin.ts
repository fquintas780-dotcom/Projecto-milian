import { supabase } from '../lib/supabase'
import type { AiVerificationResult, PaymentStatus } from '../types'

export interface AdminPayment {
  id: string
  workspace_id: string
  subscription_id: string | null
  user_id: string
  amount: number
  plan: string
  proof_path: string
  payer_name_override: string | null
  ai_result: AiVerificationResult | null
  status: PaymentStatus
  created_at: string
  workspace_name: string
}

export async function fetchPayments(status?: PaymentStatus): Promise<AdminPayment[]> {
  let query = supabase
    .from('payments')
    .select('*, workspace:workspaces(name)')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error || !data) return []
  return data.map((p) => ({
    ...p,
    ai_result: p.ai_result as AiVerificationResult | null,
    status: p.status as PaymentStatus,
    workspace_name: (p.workspace as unknown as { name: string } | null)?.name ?? '—',
  }))
}

export async function getProofSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 120)
  if (error || !data) return null
  return data.signedUrl
}

export async function approvePaymentManually(paymentId: string, subscriptionId: string | null): Promise<void> {
  const { data: session } = await supabase.auth.getUser()
  await supabase
    .from('payments')
    .update({
      status: 'approved_manual',
      reviewed_by: session.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', paymentId)

  if (subscriptionId) {
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)
    await supabase
      .from('subscriptions')
      .update({ status: 'active', current_period_end: periodEnd.toISOString() })
      .eq('id', subscriptionId)
  }
}

export async function rejectPayment(paymentId: string): Promise<void> {
  const { data: session } = await supabase.auth.getUser()
  await supabase
    .from('payments')
    .update({ status: 'rejected', reviewed_by: session.user?.id ?? null, reviewed_at: new Date().toISOString() })
    .eq('id', paymentId)
}
