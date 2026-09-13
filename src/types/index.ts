export type Plan = 'basico' | 'pro'
export type WorkspaceStatus = 'active' | 'blocked'
export type MemberRole = 'admin' | 'member'
export type TransactionType = 'income' | 'expense'
export type InviteStatus = 'pending' | 'used' | 'revoked'
export type SubscriptionStatus = 'active' | 'pending' | 'blocked'
export type PaymentStatus = 'auto_approved' | 'pending_review' | 'approved_manual' | 'rejected'

export interface Profile {
  id: string
  email: string
  phone: string | null
  full_name: string | null
  monthly_income: number | null
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  owner_id: string
  plan: Plan
  status: WorkspaceStatus
  created_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: MemberRole
  joined_at: string
}

export interface Invite {
  id: string
  workspace_id: string
  code: string
  status: InviteStatus
  created_by: string
  used_by: string | null
  used_at: string | null
  created_at: string
}

export interface Category {
  id: string
  workspace_id: string | null
  name: string
  color: string
  icon: string | null
}

export interface Transaction {
  id: string
  workspace_id: string
  user_id: string
  amount: number
  type: TransactionType
  category_id: string | null
  description: string | null
  date: string
  created_at: string
  updated_at: string
  synced: boolean
  deleted?: boolean
}

export interface SavingsGoal {
  id: string
  workspace_id: string
  name: string
  target_amount: number
  target_date: string
  monthly_contribution: number
  created_by: string
  created_at: string
}

export interface Subscription {
  id: string
  workspace_id: string
  plan: Plan
  status: SubscriptionStatus
  current_period_end: string | null
  created_at: string
}

export interface Payment {
  id: string
  workspace_id: string
  user_id: string
  amount: number
  proof_path: string
  payer_name_override: string | null
  ai_result: AiVerificationResult | null
  status: PaymentStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface AiVerificationResult {
  valores_extraidos: {
    valor: number | null
    data: string | null
    numero_destino: string | null
    referencia: string | null
  }
  valores_batem: boolean
  sinais_suspeitos: string[]
  confianca: 'alta' | 'média' | 'baixa'
  recomendacao: 'aprovar_automaticamente' | 'revisao_manual'
}
