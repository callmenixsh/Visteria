import { getVisitsCollection, verifyApiKey } from '../_lib/db.js'

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 200

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = verifyApiKey(req)
  if (!auth.valid) {
    return res.status(auth.error === 'Unauthorized' ? 401 : 500).json({ error: auth.error })
  }

  try {
    const { siteId } = req.query

    if (!siteId) {
      return res.status(400).json({ error: 'Missing siteId parameter' })
    }

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    )
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0)

    const visitsCollection = await getVisitsCollection()

    const [siteAgg] = await visitsCollection
      .aggregate([
        { $match: { siteId } },
        {
          $group: {
            _id: null,
            siteName: { $last: '$siteName' },
            siteUrl: { $last: '$siteUrl' },
            firstSeenAt: { $min: '$firstSeenAt' },
            totalVisits: {
              $sum: { $ifNull: ['$visitCount', { $size: { $ifNull: ['$visits', []] } }] },
            },
            uniqueVisitors: { $sum: 1 },
          },
        },
      ])
      .toArray()

    const totalVisitors = await visitsCollection.countDocuments({ siteId })

    const siteInfo = siteAgg
      ? {
          siteId,
          siteName: siteAgg.siteName || siteId,
          siteUrl: siteAgg.siteUrl || null,
          firstSeenAt: siteAgg.firstSeenAt || null,
          totalVisits: siteAgg.totalVisits,
          uniqueVisitors: siteAgg.uniqueVisitors,
        }
      : null

    const visitors = await visitsCollection
      .find({ siteId })
      .sort({ lastSeenAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return res.json({
      site: siteInfo,
      totalVisitors,
      visitors: visitors.map((v) => ({
        visitorHash: v.visitorHash,
        firstSeenAt: v.firstSeenAt,
        lastSeenAt: v.lastSeenAt,
        visitCount: v.visitCount != null ? v.visitCount : (v.visits?.length || 0),
        visits: (v.visits || []).slice().reverse(),
      })),
    })
  } catch (error) {
    console.error('Site detail error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}