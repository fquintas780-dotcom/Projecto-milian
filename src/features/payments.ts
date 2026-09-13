import { supabase } from '../lib/supabase'
import type { Plan } from '../types'

export interface SubmitPaymentInput {
  workspaceId: string
  userId: string
  plan: Plan
  amount: number
  file: File
  payerNameOverride: string | null
}

export interface VerifyPaymentResult {
  status: 'auto_approved' | 'pending_review' | 'rejected'
  ai_result: unknown
}

export async function submitPayment(input: SubmitPaymentInput): Promise<VerifyPaymentResult> {
  const extension = input.file.name.split('.').pop() ?? 'bin'
  const path = `${input.userId}/${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(path, input.file, {
    contentType: input.file.type,
  })
  if (uploadError) throw uploadError

  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .insert({ workspace_id: input.workspaceId, plan: input.plan, status: 'pending' })
    .select()
    .single()
  if (subError) throw subError

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      workspace_id: input.workspaceId,
      subscription_id: subscription.id,
      user_id: input.userId,
      amount: input.amount,
      plan: input.plan,
      proof_path: path,
      payer_name_override: input.payerNameOverride,
    })
    .select()
    .single()
  if (paymentError) throw paymentError

  const { data: verification, error: verifyError } = await supabase.functions.invoke('verify-payment', {
    body: { paymentId: payment.id },
  })
  if (verifyError) throw verifyError

  return verification as VerifyPaymentResult
}
