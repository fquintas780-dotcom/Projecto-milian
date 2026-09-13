import { useEffect } from 'react'
import { refreshCategories } from './categories'
import { refreshTransactions } from './transactions'
import { refreshSavingsGoals } from './savingsGoals'

export function useWorkspaceSync(workspaceId: string | null): void {
  useEffect(() => {
    if (!workspaceId || !navigator.onLine) return
    refreshCategories(workspaceId)
    refreshTransactions(workspaceId)
    refreshSavingsGoals(workspaceId)
  }, [workspaceId])
}
