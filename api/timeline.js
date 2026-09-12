import { getVisitsCollection, verifyApiKey } from './_lib/db.js'
import { TREND_MODES, computePoints, getStartDate } from './_lib/trend.js'

export default async function handler(req, res) {
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

  const mode = String(req.query.mode || 'year').trim()
  if (!TREND_MODES.includes(mode)) {
    return res.status(400).json({ error: `mode must be one of: ${TREND_MODES.join(', ')}` })
  }

  try {
    const visitsCollection = await getVisitsCollection()
    const now = new Date()
    const startDate = getStartDate(mode, now)

    const rows = await visitsCollection
      .aggregate([
        { $match: { 'visits.visitedAt': { $gte: startDate } } },
        { $unwind: '$visits' },
        { $project: { _id: 0, t: '$visits.visitedAt' } },
      ])
      .toArray()

    const dates = rows
      .map((row) => row.t)
      .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()) && date >= startDate)

    return res.json({ mode, points: computePoints(dates, mode, now) })
  } catch (error) {
    console.error('Timeline error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}