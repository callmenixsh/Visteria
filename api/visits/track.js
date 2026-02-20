import crypto from 'node:crypto'
import { getVisitsCollection, verifyApiKey } from '../_lib/db.js'

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = verifyApiKey(req)
  if (!auth.valid) {
    return res.status(auth.error === 'Unauthorized' ? 401 : 500).json({ error: auth.error })
  }

  try {
    const { siteId, siteName, url, referrer, userAgent, visitedAt } = req.body || {}

    if (!siteId || !url) {
      return res.status(400).json({ error: 'siteId and url are required.' })
    }

    const safeVisitedAt = normalizeIsoDate(visitedAt) || new Date()
    const safeSiteId = String(siteId).trim()
    const safeSiteName = String(siteName || safeSiteId).trim()
    const safeUrl = String(url)
    const safeReferrer = String(referrer || '')
    const safeUserAgent = String(userAgent || req.headers['user-agent'] || '')
    const visitorHash = buildVisitorHash(req, safeSiteId)

    const visitsCollection = await getVisitsCollection()

    await visitsCollection.updateOne(
      { siteId: safeSiteId, visitorHash },
      {
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
      },
      { upsert: true },
    )

    return res.status(202).json({ ok: true })
  } catch (error) {
    console.error('Track error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

function normalizeIsoDate(value) {
  const asString = String(value || '').trim()
  if (!asString) return null

  const date = new Date(asString)
  if (Number.isNaN(date.getTime())) return null

  return date
}

function buildVisitorHash(req, siteId) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '')
  const ip = forwardedFor.split(',')[0]?.trim() || req.socket?.remoteAddress || ''
  const userAgent = String(req.headers['user-agent'] || '')

  return crypto.createHash('sha256').update(`${siteId}|${ip}|${userAgent}`).digest('hex')
}
