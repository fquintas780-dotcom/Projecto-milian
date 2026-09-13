import { useLiveQuery } from 'dexie-react-hooks'
import { supabase } from '../lib/supabase'
import { db } from '../db/dexie'
import type { Category } from '../types'

export async function refreshCategories(workspaceId: string): Promise<void> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  if (error || !data) return
  await db.categories.bulkPut(data as Category[])
}

export function useCategories(workspaceId: string | null): Category[] {
  return (
    useLiveQuery(async () => {
      if (!workspaceId) return []
      return db.categories.filter((c) => c.workspace_id === null || c.workspace_id === workspaceId).toArray()
    }, [workspaceId]) ?? []
  )
}
