import { getVisitsCollection, verifyApiKey } from '../_lib/db.js'

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

    const visitsCollection = await getVisitsCollection()

    const visitors = await visitsCollection
      .find({ siteId })
      .sort({ lastSeenAt: -1 })
      .toArray()

    // Get siteUrl from stored data (first visitor that has it)
    const siteUrl = visitors.find(v => v.siteUrl)?.siteUrl || null

    const siteInfo = visitors.length > 0
      ? {
          siteId,
          siteName: visitors[0].siteName || siteId,
          siteUrl,
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
        visits: (v.visits || []).slice().reverse(),
      })),
    })
  } catch (error) {
    console.error('Site detail error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
