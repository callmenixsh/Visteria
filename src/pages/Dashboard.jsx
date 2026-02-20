import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, TrendingUp, Users, Globe } from 'lucide-react'

const API_BASE_URL = 'https://visteria.vercel.app'

function isToday(date) {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function getVisitDate(visit) {
  const candidate = visit?.visitedAt || visit?.timestamp || visit?.date || null
  if (!candidate) return null

  const parsed = new Date(candidate)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [allVisitors, setAllVisitors] = useState([])
  const [siteVisitorsMap, setSiteVisitorsMap] = useState({})
  const [trendMode, setTrendMode] = useState('year')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const displayedProjects = useMemo(() => {
    return projects.map((project) => {
      const visitors = siteVisitorsMap[project.siteId] || []

      if (!visitors.length) {
        return project
      }

      let todayVisits = 0

      visitors.forEach((visitor) => {
        const visits = visitor.visits || []

        visits.forEach((visit) => {
          const visitDate = new Date(visit.visitedAt)
          if (isToday(visitDate)) {
            todayVisits++
          }
        })
      })

      return {
        ...project,
        totalVisits: project.totalVisits || 0,
        todayVisits,
        uniqueVisitors: project.uniqueVisitors || 0,
      }
    })
  }, [projects, siteVisitorsMap])

  // Calculate global stats from displayed projects (must be before conditional returns)
  const globalStats = useMemo(() => {
    return displayedProjects.reduce(
      (acc, project) => ({
        totalVisits: acc.totalVisits + (project.totalVisits || 0),
        todayVisits: acc.todayVisits + (project.todayVisits || 0),
        totalSites: acc.totalSites + 1,
      }),
      { totalVisits: 0, todayVisits: 0, totalSites: 0 }
    )
  }, [displayedProjects])

  const allVisitDates = useMemo(() => {
    const dates = []

    allVisitors.forEach((visitor) => {
      ;(visitor.visits || []).forEach((visit) => {
        const parsedDate = getVisitDate(visit)
        if (parsedDate) {
          dates.push(parsedDate)
        }
      })
    })

    return dates
  }, [allVisitors])

  // Calculate global trend data based on selected mode (must be before conditional returns)
  const trendData = useMemo(() => {
    if (!allVisitDates.length) return null

    const now = new Date()
    const points = []

    if (trendMode === 'year') {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        const visits = allVisitDates.filter((visitDate) => visitDate >= date && visitDate < nextDate).length

        points.push({
          label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          shortLabel: date.toLocaleDateString('en-US', { month: 'short' }),
          visits,
        })
      }
    }

    if (trendMode === 'month') {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        const nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1)
        const visits = allVisitDates.filter((visitDate) => visitDate >= date && visitDate < nextDate).length

        points.push({
          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          shortLabel: String(date.getDate()),
          visits,
        })
      }
    }

    if (trendMode === 'week') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        const nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1)
        const visits = allVisitDates.filter((visitDate) => visitDate >= date && visitDate < nextDate).length

        points.push({
          label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          shortLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
          visits,
        })
      }
    }

    if (trendMode === 'day') {
      for (let i = 23; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - i, 0, 0, 0)
        const nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - i + 1, 0, 0, 0)
        const visits = allVisitDates.filter((visitDate) => visitDate >= date && visitDate < nextDate).length

        points.push({
          label: date.toLocaleTimeString('en-US', { hour: 'numeric' }),
          shortLabel: date.toLocaleTimeString('en-US', { hour: 'numeric' }),
          visits,
        })
      }
    }

    const maxVisits = Math.max(...points.map((point) => point.visits), 1)
    const peakIndex = points.findIndex((point) => point.visits === maxVisits)

    const tickIndexesByMode = {
      year: [0, 2, 4, 6, 8, 10],
      month: [0, 5, 10, 15, 20, 25, 29],
      week: [0, 1, 2, 3, 4, 5, 6],
      day: [0, 4, 8, 12, 16, 20, 23],
    }

    const subtitleByMode = {
      year: 'Last 12 months across all sites',
      month: 'Last 30 days across all sites',
      week: 'Last 7 days across all sites',
      day: 'Last 24 hours across all sites',
    }

    return {
      points,
      maxVisits,
      peakIndex,
      peakLabel: points[peakIndex]?.shortLabel || '-',
      tickIndexes: tickIndexesByMode[trendMode],
      subtitle: subtitleByMode[trendMode],
    }
  }, [allVisitDates, trendMode])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const apiKey = import.meta.env.VITE_TRACKING_API_KEY || ''

    if (!apiKey) {
      setError('Please set VITE_TRACKING_API_KEY in environment variables')
      setLoading(false)
      return
    }

    try {
      // Fetch projects list
      const projectsResponse = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
      })

      if (!projectsResponse.ok) {
        const text = await projectsResponse.text().catch(() => '')
        throw new Error(text || `Request failed (${projectsResponse.status})`)
      }

      const projectsData = await projectsResponse.json()
      const projectsList = projectsData.projects || []
      setProjects(projectsList)

      // Fetch detailed data for each site to build global graph
      const visitorsPromises = projectsList.map(project =>
        fetch(`${API_BASE_URL}/api/sites/${encodeURIComponent(project.siteId)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => ({ siteId: project.siteId, visitors: data?.visitors || [] }))
          .catch(() => ({ siteId: project.siteId, visitors: [] }))
      )

      const allVisitorsData = await Promise.all(visitorsPromises)
      const nextSiteVisitorsMap = allVisitorsData.reduce((acc, item) => {
        acc[item.siteId] = item.visitors
        return acc
      }, {})
      setSiteVisitorsMap(nextSiteVisitorsMap)
      setAllVisitors(allVisitorsData.flatMap(item => item.visitors))
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
          to="/setup" 
          className="text-sm font-medium text-black dark:text-white hover:underline"
        >
          Go to Setup →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-white">Dashboard</h1>
        <p className="text-sm text-black/50 dark:text-white/50 mt-1">Tracking since 20 Feburary 2026</p>
      </div>

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

      {/* Global Trend Graph */}
      {projects.length > 0 && trendData && (
        <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium text-black dark:text-white">Total Visits Trend</h2>
              <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">{trendData.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center p-0.5 rounded-full bg-black/5 dark:bg-white/5">
                {[
                  { key: 'year', label: 'Year' },
                  { key: 'month', label: 'Month' },
                  { key: 'week', label: 'Week' },
                  { key: 'day', label: 'Day' },
                ].map((mode) => (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => setTrendMode(mode.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      trendMode === mode.key
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                        : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-black/40 dark:text-white/40">Peak: <span className="text-black dark:text-white font-medium">{trendData.peakLabel}</span></p>
            </div>
          </div>
          <div className="relative h-52">
            <svg className="w-full h-full" viewBox="0 0 300 160" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 40, 80, 120, 160].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="300"
                  y2={y}
                  className="stroke-black/[0.04] dark:stroke-white/[0.04]"
                  strokeWidth="1"
                />
              ))}
              {/* Area fill */}
              <path
                d={`
                  M 0,${160 - Math.max(0, (trendData.points[0].visits / trendData.maxVisits) * 150)}
                  ${trendData.points.map((d, i) => {
                    const x = (i / Math.max(trendData.points.length - 1, 1)) * 300
                    const y = 160 - Math.max(0, (d.visits / trendData.maxVisits) * 150)
                    return `L ${x},${y}`
                  }).join(' ')}
                  L 300,160
                  L 0,160
                  Z
                `}
                className="fill-black/[0.06] dark:fill-white/[0.06]"
              />
              {/* Line */}
              <path
                d={`
                  M 0,${160 - Math.max(0, (trendData.points[0].visits / trendData.maxVisits) * 150)}
                  ${trendData.points.map((d, i) => {
                    const x = (i / Math.max(trendData.points.length - 1, 1)) * 300
                    const y = 160 - Math.max(0, (d.visits / trendData.maxVisits) * 150)
                    return `L ${x},${y}`
                  }).join(' ')}
                `}
                fill="none"
                className="stroke-black dark:stroke-white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {/* Tooltip layer */}
            <div className="absolute inset-0 flex">
              {trendData.points.map((d, i) => (
                <div key={i} className="flex-1 relative group">
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-black dark:bg-white text-white dark:text-black text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {d.label}: {d.visits}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-black/40 dark:text-white/40 mt-3">
            {trendData.tickIndexes.map((i) => (
              <span key={i} className={trendData.peakIndex === i ? 'text-black dark:text-white font-medium' : ''}>
                {trendData.points[i]?.shortLabel}
              </span>
            ))}
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
          {displayedProjects.map((project) => (
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
