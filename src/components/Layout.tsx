import { NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { useWorkspaceSync } from '../features/sync'
import { WorkspaceBlockedBanner } from './WorkspaceBlockedBanner'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transacoes', label: 'Transações' },
  { to: '/historico', label: 'Histórico' },
  { to: '/poupanca', label: 'Poupança' },
  { to: '/workspace', label: 'Workspace' },
  { to: '/assinatura', label: 'Assinatura' },
]

export function Layout() {
  const { profile, signOut } = useAuth()
  const { currentWorkspace, workspaces, selectWorkspace } = useWorkspace()
  useWorkspaceSync(currentWorkspace?.id ?? null)

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 sm:flex sm:flex-col">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="text-xl font-semibold text-brand-700">+Tabua</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-200 pt-4 text-sm">
          <p className="truncate font-medium text-slate-700">{profile?.full_name || profile?.email}</p>
          <button onClick={signOut} className="mt-1 text-xs text-slate-400 hover:text-brand-600">
            Terminar sessão
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <select
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
            value={currentWorkspace?.id ?? ''}
            onChange={(e) => selectWorkspace(e.target.value)}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </header>

        {currentWorkspace?.status === 'blocked' && <WorkspaceBlockedBanner workspaceId={currentWorkspace.id} />}

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
