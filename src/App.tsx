import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { Layout } from './components/Layout'
import { Login } from './routes/Login'
import { Onboarding } from './routes/Onboarding'
import { env } from './lib/env'

const Dashboard = lazy(() => import('./routes/Dashboard').then((m) => ({ default: m.Dashboard })))
const Transactions = lazy(() => import('./routes/Transactions').then((m) => ({ default: m.Transactions })))
const History = lazy(() => import('./routes/History').then((m) => ({ default: m.History })))
const Savings = lazy(() => import('./routes/Savings').then((m) => ({ default: m.Savings })))
const WorkspaceSettings = lazy(() =>
  import('./routes/WorkspaceSettings').then((m) => ({ default: m.WorkspaceSettings })),
)
const Subscription = lazy(() => import('./routes/Subscription').then((m) => ({ default: m.Subscription })))
const Admin = lazy(() => import('./routes/Admin').then((m) => ({ default: m.Admin })))

function PageFallback() {
  return <div className="flex justify-center py-16 text-slate-400">A carregar…</div>
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">A carregar…</div>
  }
  if (!session) return <Navigate to="/login" replace />
  if (profile?.monthly_income == null) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  if (!env.superAdminEmail || profile?.email !== env.superAdminEmail) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/transacoes" element={<Transactions />} />
              <Route path="/historico" element={<History />} />
              <Route path="/poupanca" element={<Savings />} />
              <Route path="/workspace" element={<WorkspaceSettings />} />
              <Route path="/assinatura" element={<Subscription />} />
              <Route
                path="/admin"
                element={
                  <RequireSuperAdmin>
                    <Admin />
                  </RequireSuperAdmin>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </WorkspaceProvider>
    </AuthProvider>
  )
}
