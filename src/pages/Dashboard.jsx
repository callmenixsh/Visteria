import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, TrendingUp, Users, Globe } from 'lucide-react'

const API_BASE_URL = 'https://visteria.vercel.app'

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    const apiKey = import.meta.env.VITE_TRACKING_API_KEY || ''

    if (!apiKey) {
      setError('Please set VITE_TRACKING_API_KEY in environment variables')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || `Request failed (${response.status})`)
      }

      const data = await response.json()
      setProjects(data.projects || [])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
          <Globe className="w-6 h-6 text-black/40 dark:text-white/40" />
        </div>
        <p className="text-black/70 dark:text-white/70 mb-3">{error}</p>
        <Link 
          to="/settings" 
          className="text-sm font-medium text-black dark:text-white hover:underline"
        >
          Go to Settings →
        </Link>
      </div>
    )
  }

  const globalStats = projects.reduce(
    (acc, project) => ({
      totalVisits: acc.totalVisits + (project.totalVisits || 0),
      todayVisits: acc.todayVisits + (project.todayVisits || 0),
      totalSites: acc.totalSites + 1,
    }),
    { totalVisits: 0, todayVisits: 0, totalSites: 0 }
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-black dark:text-white">Dashboard</h1>

      {projects.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-black/40 dark:text-white/40" />
              <span className="text-xs font-medium text-black/50 dark:text-white/50">Sites</span>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-black dark:text-white">{globalStats.totalSites}</p>
          </div>
          <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-black/40 dark:text-white/40" />
              <span className="text-xs font-medium text-black/50 dark:text-white/50">Today</span>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-black dark:text-white">{globalStats.todayVisits}</p>
          </div>
          <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-black/40 dark:text-white/40" />
              <span className="text-xs font-medium text-black/50 dark:text-white/50">Total</span>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-black dark:text-white">{globalStats.totalVisits}</p>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
            <Globe className="w-6 h-6 text-black/40 dark:text-white/40" />
          </div>
          <p className="text-black/60 dark:text-white/60">No projects tracked yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projects.map((project) => (
            <Link
              key={project.siteId}
              to={`/sites/${encodeURIComponent(project.siteId)}`}
              className="group bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4 hover:border-black/20 dark:hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium text-black dark:text-white truncate pr-2">
                  {project.siteName || project.siteId}
                </h3>
                <ChevronRight className="w-4 h-4 text-black/30 dark:text-white/30 group-hover:text-black/60 dark:group-hover:text-white/60 transition-colors flex-shrink-0 mt-0.5" />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-black/30 dark:text-white/30" />
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-black dark:text-white leading-tight">{project.todayVisits || 0}</p>
                    <p className="text-[10px] text-black/40 dark:text-white/40">Today</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-black/30 dark:text-white/30" />
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-black dark:text-white leading-tight">{project.totalVisits || 0}</p>
                    <p className="text-[10px] text-black/40 dark:text-white/40">Total</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-black/30 dark:text-white/30" />
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-black dark:text-white leading-tight">{project.uniqueVisitors || 0}</p>
                    <p className="text-[10px] text-black/40 dark:text-white/40">Unique</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
