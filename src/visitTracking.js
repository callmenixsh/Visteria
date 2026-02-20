const DUPLICATE_WINDOW_MS = 2000

let lastTrackedUrl = ''
let lastTrackedAt = 0

function getEnvValue(primaryKey, fallbackKey) {
  return import.meta.env?.[primaryKey] || import.meta.env?.[fallbackKey] || ''
}

function getRuntimeConfig() {
  return window.__VISTERIA_TRACKING_CONFIG__ || {}
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function getTrackingConfig(configOverride = {}) {
  const runtimeConfig = getRuntimeConfig()
  const overrideBaseUrl = configOverride.apiBaseUrl || configOverride.baseUrl || ''
  const overrideApiKey = configOverride.apiKey || ''
  const overrideSiteId = configOverride.siteId || ''
  const runtimeBaseUrl = overrideBaseUrl || runtimeConfig.apiBaseUrl || runtimeConfig.baseUrl || ''
  const runtimeApiKey = overrideApiKey || runtimeConfig.apiKey || ''
  const runtimeSiteId = overrideSiteId || runtimeConfig.siteId || ''

  return {
    baseUrl: normalizeBaseUrl(
      runtimeBaseUrl || getEnvValue('VITE_TRACKING_API_BASE_URL', 'TRACKING_API_BASE_URL'),
    ),
    apiKey: String(runtimeApiKey || getEnvValue('VITE_TRACKING_API_KEY', 'TRACKING_API_KEY')).trim(),
    siteId:
      String(runtimeSiteId || getEnvValue('VITE_TRACKING_SITE_ID', 'TRACKING_SITE_ID')).trim() ||
      window.location.hostname,
  }
}

function hasConsent() {
  const consent = window.__VISTERIA_TRACKING_CONSENT__
  if (typeof consent === 'boolean') {
    return consent
  }

  return true
}

function shouldSuppressDuplicate(url) {
  const now = Date.now()
  if (lastTrackedUrl === url && now - lastTrackedAt < DUPLICATE_WINDOW_MS) {
    return true
  }

  lastTrackedUrl = url
  lastTrackedAt = now
  return false
}

function sendWithBeacon(endpoint, payload) {
  if (typeof navigator.sendBeacon !== 'function') {
    return false
  }

  const body = new Blob([JSON.stringify(payload)], { type: 'application/json' })
  return navigator.sendBeacon(endpoint, body)
}

function sendWithFetch(endpoint, payload, apiKey) {
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify(payload),
    keepalive: true,
  })
}

export function trackVisit(configOverride = {}) {
  try {
    if (!hasConsent()) {
      return
    }

    const { baseUrl, apiKey, siteId } = getTrackingConfig(configOverride)
    if (!baseUrl || !siteId) {
      return
    }

    const currentUrl = window.location.href
    if (shouldSuppressDuplicate(currentUrl)) {
      return
    }

    const payload = {
      siteId,
      url: currentUrl,
      referrer: document.referrer || '',
      userAgent: navigator.userAgent,
      visitedAt: new Date().toISOString(),
    }

    const endpoint = `${baseUrl}/api/visits/track`

    if (!apiKey && sendWithBeacon(endpoint, payload)) {
      return
    }

    sendWithFetch(endpoint, payload, apiKey).catch(() => {})
  } catch {
    return
  }
}
