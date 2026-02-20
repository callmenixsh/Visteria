import crypto from 'node:crypto'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import { initDatabase } from './db.js'

dotenv.config()

const PORT = Number(process.env.PORT || 8787)
const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'visteria'
const MONGODB_VISITS_COLLECTION = process.env.MONGODB_VISITS_COLLECTION || 'visits'
const API_KEYS = parseApiKeys(process.env.VISTERIA_API_KEYS || process.env.VISTERIA_API_KEY || process.env.API_KEY)

const app = express()
let visitsCollection

app.use(cors())
app.use(express.json({ limit: '32kb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api', (req, res, next) => {
  if (!API_KEYS.length) {
    return res.status(500).json({ error: 'Server misconfigured: missing API key.' })
  }

  const apiKey = String(req.header('x-api-key') || '').trim()
  if (!apiKey || !API_KEYS.includes(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
})

app.post('/api/visits/track', async (req, res) => {
  const { siteId, siteName, url, referrer, userAgent, visitedAt } = req.body || {}

  if (!siteId || !url) {
    return res.status(400).json({ error: 'siteId and url are required.' })
  }

  const safeVisitedAt = normalizeIsoDate(visitedAt) || new Date()
  const safeSiteId = String(siteId).trim()
  const safeSiteName = String(siteName || safeSiteId).trim()
  const safeUrl = String(url)
  const safeReferrer = String(referrer || '')
  const safeUserAgent = String(userAgent || req.header('user-agent') || '')
  const visitorHash = buildVisitorHash(req, safeSiteId)

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
})

app.get('/api/projects', async (_req, res) => {
  const startOfTodayUtc = new Date()
  startOfTodayUtc.setUTCHours(0, 0, 0, 0)

  const rows = await visitsCollection
    .aggregate([
      {
        $addFields: {
          visitsCount: { $size: { $ifNull: ['$visits', []] } },
          todayVisitsCount: {
            $size: {
              $filter: {
                input: { $ifNull: ['$visits', []] },
                as: 'visit',
                cond: { $gte: ['$$visit.visitedAt', startOfTodayUtc] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$siteId',
          siteName: { $last: '$siteName' },
          totalVisits: { $sum: '$visitsCount' },
          uniqueVisitors: { $sum: 1 },
          todayVisits: { $sum: '$todayVisitsCount' },
        },
      },
      {
        $project: {
          _id: 0,
          siteId: '$_id',
          siteName: 1,
          totalVisits: 1,
          uniqueVisitors: 1,
          todayVisits: 1,
        },
      },
      {
        $sort: { totalVisits: -1 },
      },
    ])
    .toArray()

  return res.json({ projects: rows })
})

app.get('/api/sites/:siteId', async (req, res) => {
  const { siteId } = req.params

  if (!siteId) {
    return res.status(400).json({ error: 'Missing siteId parameter' })
  }

  const visitors = await visitsCollection
    .find({ siteId })
    .sort({ lastSeenAt: -1 })
    .toArray()

  const siteInfo = visitors.length > 0
    ? {
        siteId,
        siteName: visitors[0].siteName || siteId,
        totalVisits: visitors.reduce((sum, v) => sum + (v.visits?.length || 0), 0),
        uniqueVisitors: visitors.length,
      }
    : null

  return res.json({
    site: siteInfo,
    visitors: visitors.map((v) => ({
      visitorHash: v.visitorHash,
      firstSeenAt: v.firstSeenAt,
      lastSeenAt: v.lastSeenAt,
      visitCount: v.visits?.length || 0,
      visits: (v.visits || []).slice(-50).reverse(),
    })),
  })
})

startServer().catch((error) => {
  console.error('Failed to start API server:', error)
  process.exit(1)
})

function parseApiKeys(rawValue) {
  return String(rawValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function normalizeIsoDate(value) {
  const asString = String(value || '').trim()
  if (!asString) {
    return null
  }

  const date = new Date(asString)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function buildVisitorHash(req, siteId) {
  const forwardedFor = String(req.header('x-forwarded-for') || '')
  const ip = forwardedFor.split(',')[0]?.trim() || req.socket.remoteAddress || ''
  const userAgent = String(req.header('user-agent') || '')

  return crypto.createHash('sha256').update(`${siteId}|${ip}|${userAgent}`).digest('hex')
}

async function startServer() {
  const database = await initDatabase(MONGODB_URI, MONGODB_DB_NAME, MONGODB_VISITS_COLLECTION)
  visitsCollection = database.visitsCollection

  app.listen(PORT, () => {
    console.log(`Visteria API listening on http://localhost:${PORT}`)
    console.log(`Mongo target: ${MONGODB_DB_NAME}.${MONGODB_VISITS_COLLECTION}`)
  })
}
