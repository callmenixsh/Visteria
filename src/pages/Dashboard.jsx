import { useEffect, useRef, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Users, Globe, Eye } from 'lucide-react'
import { getApiBaseUrl } from '../config'
import TrendChart from '../components/TrendChart'
import { computePoints } from '../lib/trend'

function formatMonthYear(dateStr) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function bucketDaily(dates, count) {
  const MS_IN_DAY = 24 * 60 * 60 * 1000
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = []
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(todayStart.getTime() - i * MS_IN_DAY)
    const end = new Date(start.getTime() + MS_IN_DAY)
    days.push(dates.filter((d) => d >= start && d < end).length)
  }
  return days
}

function MiniBars({ data }) {
  const max = Math.max(...data, 1)
  const barMax = 44
  return (
    <div className="flex items-end gap-[3px] text-black dark:text-white" aria-hidden>
      {data.map((value, i) => {
        const height = value > 0 ? Math.max(3, Math.round((value / max) * barMax)) : 2
        const pct = value > 0 ? 30 + Math.round((value / max) * 60) : 10
        return (
          <div
            key={i}
            className="flex-1 rounded-[2px] transition-colors"
            style={{
              height,
              backgroundColor: `color-mix(in srgb, currentColor ${pct}%, transparent)`,
            }}
          />
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [trendMode, setTrendMode] = useState('year')
  const [timeline, setTimeline] = useState(null)
  const [clientDates, setClientDates] = useState([])
  const [siteDaily, setSiteDaily] = useState(null)
  const [activeTrendPointIndex, setActiveTrendPointIndex] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const didInitialLoad = useRef(false)
  const timelineReqRef = useRef(0)

  // Global stats come straight from the server aggregate (server-authoritative "today").
  const globalStats = useMemo(() => {
    const base = projects.reduce(
      (acc, project) => ({
        totalVisits: acc.totalVisits + (project.totalVisits || 0),
        todayVisits: acc.todayVisits + (project.todayVisits || 0),
        uniqueVisitors: acc.uniqueVisitors + (project.uniqueVisitors || 0),
        totalSites: acc.totalSites + 1,
      }),
      { totalVisits: 0, todayVisits: 0, uniqueVisitors: 0, totalSites: 0 }
    )

    const activeToday = projects.filter((p) => p.todayVisits > 0).length
    const earliestFirstSeen = projects.reduce(
      (earliest, p) =>
        p.firstSeenAt && (!earliest || p.firstSeenAt < earliest) ? p.firstSeenAt : earliest,
      null
    )
    const avgVisitsPerVisitor = base.uniqueVisitors
      ? (base.totalVisits / base.uniqueVisitors).toFixed(1)
      : '0'

    return { ...base, activeToday, earliestFirstSeen, avgVisitsPerVisitor }
  }, [projects])

  // Server timeline points are preferred; fall back to client-computed points from
  // fetched visitor data so the universal graph always renders.
  const activePoints = useMemo(() => {
    if (timeline?.points?.length) return timeline.points
    return computePoints(clientDates, trendMode)
  }, [timeline, clientDates, trendMode])

  const trendData = useMemo(() => {
    const points = activePoints || []
    if (!points.length) return null

    const maxVisits = Math.max(...points.map((point) => point.visits), 1)
    const peakIndex = points.findIndex((point) => point.visits === maxVisits)

    const n = points.length
    const tickIndexes =
      n <= 1
        ? [0]
        : Array.from({ length: 6 }, (_, i) => Math.round((i * (n - 1)) / 5))

    const subtitleByMode = {
      all: 'All visits since tracking began',
      year: 'Last 12 months across all sites',
      month: 'Last 30 days across all sites',
      week: 'Last 7 days across all sites',
      day: 'Last 24 hours across all sites',
    }

    return {
      points,
      maxVisits,
      peakIndex,
      peakLabel: points[peakIndex]?.peakLabel || points[peakIndex]?.shortLabel || '-',
      tickIndexes,
      subtitle: subtitleByMode[trendMode],
    }
  }, [activePoints, trendMode])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setActiveTrendPointIndex(null)
  }, [trendMode, trendData?.points?.length])

  useEffect(() => {
    if (didInitialLoad.current) {
      setTimeline(null)
      fetchTimeline(trendMode)
      return
    }
    didInitialLoad.current = true
  }, [trendMode])

  async function loadData() {
    const apiKey = import.meta.env.VITE_TRACKING_API_KEY || ''

    if (!apiKey) {
      setError('Please set VITE_TRACKING_API_KEY in environment variables')
      setLoading(false)
      return
    }

    try {
      const projectsResponse = await fetch(`${getApiBaseUrl()}/api/projects`, {
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
      const list = projectsData.projects || []
      setProjects(list)
      setError('')

      const siteResult = await fetchSiteVisuals(list)
      if (siteResult) {
        setSiteDaily(siteResult.dailyMap)
        setClientDates(siteResult.allDates)
      }

      await fetchTimeline(trendMode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSiteVisuals(projectList) {
    const apiKey = import.meta.env.VITE_TRACKING_API_KEY || ''
    if (!projectList.length) return null

    const results = await Promise.all(
      projectList.map(async (project) => {
        try {
          const response = await fetch(
            `${getApiBaseUrl()}/api/sites/${encodeURIComponent(project.siteId)}?limit=200`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
              },
            }
          )
          if (!response.ok) return []
          const data = await response.json()
          return { siteId: project.siteId, visitors: data.visitors || [] }
        } catch {
          return []
        }
      })
    )

    const dailyMap = {}
    const allDates = []
    for (const result of results) {
      if (!result.length) continue
      const dates = []
      for (const visitor of result.visitors) {
        for (const visit of visitor.visits || []) {
          const date = new Date(visit.visitedAt || visit.timestamp || visit.date)
          if (!Number.isNaN(date.getTime())) dates.push(date)
        }
      }
      dailyMap[result.siteId] = bucketDaily(dates, 14)
      allDates.push(...dates)
    }

    return { dailyMap, allDates }
  }

  async function fetchTimeline(mode) {
    const reqId = ++timelineReqRef.current
    const apiKey = import.meta.env.VITE_TRACKING_API_KEY || ''
    if (!apiKey) return false

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/timeline?mode=${encodeURIComponent(mode)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
      })

      if (reqId !== timelineReqRef.current) return false
      if (!response.ok) return false

      const data = await response.json()
      if (reqId !== timelineReqRef.current) return false
      if (!data?.points?.length) return false
      setTimeline(data)
      return true
    } catch {
      return false
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
      {/* Global Trend Graph (universal) */}
      {trendData && (
        <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center justify-between gap-2 w-full">
                <h2 className="text-sm font-medium text-black dark:text-white">Visit Trends</h2>
                <p className="text-xs text-black/40 dark:text-white/40 whitespace-nowrap">Peak: <span className="text-black dark:text-white font-medium">{trendData.peakLabel}</span></p>
              </div>
              <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">{trendData.subtitle}</p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <div className="inline-flex items-center p-0.5 rounded-full bg-black/5 dark:bg-white/5 overflow-x-auto max-w-[260px] sm:max-w-none">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'year', label: 'Year' },
                  { key: 'month', label: 'Month' },
                  { key: 'week', label: 'Week' },
                  { key: 'day', label: 'Day' },
                ].map((mode) => (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => setTrendMode(mode.key)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                      trendMode === mode.key
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                        : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <TrendChart
            points={trendData.points}
            maxVisits={trendData.maxVisits}
            activeIndex={activeTrendPointIndex}
            onSelect={(i) => setActiveTrendPointIndex((prev) => (prev === i ? null : i))}
          />
          {globalStats.totalVisits === 0 && (
            <p className="text-[11px] text-black/35 dark:text-white/35 text-center mt-3">
              No visits recorded yet
            </p>
          )}
          <div className="hidden sm:flex justify-between text-[10px] text-black/40 dark:text-white/40 mt-3">
            {trendData.tickIndexes.map((i) => (
              <span key={i} className={trendData.peakIndex === i ? 'text-black dark:text-white font-medium' : ''}>
                {trendData.points[i]?.shortLabel}
              </span>
            ))}
          </div>
          <div className="flex sm:hidden justify-between text-[10px] text-black/40 dark:text-white/40 mt-3">
            {[0, Math.floor((trendData.points.length - 1) / 2), trendData.points.length - 1].map((i) => (
              <span key={i} className={trendData.peakIndex === i ? 'text-black dark:text-white font-medium' : ''}>
                {trendData.points[i]?.shortLabel}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      {projects.length > 0 && (() => {
        const todayShare = globalStats.totalVisits
          ? Math.round((globalStats.todayVisits / globalStats.totalVisits) * 100)
          : 0
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-black/40 dark:text-white/40" />
                <span className="text-xs font-medium text-black/50 dark:text-white/50">Today</span>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-black dark:text-white">{globalStats.todayVisits}</p>
              <div className="mt-2.5">
                <div className="flex justify-between text-[10px] text-black/40 dark:text-white/40 mb-1">
                  <span>{todayShare}% of all-time</span>
                  <span>live</span>
                </div>
                <div className="h-1 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-black/40 dark:bg-white/40"
                    style={{ width: `${todayShare}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-black/40 dark:text-white/40" />
                <span className="text-xs font-medium text-black/50 dark:text-white/50">Total Visits</span>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-black dark:text-white">{globalStats.totalVisits}</p>
              {globalStats.earliestFirstSeen && (
                <p className="mt-2.5 text-[10px] text-black/40 dark:text-white/40">Since {formatMonthYear(globalStats.earliestFirstSeen)}</p>
              )}
            </div>
            <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-black/40 dark:text-white/40" />
                <span className="text-xs font-medium text-black/50 dark:text-white/50">Visitors</span>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-black dark:text-white">{globalStats.uniqueVisitors}</p>
              <p className="mt-2.5 text-[10px] text-black/40 dark:text-white/40">{globalStats.avgVisitsPerVisitor} visits / visitor</p>
            </div>
            <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-black/40 dark:text-white/40" />
                <span className="text-xs font-medium text-black/50 dark:text-white/50">Sites</span>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-black dark:text-white">{globalStats.totalSites}</p>
              <p className="mt-2.5 text-[10px] text-black/40 dark:text-white/40">{globalStats.activeToday} active today</p>
            </div>
          </div>
        )
      })()}

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
            <Globe className="w-6 h-6 text-black/40 dark:text-white/40" />
          </div>
          <p className="text-black/60 dark:text-white/60">No visits yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projects.map((project) => (
            <Link
              key={project.siteId}
              to={`/sites/${encodeURIComponent(project.siteId)}`}
              className="group bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4 hover:border-black/20 dark:hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 pr-2">
                  <h3 className="font-medium text-black dark:text-white truncate">
                    {project.siteName || project.siteId}
                  </h3>
                  {project.firstSeenAt && (
                    <p className="text-[10px] text-black/40 dark:text-white/40 mt-0.5">
                      Since {formatMonthYear(project.firstSeenAt)}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-black/30 dark:text-white/30 group-hover:text-black/60 dark:group-hover:text-white/60 transition-colors flex-shrink-0 mt-0.5" />
              </div>

              <div className="mb-3">
                <MiniBars data={siteDaily?.[project.siteId] || Array(14).fill(0)} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-black/30 dark:text-white/30" />
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