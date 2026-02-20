import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import SiteDetail from './pages/SiteDetail'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import { useVisitTracking } from './useVisitTracking'

function AppContent() {
  useVisitTracking()
  
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sites/:siteId" element={<SiteDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}