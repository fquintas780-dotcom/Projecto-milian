import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import {
  createInvite,
  createWorkspace,
  fetchMembers,
  fetchPendingInvites,
  promoteToAdmin,
  redeemInvite,
  removeMember,
  type InviteRow,
  type MemberWithProfile,
} from '../features/workspace'

export function WorkspaceSettings() {
  const { session } = useAuth()
  const { currentWorkspace, workspaces, isAdmin, isOwner, refreshWorkspaces } = useWorkspace()

  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [inviteCodeInput, setInviteCodeInput] = useState('')
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function reload() {
    if (!currentWorkspace) return
    setMembers(await fetchMembers(currentWorkspace.id))
    if (isAdmin) setInvites(await fetchPendingInvites(currentWorkspace.id))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id, isAdmin])

  async function handleCreateWorkspace(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    setError(null)
    setBusy(true)
    try {
      await createWorkspace(newWorkspaceName, session.user.id)
      setNewWorkspaceName('')
      await refreshWorkspaces()
      setNotice('Workspace criado com sucesso.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o workspace.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRedeemInvite(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    setError(null)
    setBusy(true)
    try {
      await redeemInvite(inviteCodeInput, session.user.id)
      setInviteCodeInput('')
      await refreshWorkspaces()
      setNotice('Entraste no workspace com sucesso.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateInvite() {
    if (!currentWorkspace || !session) return
    setError(null)
    try {
      const code = await createInvite(currentWorkspace.id, session.user.id)
      setNotice(`Código gerado: ${code}`)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o convite.')
    }
  }

  async function handlePromote(userId: string) {
    if (!currentWorkspace) return
    await promoteToAdmin(currentWorkspace.id, userId)
    await reload()
  }

  async function handleRemove(userId: string) {
    if (!currentWorkspace) return
    await removeMember(currentWorkspace.id, userId)
    await reload()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Os meus workspaces</h2>
        <ul className="mb-4 flex flex-col gap-2">
          {workspaces.map((w) => (
            <li key={w.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <span className="font-medium text-slate-700">{w.name}</span>
              <span className="flex items-center gap-2 text-xs text-slate-400">
                {w.role === 'admin' ? 'Admin' : 'Membro'} · {w.status === 'active' ? 'Ativo' : 'Bloqueado'}
              </span>
            </li>
          ))}
        </ul>
        <form onSubmit={handleCreateWorkspace} className="flex gap-2">
          <input
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="Nome do novo workspace"
            required
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <button
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Criar
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Entrar com código de convite</h2>
        <form onSubmit={handleRedeemInvite} className="flex gap-2">
          <input
            value={inviteCodeInput}
            onChange={(e) => setInviteCodeInput(e.target.value)}
            placeholder="Código de 8 caracteres"
            required
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <button
            disabled={busy}
            className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
          >
            Entrar
          </button>
        </form>
      </div>

      {currentWorkspace && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Membros de {currentWorkspace.name}</h2>
            {isAdmin && (
              <button onClick={handleCreateInvite} className="text-sm font-medium text-brand-600 hover:underline">
                Gerar convite
              </button>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-700">{m.full_name || m.email}</p>
                  <p className="text-xs text-slate-400">{m.role === 'admin' ? 'Admin' : 'Membro'}</p>
                </div>
                {isAdmin && m.user_id !== session?.user.id && (
                  <div className="flex gap-3 text-xs">
                    {isOwner && m.role !== 'admin' && (
                      <button onClick={() => handlePromote(m.user_id)} className="text-brand-600 hover:underline">
                        Tornar admin
                      </button>
                    )}
                    <button onClick={() => handleRemove(m.user_id)} className="text-red-500 hover:underline">
                      Remover
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {isAdmin && invites.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-600">Convites pendentes</h3>
              <ul className="flex flex-col gap-1 text-sm">
                {invites.map((inv) => (
                  <li key={inv.id} className="font-mono text-slate-500">
                    {inv.code}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {notice && <p className="text-sm text-emerald-600">{notice}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
