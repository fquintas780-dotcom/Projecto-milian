import Dexie, { type EntityTable } from 'dexie'
import type { Category, Profile, SavingsGoal, Transaction, Workspace, WorkspaceMember } from '../types'

export interface LocalTransaction extends Transaction {
  dirty: boolean
}

export interface LocalSavingsGoal extends SavingsGoal {
  dirty: boolean
}

export interface KeyValue {
  key: string
  value: string
}

class TabuaDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>
  workspaces!: EntityTable<Workspace, 'id'>
  workspaceMembers!: EntityTable<WorkspaceMember, 'id'>
  categories!: EntityTable<Category, 'id'>
  transactions!: EntityTable<LocalTransaction, 'id'>
  savingsGoals!: EntityTable<LocalSavingsGoal, 'id'>
  kv!: EntityTable<KeyValue, 'key'>

  constructor() {
    super('tabua')
    this.version(1).stores({
      profile: 'id',
      workspaces: 'id, owner_id',
      workspaceMembers: 'id, workspace_id, user_id',
      categories: 'id, workspace_id',
      transactions: 'id, workspace_id, user_id, date, dirty',
      savingsGoals: 'id, workspace_id, dirty',
      kv: 'key',
    })
  }
}

export const db = new TabuaDB()

export async function getCurrentWorkspaceId(): Promise<string | null> {
  const row = await db.kv.get('currentWorkspaceId')
  return row?.value ?? null
}

export async function setCurrentWorkspaceId(id: string): Promise<void> {
  await db.kv.put({ key: 'currentWorkspaceId', value: id })
}
