import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
import NotificationCenter from './components/ui/NotificationCenter.jsx'
import './styles/theme.css'
import './styles/discovery.css'
import './styles/navigation.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary><App /></ErrorBoundary>
        <NotificationCenter />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
