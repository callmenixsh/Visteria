import { useState, useMemo } from 'react'

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

function buildTrackingSnippet(baseUrl, siteId) {
  const safeBaseUrl = normalizeBaseUrl(baseUrl) || 'https://your-api-domain.com'
  const safeSiteId = siteId || ''
  const trackEndpoint = buildApiUrl(safeBaseUrl, '/visits/track')

  return `<!-- Visteria tracking -->
<script type="module">
  window.__VISTERIA_TRACKING_CONFIG__ = {
    apiBaseUrl: import.meta.env.VITE_TRACKING_API_BASE_URL || '${safeBaseUrl}',
    apiKey: import.meta.env.VITE_TRACKING_API_KEY || '',
    siteId: import.meta.env.VITE_TRACKING_SITE_ID || '${safeSiteId}',
  };

  (function trackVisit() {
    const config = window.__VISTERIA_TRACKING_CONFIG__ || {};
    const baseUrl = (config.apiBaseUrl || '').replace(/\\/+$/, '');
    const apiKey = config.apiKey || '';
    const siteId = config.siteId || window.location.hostname;

    if (!baseUrl || !siteId) return;

    const endpoint = baseUrl.toLowerCase().endsWith('/api')
      ? baseUrl + '/visits/track'
      : baseUrl + '/api/visits/track';

    const payload = {
      siteId: siteId,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      visitedAt: new Date().toISOString(),
    };

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;

    fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function () {});
  })();
</script>`
}

export default function Settings() {
  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem('visteria.apiBaseUrl') || '')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('visteria.apiKey') || '')
  const [siteId, setSiteId] = useState('')
  const [message, setMessage] = useState('')

  const trackingSnippet = useMemo(() => buildTrackingSnippet(apiBaseUrl, siteId), [apiBaseUrl, siteId])
  const envExample = useMemo(
    () => `# Visteria Tracking Configuration
VITE_TRACKING_API_BASE_URL=${normalizeBaseUrl(apiBaseUrl) || 'https://your-api-domain.com'}
VITE_TRACKING_API_KEY=${apiKey || 'YOUR_API_KEY'}
VITE_TRACKING_SITE_ID=${siteId || 'your-site-id'}`,
    [apiBaseUrl, apiKey, siteId],
  )

  function saveConfig() {
    localStorage.setItem('visteria.apiBaseUrl', normalizeBaseUrl(apiBaseUrl))
    localStorage.setItem('visteria.apiKey', apiKey.trim())
    setMessage('Configuration saved successfully!')
    setTimeout(() => setMessage(''), 3000)
  }

  function copySnippet() {
    navigator.clipboard.writeText(trackingSnippet)
    setMessage('Tracking snippet copied to clipboard!')
    setTimeout(() => setMessage(''), 3000)
  }

  function copyEnvExample() {
    navigator.clipboard.writeText(envExample)
    setMessage('Env example copied to clipboard!')
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Settings</h1>
        <p className="text-black/60 dark:text-white/60 mt-1 text-sm sm:text-base">Configure your API and tracking</p>
      </div>

      {message && (
        <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg p-4">
          <p className="text-black dark:text-white font-medium text-sm sm:text-base">{message}</p>
        </div>
      )}

      <div className="bg-white dark:bg-black rounded-xl shadow-sm border border-black/10 dark:border-white/10 p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-semibold text-black dark:text-white mb-4 sm:mb-6">API Configuration</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-2">
              API Base URL
            </label>
            <input
              type="text"
              placeholder="https://your-api-domain.com"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              className="w-full px-4 py-2 border border-black/20 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-none transition-colors bg-white dark:bg-black text-black dark:text-white placeholder-black/40 dark:placeholder-white/40"
            />
            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              The base URL of your Visteria API server (without trailing slash)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-2">
              API Key
            </label>
            <input
              type="password"
              placeholder="Paste your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-2 border border-black/20 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-none transition-colors bg-white dark:bg-black text-black dark:text-white placeholder-black/40 dark:placeholder-white/40"
            />
            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Your API key for authentication (stored locally in browser)
            </p>
          </div>

          <button
            onClick={saveConfig}
            className="px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-lg hover:bg-black/80 dark:hover:bg-white/90 transition-colors font-medium shadow-sm"
          >
            Save Configuration
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-black rounded-xl shadow-sm border border-black/10 dark:border-white/10 p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-semibold text-black dark:text-white mb-4 sm:mb-6">Tracking Snippet</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-2">
              Site ID (optional)
            </label>
            <input
              type="text"
              placeholder="my-portfolio"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full px-4 py-2 border border-black/20 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-none transition-colors bg-white dark:bg-black text-black dark:text-white placeholder-black/40 dark:placeholder-white/40"
            />
            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Leave empty to auto-detect from hostname
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-black/70 dark:text-white/70">
                Code Snippet
              </label>
              <div className="flex items-center gap-3 text-sm">
                <button
                  onClick={copyEnvExample}
                  className="text-black dark:text-white hover:text-black/70 dark:hover:text-white/80 font-medium underline"
                >
                  Copy .env
                </button>
                <button
                  onClick={copySnippet}
                  className="text-black dark:text-white hover:text-black/70 dark:hover:text-white/80 font-medium underline"
                >
                  Copy Snippet
                </button>
              </div>
            </div>
            <textarea
              value={trackingSnippet}
              readOnly
              rows={15}
              className="w-full px-4 py-3 border border-black/20 dark:border-white/20 rounded-lg bg-white dark:bg-black font-mono text-sm outline-none text-black dark:text-white"
            />
            <pre className="mt-2 text-xs sm:text-sm text-black/50 dark:text-white/50 font-mono whitespace-pre-wrap break-all">
              {envExample}
            </pre>
            <p className="mt-2 text-sm text-black/50 dark:text-white/50">
              Paste this snippet before the closing {'</body>'} tag on each website you want to track
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
