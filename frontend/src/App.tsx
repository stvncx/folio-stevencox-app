import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import { ToastProvider } from './components/ui'
import { Layout } from './components/Layout'
import { Login } from './views/Login'
import { CV } from './views/CV'
import { TopicalEditor, TopicalList, TopicalNew } from './views/Topical'
import { CustomPreview, TopicalPreview } from './views/Preview'
import { CustomEditor, CustomList, CustomNew } from './views/Custom'
import { ApplicationDetail, ApplicationNew, ApplicationsList } from './views/Applications'
import { ThemeSettings } from './views/Theme'
import { Dashboard } from './views/Dashboard'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })

function Protected({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<Protected><Layout /></Protected>}>
                  <Route path="/cv" element={<CV />} />
                  <Route path="/topical" element={<TopicalList />} />
                  <Route path="/topical/new" element={<TopicalNew />} />
                  <Route path="/topical/:id" element={<TopicalEditor />} />
                  <Route path="/topical/:id/preview" element={<TopicalPreview />} />
                  <Route path="/topical/:id/custom" element={<CustomList />} />
                  <Route path="/topical/:id/custom/new" element={<CustomNew />} />
                  <Route path="/topical/:id/custom/:cid" element={<CustomEditor />} />
                  <Route path="/topical/:id/custom/:cid/preview" element={<CustomPreview />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/applications" element={<ApplicationsList />} />
                  <Route path="/applications/new" element={<ApplicationNew />} />
                  <Route path="/applications/:id" element={<ApplicationDetail />} />
                  <Route path="/settings/theme" element={<ThemeSettings />} />
                </Route>
                <Route path="*" element={<Navigate to="/cv" replace />} />
              </Routes>
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
