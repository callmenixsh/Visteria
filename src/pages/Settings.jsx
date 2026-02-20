import { useState, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/+$/, '')
}

function buildApiUrl(baseUrl, path) {
  const normalizedBase = normalizeBaseUrl(baseUrl)
  if (!normalizedBase) return ''
  if (normalizedBase.toLowerCase().endsWith('/api')) return `${normalizedBase}${path}`
  return `${normalizedBase}/api${path}`
}

function buildTrackingSnippet(baseUrl, siteId) {
  const safeBaseUrl = normalizeBaseUrl(baseUrl) || 'https://your-api-domain.com'
  const safeSiteId = siteId || ''

  return `<script type="module">
(function() {
  const config = {
    baseUrl: '${safeBaseUrl}',
    siteId: '${safeSiteId}' || location.hostname
  };
  const key = 'visteria_' + config.siteId;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  const endpoint = config.baseUrl + (config.baseUrl.endsWith('/api') ? '' : '/api') + '/visits/track';
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: config.siteId,
      url: location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      visitedAt: new Date().toISOString()
    }),
    keepalive: true
  }).catch(() => {});
})();
</script>`
}

export default function Settings() {
  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem('visteria.apiBaseUrl') || '')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('visteria.apiKey') || '')
  const [siteId, setSiteId] = useState('')
  const [copied, setCopied] = useState('')

  const trackingSnippet = useMemo(() => buildTrackingSnippet(apiBaseUrl, siteId), [apiBaseUrl, siteId])
  const envExample = useMemo(() => 
    `VITE_TRACKING_API_BASE_URL=${normalizeBaseUrl(apiBaseUrl) || 'https://your-api.com'}\nVITE_TRACKING_API_KEY=${apiKey || 'YOUR_API_KEY'}\nVITE_TRACKING_SITE_ID=${siteId || 'your-site-id'}`,
    [apiBaseUrl, apiKey, siteId]
  )

  function saveConfig() {
    localStorage.setItem('visteria.apiBaseUrl', normalizeBaseUrl(apiBaseUrl))
    localStorage.setItem('visteria.apiKey', apiKey.trim())
    setCopied('saved')
    setTimeout(() => setCopied(''), 2000)
  }

  function copyToClipboard(text, type) {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-black dark:text-white">Settings</h1>

      {/* API Config */}
      <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-5">
        <h2 className="text-sm font-medium text-black dark:text-white mb-4">API Configuration</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5">Base URL</label>
            <input
              type="text"
              placeholder="https://your-api.com"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-black/10 dark:border-white/10 rounded-lg bg-transparent text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5">API Key</label>
            <input
              type="password"
              placeholder="Your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-black/10 dark:border-white/10 rounded-lg bg-transparent text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition"
            />
          </div>
          <button
            onClick={saveConfig}
            className="px-4 py-2 text-sm font-medium bg-black text-white dark:bg-white dark:text-black rounded-lg hover:opacity-90 active:scale-[0.98] transition-all"
          >
            {copied === 'saved' ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tracking Snippet */}
      <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-5">
        <h2 className="text-sm font-medium text-black dark:text-white mb-4">Tracking Snippet</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5">Site ID <span className="font-normal">(optional, defaults to hostname)</span></label>
            <input
              type="text"
              placeholder="my-portfolio"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-black/10 dark:border-white/10 rounded-lg bg-transparent text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-black/60 dark:text-white/60">Code</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => copyToClipboard(envExample, 'env')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition"
                >
                  {copied === 'env' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === 'env' ? 'Copied' : '.env'}
                </button>
                <button
                  onClick={() => copyToClipboard(trackingSnippet, 'snippet')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition"
                >
                  {copied === 'snippet' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === 'snippet' ? 'Copied' : 'Snippet'}
                </button>
              </div>
            </div>
            <pre className="p-3 text-xs font-mono bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-lg overflow-x-auto text-black/80 dark:text-white/80 leading-relaxed">
              {trackingSnippet}
            </pre>
            <p className="mt-2 text-xs text-black/40 dark:text-white/40">
              Add before {'</body>'} on pages you want to track
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
