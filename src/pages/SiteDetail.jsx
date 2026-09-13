import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Users, Globe } from 'lucide-react'
import { getApiBaseUrl } from '../config'
import TrendChart from '../components/TrendChart'
import HeatmapCard from '../components/HeatmapCard'
import { weekLabels } from '../lib/trend'

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

function getVisitDate(visit, visitor) {
  const candidate =
    visit?.visitedAt ||
    visit?.timestamp ||
    visit?.date ||
    visitor?.lastSeenAt ||
    visitor?.firstSeenAt ||
    null

  if (!candidate) {
    return null
  }

  const parsed = new Date(candidate)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getPagePath(url) {
  const raw = String(url || '')
  try {
    const parsed = new URL(raw)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.pathname === '' ? '/' : parsed.pathname
    }
  } catch {
    // fall through to raw string
  }
  const withoutQuery = raw.split('?')[0].split('#')[0]
  return withoutQuery || '(unknown)'
}

function getReferrerHost(referrer) {
  if (!referrer) {
    return '(direct)'
  }
  try {
    return new URL(String(referrer)).hostname.replace(/^www\./, '') || '(direct)'
  } catch {
    return '(other)'
  }
}

function topBreakdown(source, keyFn) {
  const counts = new Map()
  source.forEach((visit) => {
    const key = keyFn(visit)
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

function lastNDays(count, dayLabelFn) {
  const MS_IN_DAY = 24 * 60 * 60 * 1000
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = []
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(todayStart.getTime() - i * MS_IN_DAY)
    days.push({
      date: start,
      start,
      end: new Date(start.getTime() + MS_IN_DAY),
      dateKey: start.toDateString(),
      dayLabel: dayLabelFn(start),
    })
  }
  return days
}

function buildHourHeatmap(days, allVisits) {
  return days.map((day) => {
    const cells = Array(24).fill(0)
    allVisits.forEach((visit) => {
      if (visit.date >= day.start && visit.date < day.end) {
        cells[visit.date.getHours()] += 1
      }
    })
    return { dateKey: day.dateKey, dayLabel: day.dayLabel, date: day.date, cells }
  })
}

function findHeatmapPeak(rows) {
  const raw = Math.max(...rows.flatMap((row) => row.cells))
  if (raw <= 0) return null
  for (const row of rows) {
    const hour = row.cells.indexOf(raw)
    if (hour !== -1) {
      return { label: `${row.dayLabel} ${hour}:00`, count: raw }
    }
  }
  return null
}

export default function SiteDetail() {
  const { siteId } = useParams()
  const [site, setSite] = useState(null)
  const [visitors, setVisitors] = useState([])
  const [activeYearTooltipIndex, setActiveYearTooltipIndex] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSiteDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  async function loadSiteDetails() {
    const apiKey = import.meta.env.VITE_TRACKING_API_KEY || ''

    if (!apiKey) {
      setError('Please set VITE_TRACKING_API_KEY in environment variables')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/sites/${encodeURIComponent(siteId)}?limit=200`, {
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
      (v.visits || [])
        .map((visit) => {
          const parsedDate = getVisitDate(visit, v)
          if (!parsedDate) {
            return null
          }

          return {
            ...visit,
            visitorHash: v.visitorHash,
            date: parsedDate,
          }
        })
        .filter(Boolean)
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

    // Week and month hourly heatmaps
    const weekHeatmap = buildHourHeatmap(
      lastNDays(7, (d) => d.toLocaleDateString('en-US', { weekday: 'short' })),
      allVisits,
    )
    const heatmapMax = Math.max(1, ...weekHeatmap.flatMap((row) => row.cells))
    const heatmapPeak = findHeatmapPeak(weekHeatmap)

    // Top pages / referrers for the loaded window
    const topPages = topBreakdown(allVisits, (visit) => getPagePath(visit.url))
    const maxPageVisits = Math.max(...topPages.map((entry) => entry.count), 1)
    const topReferrers = topBreakdown(allVisits, (visit) => getReferrerHost(visit.referrer))
    const maxReferrerVisits = Math.max(...topReferrers.map((entry) => entry.count), 1)

    // Yearly trend (52 weekly buckets over the last year)
    const now = new Date()
    const MS_IN_DAY = 24 * 60 * 60 * 1000
    const WEEK_MS = 7 * MS_IN_DAY
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const anchor = todayMidnight - new Date(todayMidnight).getDay() * MS_IN_DAY
    const start = anchor - 51 * WEEK_MS
    const last12Months = []
    for (let i = 0; i < 52; i++) {
      const date = new Date(start + i * WEEK_MS)
      const nextDate = new Date(start + (i + 1) * WEEK_MS)
      const labels = weekLabels(date, nextDate)
      last12Months.push({
        date,
        label: labels.label,
        shortLabel: labels.shortLabel,
        peakLabel: labels.peakLabel,
        visits: allVisits.filter(v => v.date >= date && v.date < nextDate).length,
      })
    }
    const maxYearlyVisits = Math.max(...last12Months.map(d => d.visits), 1)
    const peakMonthIndex = last12Months.findIndex(d => d.visits === maxYearlyVisits)
    const peakMonth = last12Months[peakMonthIndex]?.peakLabel || ''

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
      weekHeatmap,
      heatmapMax,
      heatmapPeak,
      topPages,
      maxPageVisits,
      topReferrers,
      maxReferrerVisits,
      allVisits,
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
      <div className="space-y-4 animate-pulse">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="h-4 w-12 rounded bg-black/10 dark:bg-white/10 mb-2" />
            <div className="h-7 w-52 rounded bg-black/10 dark:bg-white/10" />
            <div className="h-4 w-40 rounded bg-black/10 dark:bg-white/10 mt-2" />
          </div>
          <div className="h-9 w-20 rounded-lg bg-black/10 dark:bg-white/10" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-xl border border-black/[0.08] dark:border-white/[0.08]" />
          <div className="h-24 rounded-xl border border-black/[0.08] dark:border-white/[0.08]" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="h-24 rounded-xl border border-black/[0.08] dark:border-white/[0.08]" />
          <div className="h-24 rounded-xl border border-black/[0.08] dark:border-white/[0.08]" />
          <div className="h-24 rounded-xl border border-black/[0.08] dark:border-white/[0.08]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="h-48 rounded-xl border border-black/[0.08] dark:border-white/[0.08]" />
          <div className="h-48 rounded-xl border border-black/[0.08] dark:border-white/[0.08]" />
        </div>
        <div className="h-56 rounded-xl border border-black/[0.08] dark:border-white/[0.08]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="h-40 rounded-xl border border-black/[0.08] dark:border-white/[0.08]" />
          <div className="h-40 rounded-xl border border-black/[0.08] dark:border-white/[0.08]" />
        </div>
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
  const siteUrl = site.siteUrl || (site.siteId.includes('.') ? `https://${site.siteId}` : null)

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
          {site.firstSeenAt && (
            <p className="text-sm text-black/50 dark:text-white/50 mt-1">
              First tracked {formatDate(site.firstSeenAt)}
            </p>
          )}
        </div>
        {siteUrl && (
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white border border-black/10 dark:border-white/10 rounded-lg hover:border-black/20 dark:hover:border-white/20 transition-colors"
          >
            Visit
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Overview: metrics + heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
        <div className="space-y-3">
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
          )}
        </div>
        {stats && (
          <div className="self-start w-fit">
            <HeatmapCard
              title="Week Activity Heatmap"
              peak={stats.heatmapPeak}
              rows={stats.weekHeatmap}
              max={stats.heatmapMax}
              cellSize={12}
              gap={2}
            />
          </div>
        )}
      </div>

      
          {/* Yearly Trends */}
          <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-black/60 dark:text-white/60">Last 12 Months</p>
              <p className="text-xs text-black/40 dark:text-white/40">Peak: <span className="text-black dark:text-white font-medium">{stats.peakMonth}</span></p>
            </div>
            <div className="relative">
              <TrendChart
                points={stats.last12Months}
                maxVisits={stats.maxYearlyVisits}
                activeIndex={activeYearTooltipIndex}
                onSelect={(i) => setActiveYearTooltipIndex((prev) => (prev === i ? null : i))}
                height="h-32"
              />
            </div>
            <div className="flex justify-between text-[10px] text-black/40 dark:text-white/40 mt-2">
              {[0, 1, 2, 3, 4, 5].map((k) => {
                const i = Math.round((k * (stats.last12Months.length - 1)) / 5)
                return (
                  <span key={i} className={stats.peakMonthIndex === i ? 'text-black dark:text-white font-medium' : ''}>
                    {stats.last12Months[i].shortLabel}
                  </span>
                )
              })}
            </div>
          </div>

      {stats && (
        <>
          {/* Page & Referrer Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-black/60 dark:text-white/60">Top Pages</p>
                <p className="text-xs text-black/40 dark:text-white/40">{stats.allVisits.length} visits</p>
              </div>
              {stats.topPages.length ? (
                <ul className="space-y-2.5">
                  {stats.topPages.map((entry, i) => (
                    <li key={entry.name}>
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="text-black/30 dark:text-white/30 tabular-nums text-[10px] w-3 flex-shrink-0">{i + 1}</span>
                          <span className="truncate font-medium text-black/75 dark:text-white/75">{entry.name}</span>
                        </span>
                        <span className="tabular-nums text-black/45 dark:text-white/45 flex-shrink-0">{entry.count}</span>
                      </div>
                      <div className="ml-4 h-1 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-black/40 dark:bg-white/40"
                          style={{ width: `${(entry.count / stats.maxPageVisits) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-black/35 dark:text-white/35">No page data in this window</p>
              )}
            </div>

            <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-black/60 dark:text-white/60">Top Referrers</p>
              </div>
              {stats.topReferrers.length ? (
                <ul className="space-y-2.5">
                  {stats.topReferrers.map((entry, i) => (
                    <li key={entry.name}>
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="text-black/30 dark:text-white/30 tabular-nums text-[10px] w-3 flex-shrink-0">{i + 1}</span>
                          <span className="truncate font-medium text-black/75 dark:text-white/75">{entry.name}</span>
                        </span>
                        <span className="tabular-nums text-black/45 dark:text-white/45 flex-shrink-0">{entry.count}</span>
                      </div>
                      <div className="ml-4 h-1 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-black/40 dark:bg-white/40"
                          style={{ width: `${(entry.count / stats.maxReferrerVisits) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-black/35 dark:text-white/35">No referrer data in this window</p>
              )}
            </div>
          </div>


          {/* Timeline & Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <p className="text-xs font-medium text-black/60 dark:text-white/60 mb-4">Timeline</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black/50 dark:text-white/50">First visit</span>
                  <span className="text-sm text-black dark:text-white font-medium">{formatDate(site.firstSeenAt || stats.firstVisitEver)}</span>
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
                    <div className="min-w-0 pr-3">
                      <span className="text-sm text-black/50 dark:text-white/50">{formatRelativeTime(v.lastSeenAt)}</span>
                      {v.visits?.[0]?.url && (
                        <p className="text-[11px] text-black/40 dark:text-white/40 truncate mt-0.5">
                          {v.visits[0].url}
                        </p>
                      )}
                    </div>
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
