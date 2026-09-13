import { useLiveQuery } from 'dexie-react-hooks'
import { supabase } from '../lib/supabase'
import { db, type LocalSavingsGoal } from '../db/dexie'

export async function refreshSavingsGoals(workspaceId: string): Promise<void> {
  const { data, error } = await supabase.from('savings_goals').select('*').eq('workspace_id', workspaceId)
  if (error || !data) return
  const rows: LocalSavingsGoal[] = data.map((g) => ({ ...g, dirty: false }))
  await db.savingsGoals.bulkPut(rows)
}

export function useSavingsGoals(workspaceId: string | null): LocalSavingsGoal[] {
  return (
    useLiveQuery(async () => {
      if (!workspaceId) return []
      const rows = await db.savingsGoals.where({ workspace_id: workspaceId }).toArray()
      return rows.sort((a, b) => a.target_date.localeCompare(b.target_date))
    }, [workspaceId]) ?? []
  )
}

interface SavingsGoalInput {
  workspaceId: string
  userId: string
  name: string
  targetAmount: number
  targetDate: string
  monthlyContribution: number
}

export async function createSavingsGoal(input: SavingsGoalInput): Promise<void> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const local: LocalSavingsGoal = {
    id,
    workspace_id: input.workspaceId,
    name: input.name,
    target_amount: input.targetAmount,
    target_date: input.targetDate,
    monthly_contribution: input.monthlyContribution,
    created_by: input.userId,
    created_at: now,
    dirty: true,
  }
  await db.savingsGoals.put(local)

  const { error } = await supabase.from('savings_goals').insert({
    id,
    workspace_id: input.workspaceId,
    name: input.name,
    target_amount: input.targetAmount,
    target_date: input.targetDate,
    monthly_contribution: input.monthlyContribution,
    created_by: input.userId,
  })
  if (!error) {
    await db.savingsGoals.update(id, { dirty: false })
  }
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  await db.savingsGoals.delete(id)
  await supabase.from('savings_goals').delete().eq('id', id)
}
