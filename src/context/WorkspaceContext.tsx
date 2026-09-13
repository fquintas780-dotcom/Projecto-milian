import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { db, getCurrentWorkspaceId, setCurrentWorkspaceId } from '../db/dexie'
import type { MemberRole, Workspace } from '../types'
import { useAuth } from './AuthContext'

interface WorkspaceSummary extends Workspace {
  role: MemberRole
}

interface WorkspaceContextValue {
  workspaces: WorkspaceSummary[]
  currentWorkspace: WorkspaceSummary | null
  isAdmin: boolean
  isOwner: boolean
  loading: boolean
  selectWorkspace: (id: string) => Promise<void>
  refreshWorkspaces: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refreshWorkspaces() {
    if (!session) {
      setWorkspaces([])
      setLoading(false)
      return
    }
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('role, workspace:workspaces(*)')
      .eq('user_id', session.user.id)

    const list: WorkspaceSummary[] = (memberships ?? [])
      .filter((m) => m.workspace)
      .map((m) => ({ ...(m.workspace as unknown as Workspace), role: m.role as MemberRole }))

    setWorkspaces(list)
    await db.workspaces.bulkPut(list)

    const stored = await getCurrentWorkspaceId()
    const validStored = list.find((w) => w.id === stored)
    const next = validStored?.id ?? list[0]?.id ?? null
    if (next) {
      setCurrentId(next)
      await setCurrentWorkspaceId(next)
    }
    setLoading(false)
  }

  useEffect(() => {
    refreshWorkspaces()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id])

  async function selectWorkspace(id: string) {
    setCurrentId(id)
    await setCurrentWorkspaceId(id)
  }

  const currentWorkspace = workspaces.find((w) => w.id === currentId) ?? null

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        isAdmin: currentWorkspace?.role === 'admin',
        isOwner: currentWorkspace?.owner_id === session?.user.id,
        loading,
        selectWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace deve ser usado dentro de WorkspaceProvider')
  return ctx
}
