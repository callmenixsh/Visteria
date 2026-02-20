import { useState, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'

const API_BASE_URL = 'https://visteria.vercel.app'

function buildTrackingSnippet(siteId, siteUrl) {
  const safeSiteId = siteId || 'your-site-id'
  const safeSiteUrl = siteUrl?.trim() || 'https://your-site.com'

  return `<script type="module">
(function() {
  const key = 'visteria_${safeSiteId}';
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  fetch('${API_BASE_URL}/api/visits/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: '${safeSiteId}',
      siteUrl: '${safeSiteUrl}',
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
  const [siteId, setSiteId] = useState('')
  const [siteUrl, setSiteUrl] = useState('')
  const [copied, setCopied] = useState('')

  const trackingSnippet = useMemo(() => buildTrackingSnippet(siteId, siteUrl), [siteId, siteUrl])
  
  const envExample = `# Visteria Dashboard
VITE_TRACKING_API_KEY=your-api-key`

  function copyToClipboard(text, type) {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-black dark:text-white">Settings</h1>

      {/* Tracking Snippet */}
      <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-5">
        <h2 className="text-sm font-medium text-black dark:text-white mb-4">Tracking Snippet</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5">Site ID</label>
              <input
                type="text"
                placeholder="my-portfolio"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-black/10 dark:border-white/10 rounded-lg bg-transparent text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5">Site URL</label>
              <input
                type="text"
                placeholder="https://your-site.com"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-black/10 dark:border-white/10 rounded-lg bg-transparent text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-black/60 dark:text-white/60">Code</label>
              <button
                onClick={() => copyToClipboard(trackingSnippet, 'snippet')}
                className="inline-flex items-center gap-1 text-xs font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition"
              >
                {copied === 'snippet' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === 'snippet' ? 'Copied' : 'Copy'}
              </button>
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

      {/* Environment Variables */}
      <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-black dark:text-white">Environment Variables</h2>
          <button
            onClick={() => copyToClipboard(envExample, 'env')}
            className="inline-flex items-center gap-1 text-xs font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition"
          >
            {copied === 'env' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied === 'env' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="p-3 text-xs font-mono bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-lg overflow-x-auto text-black/80 dark:text-white/80 leading-relaxed">
          {envExample}
        </pre>
      </div>
    </div>
  )
}
