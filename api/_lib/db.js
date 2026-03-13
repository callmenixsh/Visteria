import { MongoClient } from 'mongodb'

let cachedClient = null
let cachedDb = null
let cachedCollection = null

export async function getVisitsCollection() {
  if (cachedCollection) {
    return cachedCollection
  }

  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB_NAME || 'visteria'
  const collectionName = process.env.MONGODB_VISITS_COLLECTION || 'visits'

  if (!uri) {
    throw new Error('Missing MONGODB_URI environment variable')
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri)
    await cachedClient.connect()
  }

  cachedDb = cachedClient.db(dbName)
  cachedCollection = cachedDb.collection(collectionName)

  return cachedCollection
}

export function parseApiKeys() {
  const rawValue = process.env.VISTERIA_API_KEYS || process.env.VISTERIA_API_KEY || process.env.API_KEY || ''
  return String(rawValue)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function verifyApiKey(req) {
  const apiKeys = parseApiKeys()
  
  if (!apiKeys.length) {
    return { valid: false, error: 'Server misconfigured: missing API key.' }
  }

  const apiKey = String(req.headers['x-api-key'] || '').trim()
  if (!apiKey || !apiKeys.includes(apiKey)) {
    return { valid: false, error: 'Unauthorized' }
  }

  return { valid: true }
}

function normalizeHostname(input) {
  const raw = String(input || '').trim().toLowerCase()
  if (!raw) return ''

  try {
    return new URL(raw).hostname.replace(/\.$/, '')
  } catch {
    try {
      return new URL(`https://${raw}`).hostname.replace(/\.$/, '')
    } catch {
      return ''
    }
  }
}

function parseAllowedHostsCsv(rawValue) {
  return String(rawValue || '')
    .split(',')
    .map((value) => normalizeHostname(value))
    .filter(Boolean)
}

function parseTrackingSiteHostsMap() {
  const rawValue = process.env.VISTERIA_TRACKING_SITE_HOSTS_JSON || process.env.TRACKING_SITE_HOSTS_JSON || ''
  if (!rawValue) {
    return {}
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    return Object.entries(parsed).reduce((acc, [siteId, hosts]) => {
      if (!Array.isArray(hosts)) {
        return acc
      }

      const normalizedHosts = hosts.map((host) => normalizeHostname(host)).filter(Boolean)
      if (normalizedHosts.length) {
        acc[String(siteId).trim()] = normalizedHosts
      }

      return acc
    }, {})
  } catch {
    return {}
  }
}

function getTrackingAllowedHosts(siteId) {
  const perSiteMap = parseTrackingSiteHostsMap()
  const trimmedSiteId = String(siteId || '').trim()
  if (trimmedSiteId && perSiteMap[trimmedSiteId]?.length) {
    return perSiteMap[trimmedSiteId]
  }

  const globalHosts = parseAllowedHostsCsv(
    process.env.VISTERIA_TRACKING_ALLOWED_HOSTS || process.env.TRACKING_ALLOWED_HOSTS || '',
  )

  return globalHosts
}

function collectRequestHostCandidates(req) {
  return [
    req.headers.origin,
    req.headers.referer,
    req.headers.referrer,
  ]
    .map((value) => normalizeHostname(value))
    .filter(Boolean)
}

export function verifyTrackingSource(req, { siteId }) {
  const allowedHosts = getTrackingAllowedHosts(siteId)

  // Backwards-compatible default: no allowlist configured means allow.
  if (!allowedHosts.length) {
    return { valid: true, reason: 'allowlist-not-configured' }
  }

  const candidates = collectRequestHostCandidates(req)
  if (!candidates.length) {
    return { valid: false, error: 'Forbidden: missing Origin/Referer headers.' }
  }

  const hasMatch = candidates.some((host) => allowedHosts.includes(host))
  if (!hasMatch) {
    return { valid: false, error: 'Forbidden: domain is not in tracking allowlist.' }
  }

  return { valid: true }
}
