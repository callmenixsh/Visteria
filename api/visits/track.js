import crypto from 'node:crypto'
import { getVisitsCollection } from '../_lib/db.js'

const MAX_BODY_BYTES = 32_000
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 60
const RATE_LIMIT_MAX_BUCKETS = 10_000
const rateBuckets = new Map()

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Track endpoint is public - no auth required

  const contentLength = Number(req.headers['content-length'] || 0)
  if (contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Payload too large' })
  }

  if (isRateLimited(req)) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  try {
    const { siteId, siteName, siteUrl, url, referrer, userAgent, visitedAt, visitorId } = req.body || {}

    if (!siteId || !url) {
      return res.status(400).json({ error: 'siteId and url are required.' })
    }

    const safeVisitedAt = normalizeIsoDate(visitedAt) || new Date()
    const safeSiteId = String(siteId).trim()
    const safeSiteName = String(siteName || safeSiteId).trim()
    const safeSiteUrl = siteUrl ? String(siteUrl).trim() : null
    const safeUrl = String(url)
    const safeReferrer = String(referrer || '')
    const safeUserAgent = String(userAgent || req.headers['user-agent'] || '')
    const safeVisitorId = String(visitorId || '').trim()

    const allowlistValidation = validateTrackingAllowlist(req, {
      siteId: safeSiteId,
      url: safeUrl,
      siteUrl: safeSiteUrl,
    })

    if (!allowlistValidation.allowed) {
      return res.status(403).json({ error: allowlistValidation.error })
    }

    const visitorHash = buildVisitorHash(req, safeSiteId, safeVisitorId)

    const visitsCollection = await getVisitsCollection()

    const updateDoc = {
      $setOnInsert: {
        siteId: safeSiteId,
        visitorHash,
        firstSeenAt: new Date(),
      },
      $set: {
        siteName: safeSiteName,
        lastSeenAt: new Date(),
        lastUserAgent: safeUserAgent,
      },
      $inc: {
        visitCount: 1,
      },
      $push: {
        visits: {
          $each: [
            {
              url: safeUrl,
              referrer: safeReferrer,
              visitedAt: safeVisitedAt,
            },
          ],
          $slice: -1000,
        },
      },
    }

    // Only set siteUrl if provided (don't overwrite with null)
    if (safeSiteUrl) {
      updateDoc.$set.siteUrl = safeSiteUrl
    }

    await visitsCollection.updateOne(
      { siteId: safeSiteId, visitorHash },
      updateDoc,
      { upsert: true },
    )

    return res.status(202).json({ ok: true })
  } catch (error) {
    console.error('Track error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

function getClientIp(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '')
  return forwardedFor.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
}

function isRateLimited(req) {
  const now = Date.now()
  const key = getClientIp(req)

  if (rateBuckets.size >= RATE_LIMIT_MAX_BUCKETS) {
    for (const [bucketKey, bucket] of rateBuckets) {
      if (now > bucket.resetAt) {
        rateBuckets.delete(bucketKey)
      }
    }
  }

  const existing = rateBuckets.get(key)
  if (!existing || now > existing.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  existing.count += 1
  return existing.count > RATE_LIMIT_MAX_REQUESTS
}

export function normalizeIsoDate(value) {
  const asString = String(value || '').trim()
  if (!asString) return null

  const date = new Date(asString)
  if (Number.isNaN(date.getTime())) return null

  return date
}

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function buildVisitorHash(req, siteId, visitorId) {
  if (visitorId) {
    return hashValue(`${siteId}|vid|${visitorId}`)
  }

  const ip = getClientIp(req)
  const userAgent = String(req.headers['user-agent'] || '')

  return hashValue(`${siteId}|${ip}|${userAgent}`)
}

function parseCsvEnvSet(value) {
  return new Set(
    String(value || '')
      .split(',')
      .map((entry) => normalizeHost(entry))
      .filter(Boolean),
  )
}

function parseSiteHostsMap(rawJson) {
  const raw = String(rawJson || '').trim()
  if (!raw) {
    return new Map()
  }

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return new Map()
    }

    const map = new Map()
    for (const [siteId, hosts] of Object.entries(parsed)) {
      const normalizedSiteId = normalizeSiteId(siteId)
      if (!normalizedSiteId) {
        continue
      }

      const hostSet = new Set(
        (Array.isArray(hosts) ? hosts : [])
          .map((entry) => normalizeHost(entry))
          .filter(Boolean),
      )

      if (hostSet.size > 0) {
        map.set(normalizedSiteId, hostSet)
      }
    }

    return map
  } catch {
    return new Map()
  }
}

