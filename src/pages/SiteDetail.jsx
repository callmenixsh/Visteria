import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

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

export default function SiteDetail() {
  const { siteId } = useParams()
  const [site, setSite] = useState(null)
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
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load site details')
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
      <div className="space-y-4">
        <Link to="/" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          ← Back to Dashboard
        </Link>
        <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg p-4 sm:p-6">
          <p className="text-black dark:text-white font-medium text-sm sm:text-base">{error}</p>
        </div>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="space-y-4">
        <Link to="/" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          ← Back to Dashboard
        </Link>
        <div className="bg-white dark:bg-black rounded-xl shadow-sm border border-black/10 dark:border-white/10 p-8 sm:p-12 text-center">
          <p className="text-black/60 dark:text-white/60 text-base sm:text-lg">Site not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-black rounded-xl shadow-sm border border-black/10 dark:border-white/10 p-6 sm:p-8">
        <div className="mb-8">
          <Link to="/" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white inline-flex items-center gap-1 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white break-words">{site.siteName || site.siteId}</h1>
          <p className="text-black/60 dark:text-white/60 mt-1 text-sm sm:text-base">Detailed Analytics</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="border-l-4 border-black dark:border-white bg-black/5 dark:bg-white/5 rounded-lg p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 font-medium mb-2">Total Visits</p>
            <p className="text-2xl sm:text-4xl font-bold text-black dark:text-white">{site.totalVisits || 0}</p>
          </div>

          <div className="border-l-4 border-black dark:border-white bg-black/5 dark:bg-white/5 rounded-lg p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 font-medium mb-2">Unique Visitors</p>
            <p className="text-2xl sm:text-4xl font-bold text-black dark:text-white">{site.uniqueVisitors || 0}</p>
          </div>

          <div className="border-l-4 border-black dark:border-white bg-black/5 dark:bg-white/5 rounded-lg p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 font-medium mb-2">Avg per Visitor</p>
            <p className="text-2xl sm:text-4xl font-bold text-black dark:text-white">
              {site.uniqueVisitors > 0 ? (site.totalVisits / site.uniqueVisitors).toFixed(1) : 0}
            </p>
          </div>

          <div className="border-l-4 border-black dark:border-white bg-black/5 dark:bg-white/5 rounded-lg p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 font-medium mb-2">Return Rate</p>
            <p className="text-2xl sm:text-4xl font-bold text-black dark:text-white">
              {site.totalVisits > 0 ? (((site.totalVisits - site.uniqueVisitors) / site.totalVisits) * 100).toFixed(0) : 0}%
            </p>
          </div>
        </div>

        {/* Additional Stats Grid */}
        <div className="border-t border-black/10 dark:border-white/10 pt-6 sm:pt-8">
          <h2 className="text-base sm:text-lg font-semibold text-black dark:text-white mb-4 sm:mb-6">Visitor Behavior</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-black/5 dark:bg-white/5 rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-medium text-black/60 dark:text-white/60">New Visitors</span>
                <svg className="w-5 h-5 text-black/70 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-black dark:text-white mb-1">{site.uniqueVisitors || 0}</p>
              <p className="text-xs text-black/50 dark:text-white/50">First-time visitors</p>
            </div>

            <div className="bg-black/5 dark:bg-white/5 rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-medium text-black/60 dark:text-white/60">Returning Visits</span>
                <svg className="w-5 h-5 text-black/70 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-black dark:text-white mb-1">
                {site.totalVisits > site.uniqueVisitors ? site.totalVisits - site.uniqueVisitors : 0}
              </p>
              <p className="text-xs text-black/50 dark:text-white/50">Return visits made</p>
            </div>

            <div className="bg-black/5 dark:bg-white/5 rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-medium text-black/60 dark:text-white/60">Engagement</span>
                <svg className="w-5 h-5 text-black/70 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-black dark:text-white mb-1">
                {site.uniqueVisitors > 0 && site.totalVisits > site.uniqueVisitors ? 'High' : site.uniqueVisitors > 0 ? 'Medium' : 'Low'}
              </p>
              <p className="text-xs text-black/50 dark:text-white/50">
                {site.uniqueVisitors > 0 ? 
                  `${(site.totalVisits / site.uniqueVisitors).toFixed(1)} visits per user` : 
                  'No activity yet'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Traffic Insights */}
        <div className="border-t border-black/10 dark:border-white/10 pt-6 sm:pt-8 mt-6 sm:mt-8">
          <h2 className="text-base sm:text-lg font-semibold text-black dark:text-white mb-4 sm:mb-6">Traffic Insights</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="border border-black/10 dark:border-white/10 rounded-lg p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-black/70 dark:text-white/70 mb-4">Visitor Distribution</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-2">
                    <span className="text-black/60 dark:text-white/60">One-time visitors</span>
                    <span className="font-semibold text-black dark:text-white">{site.uniqueVisitors || 0}</span>
                  </div>
                  <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-black dark:bg-white h-2 rounded-full transition-all" 
                      style={{ width: `${site.totalVisits > 0 ? (site.uniqueVisitors / site.totalVisits * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-2">
                    <span className="text-black/60 dark:text-white/60">Repeat visitors</span>
                    <span className="font-semibold text-black dark:text-white">
                      {site.totalVisits > site.uniqueVisitors ? site.totalVisits - site.uniqueVisitors : 0}
                    </span>
                  </div>
                  <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-black dark:bg-white h-2 rounded-full transition-all" 
                      style={{ width: `${site.totalVisits > 0 ? ((site.totalVisits - site.uniqueVisitors) / site.totalVisits * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-black/10 dark:border-white/10 rounded-lg p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-black/70 dark:text-white/70 mb-4">Performance Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-black/10 dark:border-white/10">
                  <span className="text-xs sm:text-sm text-black/60 dark:text-white/60">Total Page views</span>
                  <span className="font-bold text-black dark:text-white">{site.totalVisits || 0}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-black/10 dark:border-white/10">
                  <span className="text-xs sm:text-sm text-black/60 dark:text-white/60">Unique Users</span>
                  <span className="font-bold text-black dark:text-white">{site.uniqueVisitors || 0}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-black/10 dark:border-white/10">
                  <span className="text-xs sm:text-sm text-black/60 dark:text-white/60">Pages per Session</span>
                  <span className="font-bold text-black dark:text-white">
                    {site.uniqueVisitors > 0 ? (site.totalVisits / site.uniqueVisitors).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-black/60 dark:text-white/60">Return Visitor Rate</span>
                  <span className="font-bold text-black dark:text-white">
                    {site.totalVisits > 0 ? (((site.totalVisits - site.uniqueVisitors) / site.totalVisits) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}
