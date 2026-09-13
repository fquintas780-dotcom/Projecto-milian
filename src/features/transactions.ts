import { useLiveQuery } from 'dexie-react-hooks'
import { supabase } from '../lib/supabase'
import { db, type LocalTransaction } from '../db/dexie'
import type { TransactionType } from '../types'
import type { Database } from '../types/database'

type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export async function refreshTransactions(workspaceId: string): Promise<void> {
  const { data, error } = await supabase.from('transactions').select('*').eq('workspace_id', workspaceId)
  if (error || !data) return

  const dirtyIds = new Set(
    (await db.transactions.where({ workspace_id: workspaceId }).filter((t) => t.dirty).toArray()).map((t) => t.id),
  )

  const rows: LocalTransaction[] = data
    .filter((t) => !dirtyIds.has(t.id))
    .map((t) => ({ ...t, type: t.type as TransactionType, synced: true, dirty: false }))
  await db.transactions.bulkPut(rows)
}

export function useTransactions(workspaceId: string | null): LocalTransaction[] {
  return (
    useLiveQuery(async () => {
      if (!workspaceId) return []
      const rows = await db.transactions.where({ workspace_id: workspaceId }).toArray()
      return rows.sort((a, b) => b.date.localeCompare(a.date))
    }, [workspaceId]) ?? []
  )
}

interface TransactionInput {
  workspaceId: string
  userId: string
  amount: number
  type: TransactionType
  categoryId: string | null
  description: string | null
  date: string
}

export async function createTransaction(input: TransactionInput): Promise<void> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const local: LocalTransaction = {
    id,
    workspace_id: input.workspaceId,
    user_id: input.userId,
    amount: input.amount,
    type: input.type,
    category_id: input.categoryId,
    description: input.description,
    date: input.date,
    created_at: now,
    updated_at: now,
    synced: false,
    dirty: true,
  }
  await db.transactions.put(local)

  const { error } = await supabase.from('transactions').insert({
    id,
    workspace_id: input.workspaceId,
    user_id: input.userId,
    amount: input.amount,
    type: input.type,
    category_id: input.categoryId,
    description: input.description,
    date: input.date,
  })
  if (!error) {
    await db.transactions.update(id, { dirty: false, synced: true })
  }
}

export async function updateTransaction(
  id: string,
  patch: Partial<Pick<TransactionInput, 'amount' | 'type' | 'categoryId' | 'description' | 'date'>>,
): Promise<void> {
  const localPatch: Partial<LocalTransaction> = { dirty: true }
  if (patch.amount !== undefined) localPatch.amount = patch.amount
  if (patch.type !== undefined) localPatch.type = patch.type
  if (patch.categoryId !== undefined) localPatch.category_id = patch.categoryId
  if (patch.description !== undefined) localPatch.description = patch.description
  if (patch.date !== undefined) localPatch.date = patch.date

  await db.transactions.update(id, localPatch)

  const remotePatch: TransactionUpdate = {
    amount: patch.amount,
    type: patch.type,
    category_id: patch.categoryId,
    description: patch.description,
    date: patch.date,
  }
  const { error } = await supabase.from('transactions').update(remotePatch).eq('id', id)
  if (!error) {
    await db.transactions.update(id, { dirty: false })
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id)
  await supabase.from('transactions').delete().eq('id', id)
}