function normalizeHost(value) {
  const candidate = String(value || '').trim().toLowerCase()
  if (!candidate) {
    return ''
  }

  // Accept both plain hosts (example.com) and URLs (https://example.com/path)
  try {
    if (/^https?:\/\//.test(candidate)) {
      return new URL(candidate).hostname.toLowerCase()
    }
  } catch {
    return ''
  }

  return candidate.replace(/^\*\./, '').replace(/\.$/, '')
}

function getHostFromUrl(value) {
  const asString = String(value || '').trim()
  if (!asString) {
    return ''
  }

  try {
    return new URL(asString).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function getRequestOriginHost(req) {
  const origin = String(req.headers.origin || '').trim()
  if (origin) {
    return getHostFromUrl(origin)
  }

  const referer = String(req.headers.referer || '').trim()
  if (referer) {
    return getHostFromUrl(referer)
  }

  return ''
}

function normalizeSiteId(value) {
  return String(value || '').trim().toLowerCase()
}

export function validateTrackingAllowlist(req, { siteId, url, siteUrl }) {
  const allowedHostsGlobal = parseCsvEnvSet(process.env.VISTERIA_TRACKING_ALLOWED_HOSTS)
  const allowedSiteIds = parseCsvEnvSet(process.env.VISTERIA_TRACKING_ALLOWED_SITE_IDS)
  const siteHostsMap = parseSiteHostsMap(process.env.VISTERIA_TRACKING_SITE_HOSTS_JSON)

  const hasRules =
    allowedHostsGlobal.size > 0 ||
    allowedSiteIds.size > 0 ||
    siteHostsMap.size > 0

  if (!hasRules) {
    return { allowed: true }
  }

  if (!siteId) {
    return { allowed: false, error: 'Invalid tracking payload: missing siteId.' }
  }

  const normalizedSiteId = normalizeSiteId(siteId)

  if (allowedSiteIds.size > 0 && !allowedSiteIds.has(normalizedSiteId)) {
    return { allowed: false, error: `Tracking denied for siteId "${siteId}".` }
  }

  const siteScopedHosts = siteHostsMap.get(normalizedSiteId) || null
  if (siteHostsMap.size > 0 && !siteScopedHosts) {
    return { allowed: false, error: `Tracking denied: siteId "${siteId}" is not configured.` }
  }

  const effectiveHosts = siteScopedHosts || allowedHostsGlobal
  if (effectiveHosts.size === 0) {
    return { allowed: true }
  }

  // The real request origin is authoritative: require an Origin/Referer that
  // matches the allowlist before trusting any claimed URL fields.
  const requestOriginHost = getRequestOriginHost(req)
  if (!requestOriginHost) {
    return { allowed: false, error: 'Forbidden: missing Origin/Referer headers.' }
  }
  if (!effectiveHosts.has(requestOriginHost)) {
    return { allowed: false, error: `Forbidden: request origin "${requestOriginHost}" is not allowed.` }
  }

  const pageHost = getHostFromUrl(url)
  if (!pageHost) {
    return { allowed: false, error: 'Invalid tracking payload: url must be an absolute URL.' }
  }

  if (!effectiveHosts.has(pageHost)) {
    return { allowed: false, error: `Tracking denied for host "${pageHost}".` }
  }

  const declaredSiteHost = getHostFromUrl(siteUrl)
  if (declaredSiteHost && !effectiveHosts.has(declaredSiteHost)) {
    return { allowed: false, error: `Tracking denied for declared siteUrl host "${declaredSiteHost}".` }
  }

  return { allowed: true }
}