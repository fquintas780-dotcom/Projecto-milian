import { Link } from 'react-router-dom'

export function WorkspaceBlockedBanner({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="flex flex-col items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-center sm:flex-row sm:justify-between sm:px-6">
      <p className="text-sm font-medium text-amber-900">
        Este workspace está bloqueado. Os dados estão guardados em segurança, mas ninguém pode
        acedê-los até haver uma assinatura ativa para este workspace.
      </p>
      <Link
        to={`/assinatura?workspace=${workspaceId}`}
        className="whitespace-nowrap rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Assinar agora
      </Link>
    </div>
  )
}
