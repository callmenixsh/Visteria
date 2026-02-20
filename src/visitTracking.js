const DUPLICATE_WINDOW_MS = 2000
const API_BASE_URL = 'https://visteria.vercel.app'

let lastTrackedUrl = ''
let lastTrackedAt = 0

function getEnvValue(primaryKey, fallbackKey) {
  return import.meta.env?.[primaryKey] || import.meta.env?.[fallbackKey] || ''
}

function getRuntimeConfig() {
  return window.__VISTERIA_TRACKING_CONFIG__ || {}
}

function getTrackingConfig(configOverride = {}) {
  const runtimeConfig = getRuntimeConfig()
  const overrideSiteId = configOverride.siteId || ''
  const runtimeSiteId = overrideSiteId || runtimeConfig.siteId || ''

  return {
    baseUrl: API_BASE_URL,
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

function sendWithFetch(endpoint, payload) {
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

    const { baseUrl, siteId } = getTrackingConfig(configOverride)
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

    if (sendWithBeacon(endpoint, payload)) {
      return
    }

    sendWithFetch(endpoint, payload).catch(() => {})
  } catch {
    return
  }
}
