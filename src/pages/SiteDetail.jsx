import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Users, Globe } from 'lucide-react'

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

function isToday(date) {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function isThisWeek(date) {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return date >= weekAgo
}

function isThisMonth(date) {
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

function formatDate(dateStr) {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

export default function SiteDetail() {
  const { siteId } = useParams()
  const [site, setSite] = useState(null)
  const [visitors, setVisitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSiteDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  async function loadSiteDetails() {
    const apiBaseUrl = localStorage.getItem('visteria.apiBaseUrl') || ''
    const apiKey = localStorage.getItem('visteria.apiKey') || ''

    if (!apiBaseUrl || !apiKey) {
      setError('Please configure API settings first')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(buildApiUrl(apiBaseUrl, `/sites/${encodeURIComponent(siteId)}`), {
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
      setSite(data.site)
      setVisitors(data.visitors || [])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load site details')
    } finally {
      setLoading(false)
    }
  }

  // Calculate all stats from visitors data
  const stats = useMemo(() => {
    if (!visitors.length) return null

    const allVisits = visitors.flatMap(v => 
      (v.visits || []).map(visit => ({
        ...visit,
        visitorHash: v.visitorHash,
        date: new Date(visit.visitedAt)
      }))
    )

    const todayVisits = allVisits.filter(v => isToday(v.date))
    const weekVisits = allVisits.filter(v => isThisWeek(v.date))
    const monthVisits = allVisits.filter(v => isThisMonth(v.date))

    const todayUniqueVisitors = new Set(todayVisits.map(v => v.visitorHash)).size
    const weekUniqueVisitors = new Set(weekVisits.map(v => v.visitorHash)).size
    const monthUniqueVisitors = new Set(monthVisits.map(v => v.visitorHash)).size

    const sortedByFirst = [...visitors].sort((a, b) => 
      new Date(a.firstSeenAt) - new Date(b.firstSeenAt)
    )
    const sortedByLast = [...visitors].sort((a, b) => 
      new Date(b.lastSeenAt) - new Date(a.lastSeenAt)
    )

    const firstVisitEver = sortedByFirst[0]?.firstSeenAt
    const lastActivity = sortedByLast[0]?.lastSeenAt

    // Visits by day of week
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const visitsByDay = dayNames.map(() => 0)
    allVisits.forEach(v => {
      visitsByDay[v.date.getDay()]++
    })
    const maxDayVisits = Math.max(...visitsByDay, 1)
    const peakDayIndex = visitsByDay.indexOf(maxDayVisits)
    const peakDay = dayNames[peakDayIndex]

    // Visits by hour
    const visitsByHour = Array(24).fill(0)
    allVisits.forEach(v => {
      visitsByHour[v.date.getHours()]++
    })
    const maxHourVisits = Math.max(...visitsByHour, 1)
    const peakHourIndex = visitsByHour.indexOf(maxHourVisits)
    const peakHour = `${peakHourIndex}:00`

    // Yearly trend (last 12 months)
    const now = new Date()
    const last12Months = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      
      const monthVisitsCount = allVisits.filter(v => v.date >= date && v.date < nextDate).length
      last12Months.push({
        date,
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        shortLabel: date.toLocaleDateString('en-US', { month: 'short' }),
        visits: monthVisitsCount,
      })
    }
    const maxYearlyVisits = Math.max(...last12Months.map(d => d.visits), 1)
    const peakMonthIndex = last12Months.findIndex(d => d.visits === maxYearlyVisits)
    const peakMonth = last12Months[peakMonthIndex]?.shortLabel || ''

    // Recent visitors (last 5)
    const recentVisitors = sortedByLast.slice(0, 5)

    // Best day ever (calendar date with most visits)
    const visitsByDate = {}
    allVisits.forEach(v => {
      const dateKey = v.date.toDateString()
      visitsByDate[dateKey] = (visitsByDate[dateKey] || 0) + 1
    })
    const bestDayEntry = Object.entries(visitsByDate).reduce(
      (best, [date, count]) => (count > best.count ? { date, count } : best),
      { date: null, count: 0 }
    )
    const bestDay = bestDayEntry.date
      ? { date: new Date(bestDayEntry.date), visits: bestDayEntry.count }
      : null

    return {
      todayVisits: todayVisits.length,
      weekVisits: weekVisits.length,
      monthVisits: monthVisits.length,
      todayUniqueVisitors,
      weekUniqueVisitors,
      monthUniqueVisitors,
      firstVisitEver,
      lastActivity,
      visitsByDay,
      dayNames,
      maxDayVisits,
      peakDay,
      visitsByHour,
      maxHourVisits,
      peakHour,
      recentVisitors,
      bestDay,
      last12Months,
      maxYearlyVisits,
      peakMonthIndex,
      peakMonth,
    }
  }, [visitors])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/" className="text-sm text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white inline-flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="bg-white dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-5">
          <p className="text-black/70 dark:text-white/70">{error}</p>
        </div>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="space-y-4">
        <Link to="/" className="text-sm text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white inline-flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="text-center py-16">
          <p className="text-black/60 dark:text-white/60">Site not found</p>
        </div>
      </div>
    )
  }

  // Build site URL from siteId (assume it's a domain or hostname)
  const siteUrl = site.siteId.includes('://') ? site.siteId : `https://${site.siteId}.netlify.app`

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Link to="/" className="text-sm text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white inline-flex items-center gap-1.5 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-xl font-semibold text-black dark:text-white truncate">{site.siteName || site.siteId}</h1>
        </div>
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white border border-black/10 dark:border-white/10 rounded-lg hover:border-black/20 dark:hover:border-white/20 transition-colors"
        >
          Visit
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Globe className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
            <p className="text-xs text-black/50 dark:text-white/50">Total Visits</p>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-black dark:text-white">{site.totalVisits || 0}</p>
        </div>
        <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
            <p className="text-xs text-black/50 dark:text-white/50">Unique Visitors</p>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-black dark:text-white">{site.uniqueVisitors || 0}</p>
        </div>
      </div>

      {stats && (
        <>
          {/* Time-based Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <p className="text-xs text-black/50 dark:text-white/50 mb-1">Today</p>
              <p className="text-xl font-semibold tabular-nums text-black dark:text-white">{stats.todayVisits}</p>
              <p className="text-xs text-black/40 dark:text-white/40 tabular-nums">{stats.todayUniqueVisitors} unique</p>
            </div>
            <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <p className="text-xs text-black/50 dark:text-white/50 mb-1">This Week</p>
              <p className="text-xl font-semibold tabular-nums text-black dark:text-white">{stats.weekVisits}</p>
              <p className="text-xs text-black/40 dark:text-white/40 tabular-nums">{stats.weekUniqueVisitors} unique</p>
            </div>
            <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <p className="text-xs text-black/50 dark:text-white/50 mb-1">This Month</p>
              <p className="text-xl font-semibold tabular-nums text-black dark:text-white">{stats.monthVisits}</p>
              <p className="text-xs text-black/40 dark:text-white/40 tabular-nums">{stats.monthUniqueVisitors} unique</p>
            </div>
          </div>

          {/* Activity Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-black/60 dark:text-white/60">Activity by Day</p>
                <p className="text-xs text-black/40 dark:text-white/40">Peak: <span className="text-black dark:text-white font-medium">{stats.peakDay}</span></p>
              </div>
              <div className="flex items-end gap-2" style={{ height: '96px' }}>
                {stats.visitsByDay.map((count, i) => {
                  const heightPx = stats.maxDayVisits > 0 ? (count / stats.maxDayVisits) * 80 : 0
                  const isPeak = i === stats.visitsByDay.indexOf(stats.maxDayVisits)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end group">
                      <div className="relative w-full flex justify-center">
                        <span className="absolute -top-5 text-[10px] font-medium text-black dark:text-white opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                          {count}
                        </span>
                      </div>
                      <div 
                        className={`w-full rounded-md transition-all duration-200 cursor-default ${
                          isPeak 
                            ? 'bg-black dark:bg-white' 
                            : 'bg-black/20 dark:bg-white/20 group-hover:bg-black/40 dark:group-hover:bg-white/40'
                        }`}
                        style={{ height: `${Math.max(heightPx, count > 0 ? 6 : 2)}px` }}
                      />
                      <span className={`text-[10px] mt-2 transition-colors ${
                        isPeak ? 'text-black dark:text-white font-medium' : 'text-black/40 dark:text-white/40'
                      }`}>{stats.dayNames[i]}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-black/60 dark:text-white/60">Activity by Hour</p>
                <p className="text-xs text-black/40 dark:text-white/40">Peak: <span className="text-black dark:text-white font-medium">{stats.peakHour}</span></p>
              </div>
              <div className="flex items-end h-24 gap-[2px]">
                {stats.visitsByHour.map((count, i) => {
                  const height = stats.maxHourVisits > 0 ? (count / stats.maxHourVisits) * 100 : 0
                  const isPeak = i === stats.visitsByHour.indexOf(stats.maxHourVisits)
                  return (
                    <div 
                      key={i}
                      className={`flex-1 rounded-sm transition-all duration-200 cursor-default group relative ${
                        isPeak 
                          ? 'bg-black dark:bg-white' 
                          : 'bg-black/15 dark:bg-white/15 hover:bg-black/30 dark:hover:bg-white/30'
                      }`}
                      style={{ height: `${height}%`, minHeight: count > 0 ? '3px' : '1px' }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-medium text-black dark:text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap tabular-nums">
                        {i}:00 ({count})
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-[10px] text-black/40 dark:text-white/40 mt-2">
                <span>12am</span>
                <span>6am</span>
                <span>12pm</span>
                <span>6pm</span>
                <span>11pm</span>
              </div>
            </div>
          </div>

          {/* Yearly Trends */}
          <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-black/60 dark:text-white/60">Last 12 Months</p>
              <p className="text-xs text-black/40 dark:text-white/40">Peak: <span className="text-black dark:text-white font-medium">{stats.peakMonth}</span></p>
            </div>
            <div className="relative h-32">
              <svg className="w-full h-full" viewBox="0 0 300 128" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 32, 64, 96, 128].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="300"
                    y2={y}
                    className="stroke-black/[0.06] dark:stroke-white/[0.06]"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {/* Area fill */}
                <path
                  d={`
                    M 0 ${128 - (stats.last12Months[0].visits / stats.maxYearlyVisits) * 120}
                    ${stats.last12Months.map((d, i) => {
                      const x = (i / 11) * 300
                      const y = 128 - (d.visits / stats.maxYearlyVisits) * 120
                      return `L ${x} ${y}`
                    }).join(' ')}
                    L 300 128
                    L 0 128
                    Z
                  `}
                  className="fill-black/[0.06] dark:fill-white/[0.08]"
                />
                {/* Line */}
                <path
                  d={`
                    M 0 ${128 - (stats.last12Months[0].visits / stats.maxYearlyVisits) * 120}
                    ${stats.last12Months.map((d, i) => {
                      const x = (i / 11) * 300
                      const y = 128 - (d.visits / stats.maxYearlyVisits) * 120
                      return `L ${x} ${y}`
                    }).join(' ')}
                  `}
                  fill="none"
                  className="stroke-black dark:stroke-white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Data points */}
                {stats.last12Months.map((d, i) => {
                  const x = (i / 11) * 300
                  const y = 128 - (d.visits / stats.maxYearlyVisits) * 120
                  const isPeak = i === stats.peakMonthIndex
                  return (
                    <g key={i} className="group">
                      <circle
                        cx={x}
                        cy={y}
                        r="10"
                        className="fill-transparent cursor-default"
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={isPeak ? 5 : 4}
                        className={isPeak 
                          ? "fill-black dark:fill-white" 
                          : "fill-black dark:fill-white opacity-0 group-hover:opacity-100 transition-opacity"
                        }
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  )
                })}
              </svg>
              {/* Tooltip layer - rendered outside SVG for better positioning */}
              <div className="absolute inset-0 flex">
                {stats.last12Months.map((d, i) => (
                  <div key={i} className="flex-1 relative group">
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black dark:bg-white text-white dark:text-black text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {d.label}: {d.visits}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-black/40 dark:text-white/40 mt-2">
              {[0, 2, 4, 6, 8, 10].map((i) => (
                <span key={i} className={stats.peakMonthIndex === i ? 'text-black dark:text-white font-medium' : ''}>
                  {stats.last12Months[i].shortLabel}
                </span>
              ))}
            </div>
          </div>

          {/* Timeline & Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <p className="text-xs font-medium text-black/60 dark:text-white/60 mb-4">Timeline</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black/50 dark:text-white/50">First visit</span>
                  <span className="text-sm text-black dark:text-white font-medium">{formatDate(stats.firstVisitEver)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black/50 dark:text-white/50">Last activity</span>
                  <span className="text-sm text-black dark:text-white font-medium">{formatRelativeTime(stats.lastActivity)}</span>
                </div>
                {stats.bestDay && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black/50 dark:text-white/50">Best day</span>
                    <span className="text-sm text-black dark:text-white font-medium">
                      {formatDate(stats.bestDay.date)} <span className="text-black/40 dark:text-white/40">({stats.bestDay.visits})</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <p className="text-xs font-medium text-black/60 dark:text-white/60 mb-4">Recent Activity</p>
              <div className="space-y-2">
                {stats.recentVisitors.map((v, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                    <span className="text-sm text-black/50 dark:text-white/50">{formatRelativeTime(v.lastSeenAt)}</span>
                    <span className="text-sm text-black dark:text-white font-medium tabular-nums">
                      {v.visitCount} {v.visitCount === 1 ? 'visit' : 'visits'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
