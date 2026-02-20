import { getVisitsCollection, verifyApiKey } from './_lib/db.js'

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
    const visitsCollection = await getVisitsCollection()

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
  } catch (error) {
    console.error('Projects error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
