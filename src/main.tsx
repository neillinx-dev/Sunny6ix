import { createRoot } from 'react-dom/client'
import { lazy, Suspense } from 'react'
import './index.css'
import App from './App'
import LandingPage from './components/Landing/LandingPage'

// Admin route is dev-only. The `import.meta.env.DEV` ternary collapses to
// `false` in production, so Vite tree-shakes the lazy() import and the
// AdminPage chunk never makes it into the production bundle.
const AdminPage = import.meta.env.DEV
  ? lazy(() => import('./components/Admin/AdminPage'))
  : null

const path = window.location.pathname
const isAdminRoute = path.startsWith('/admin') && import.meta.env.DEV
const isAppRoute = path.startsWith('/app') || isAdminRoute
document.body.dataset.route = isAdminRoute ? 'admin' : isAppRoute ? 'app' : 'landing'

function Root() {
  if (isAdminRoute && AdminPage) {
    return (
      <Suspense fallback={<div style={{ padding: 32 }}>Loading admin…</div>}>
        <AdminPage />
      </Suspense>
    )
  }
  if (isAppRoute) return <App />
  return <LandingPage />
}

createRoot(document.getElementById('root')!).render(<Root />)
