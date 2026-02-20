import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/+$/, '')
}

function buildApiUrl(baseUrl, path) {
  const normalizedBase = normalizeBaseUrl(baseUrl)
  if (!normalizedBase) {
    return ''
  }

  if (normalizedBase.toLowerCase().endsWith('/api')) {
    return `${normalizedBase}${path}`
  }

  return `${normalizedBase}/api${path}`
}

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    const apiBaseUrl = localStorage.getItem('visteria.apiBaseUrl') || ''
    const apiKey = localStorage.getItem('visteria.apiKey') || ''

    if (!apiBaseUrl || !apiKey) {
      setError('Please configure API settings first')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(buildApiUrl(apiBaseUrl, '/projects'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
      })

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`)
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg p-4 sm:p-6">
        <p className="text-black dark:text-white font-medium text-sm sm:text-base">{error}</p>
        <Link to="/settings" className="text-black dark:text-white hover:text-black/70 dark:hover:text-white/80 underline mt-2 inline-block text-sm">
          Go to Settings
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
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Analytics Dashboard</h1>
          <p className="text-black/60 dark:text-white/60 mt-1 text-sm sm:text-base">Track visits across all your projects</p>
        </div>
        <button
          onClick={loadProjects}
          className="px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-lg hover:bg-black/80 dark:hover:bg-white/90 transition-colors font-medium shadow-sm text-sm whitespace-nowrap"
        >
          Refresh Data
        </button>
      </div>

      {projects.length > 0 && (
        <div className="bg-white dark:bg-black rounded-xl shadow-sm border border-black/10 dark:border-white/10 p-6 sm:p-8">
          <h2 className="text-base sm:text-lg font-semibold text-black dark:text-white mb-6">Global Statistics</h2>
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-black dark:text-white">{globalStats.totalSites}</div>
              <div className="text-xs sm:text-sm text-black/60 dark:text-white/60 mt-1">Total Sites</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-black dark:text-white">{globalStats.todayVisits}</div>
              <div className="text-xs sm:text-sm text-black/60 dark:text-white/60 mt-1">Visits Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-black dark:text-white">{globalStats.totalVisits}</div>
              <div className="text-xs sm:text-sm text-black/60 dark:text-white/60 mt-1">Total Visits</div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base sm:text-lg font-semibold text-black dark:text-white mb-4">Your Projects</h2>
        {projects.length === 0 ? (
          <div className="bg-white dark:bg-black rounded-xl shadow-sm border border-black/10 dark:border-white/10 p-8 sm:p-12 text-center">
            <p className="text-black/60 dark:text-white/60 text-base sm:text-lg mb-2">No projects tracked yet</p>
            <p className="text-black/50 dark:text-white/50 text-xs sm:text-sm">Add the tracking snippet to your sites to start collecting data</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {projects.map((project) => {
              const avgVisitsPerVisitor = project.uniqueVisitors > 0 
                ? (project.totalVisits / project.uniqueVisitors).toFixed(1) 
                : 0
              const returnRate = project.uniqueVisitors > 0
                ? (((project.totalVisits - project.uniqueVisitors) / project.totalVisits) * 100).toFixed(0)
                : 0
              
              return (
                <Link
                  key={project.siteId}
                  to={`/sites/${encodeURIComponent(project.siteId)}`}
                  className="bg-white dark:bg-black rounded-lg shadow-sm border border-black/10 dark:border-white/10 p-4 sm:p-5 hover:border-black/20 dark:hover:border-white/20 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-black dark:text-white truncate flex-1">
                      {project.siteName || project.siteId}
                    </h3>
                    <svg className="w-5 h-5 text-black/40 dark:text-white/40 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-black/50 dark:text-white/50 mb-1">Today</p>
                      <p className="text-lg sm:text-xl font-bold text-black dark:text-white">{project.todayVisits || 0}</p>
                    </div>

                    <div>
                      <p className="text-xs text-black/50 dark:text-white/50 mb-1">Total</p>
                      <p className="text-lg sm:text-xl font-bold text-black dark:text-white">{project.totalVisits || 0}</p>
                    </div>

                    <div>
                      <p className="text-xs text-black/50 dark:text-white/50 mb-1">Unique</p>
                      <p className="text-lg sm:text-xl font-bold text-black dark:text-white">{project.uniqueVisitors || 0}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-black/10 dark:border-white/10 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-black/50 dark:text-white/50 mb-0.5">Avg per Visitor</p>
                      <p className="text-black dark:text-white font-semibold">{avgVisitsPerVisitor} visits</p>
                    </div>
                    <div>
                      <p className="text-black/50 dark:text-white/50 mb-0.5">Return Rate</p>
                      <p className="text-black dark:text-white font-semibold">{returnRate}%</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
