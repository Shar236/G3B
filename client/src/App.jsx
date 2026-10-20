import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { PageLoader, StateBlock } from './components/ui/StateBlock.jsx'
import { ADMIN_BASE, adminPath } from './config/adminRoute.js'
import PublicLayout from './components/layout/PublicLayout.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import ForgotPassword from './pages/admin/ForgotPassword.jsx'
import ResetPassword from './pages/admin/ResetPassword.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import Enquiries from './pages/admin/Enquiries.jsx'
import EnquiryDetail from './pages/admin/EnquiryDetail.jsx'
import ContentResource from './pages/admin/ContentResource.jsx'
import ContentBlocks from './pages/admin/ContentBlocks.jsx'
import Settings from './pages/admin/Settings.jsx'
import Users from './pages/admin/Users.jsx'
import SeoManager from './pages/admin/SeoManager.jsx'
import SeoHealth from './pages/admin/SeoHealth.jsx'
import MediaLibrary from './pages/admin/MediaLibrary.jsx'
import RedirectManager from './pages/admin/RedirectManager.jsx'
import Integrations from './pages/admin/Integrations.jsx'
import AuditLogs from './pages/admin/AuditLogs.jsx'
import { resourceConfigs } from './pages/admin/resourceConfigs.js'

import ServicesPage from './pages/ServicesPage.jsx'
import InsightPage from './pages/InsightPage.jsx'
import Unsubscribe from './pages/Unsubscribe.jsx'
import Subscribers from './pages/admin/Subscribers.jsx'
import Videos from './pages/admin/Videos.jsx'

/** Gate the admin area behind an authenticated administrator session. */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader label="Checking your session…" />
  if (!user) return <Navigate to={adminPath('login')} replace state={{ from: location.pathname }} />

  return children
}

function RoleGate({ roles }) {
  const { user } = useAuth()
  return roles.includes(user?.role) ? <Outlet /> : <StateBlock variant="error" title="Access restricted" message="Your role does not have access to this part of the dashboard. Choose an available section from the navigation." />
}

export default function App() {
  return (
    <Routes>
      {/* Convenient shortcuts for admin login */}
      <Route path="/admin" element={<Navigate to={adminPath('login')} replace />} />
      <Route path="/admin/login" element={<Navigate to={adminPath('login')} replace />} />
      <Route path="/login" element={<Navigate to={adminPath('login')} replace />} />

      {/* Admin authentication (private, unlinked, noindex) */}
      <Route path={adminPath('login')} element={<AdminLogin />} />
      <Route path={adminPath('forgot-password')} element={<ForgotPassword />} />
      <Route path={adminPath('reset-password')} element={<ResetPassword />} />

      {/* Public website */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/insights" element={<InsightPage />} />
        <Route path="/insights/:slug" element={<InsightPage />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin dashboard */}
      <Route
        path={ADMIN_BASE}
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route element={<RoleGate roles={['admin', 'staff', 'counsellor']} />}>
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="enquiries/school" element={<Enquiries segment="school" />} />
          <Route path="enquiries/:id" element={<EnquiryDetail />} />
          <Route path="subscribers" element={<Subscribers />} />
        </Route>
        <Route element={<RoleGate roles={['admin', 'editor']} />}>
          <Route path="seo" element={<SeoManager />} />
          <Route path="seo/health" element={<SeoHealth />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="redirects" element={<RedirectManager />} />
          {Object.values(resourceConfigs).map((config) => (
            <Route
              key={config.slug}
              path={config.route}
              element={config.slug === 'videos' ? <Videos /> : <ContentResource resource={config.slug} config={config} />}
            />
          ))}
          <Route path="homepage-content" element={<ContentBlocks />} />
        </Route>
        <Route element={<RoleGate roles={['admin']} />}>
          <Route path="integrations" element={<Integrations />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="settings" element={<Settings />} />
          <Route path="users" element={<Users />} />
        </Route>
      </Route>
    </Routes>
  )
}
