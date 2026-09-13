export const TREND_MODES = ['all', 'year', 'month', 'week', 'day']

const MS_IN_DAY = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * MS_IN_DAY

function sundayOfWeek(midnightMs) {
  return midnightMs - new Date(midnightMs).getDay() * MS_IN_DAY
}

export function weekLabels(date, nextDate) {
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endDate = new Date(nextDate.getTime() - MS_IN_DAY)
  const span = `${fmt(date)} – ${fmt(endDate)}`
  return {
    label: span,
    shortLabel: fmt(date),
    peakLabel: span,
  }
}

export function getStartDate(mode, now) {
  switch (mode) {
    case 'all':
      return new Date(0)
    case 'year':
      return new Date(now.getFullYear(), now.getMonth() - 11, 1)
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
    case 'week':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    case 'day':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - 23)
    default:
      return new Date(0)
  }
}

export function computePoints(dates, mode, now = new Date()) {
  const points = []
  const countInRange = (start, end) => dates.filter((date) => date >= start && date < end).length

  if (mode === 'all') {
    if (!dates.length) return []
    const earliest = new Date(Math.min(...dates.map((date) => date.getTime())))
    const earliestMidnight = new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate()).getTime()
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

    for (let weekStart = sundayOfWeek(earliestMidnight); weekStart <= sundayOfWeek(todayMidnight); weekStart += WEEK_MS) {
      const date = new Date(weekStart)
      const nextDate = new Date(weekStart + WEEK_MS)
      points.push({
        ...weekLabels(date, nextDate),
        visits: countInRange(date, nextDate),
      })
    }
  }

  if (mode === 'year') {
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const anchor = sundayOfWeek(todayMidnight)
    const start = anchor - 51 * WEEK_MS
    for (let i = 0; i < 52; i++) {
      const date = new Date(start + i * WEEK_MS)
      const nextDate = new Date(start + (i + 1) * WEEK_MS)
      points.push({
        ...weekLabels(date, nextDate),
        visits: countInRange(date, nextDate),
      })
    }
  }

  if (mode === 'month') {
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1)
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' })
      points.push({
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        shortLabel: String(date.getDate()),
        peakLabel: `${date.getDate()}-${monthLabel}`,
        visits: countInRange(date, nextDate),
      })
    }
  }

  if (mode === 'week') {
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1)
      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' })
      points.push({
        label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        shortLabel: dayLabel,
        peakLabel: `${dayLabel}-${date.getDate()}`,
        visits: countInRange(date, nextDate),
      })
    }
  }

  if (mode === 'day') {
    for (let i = 23; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - i, 0, 0, 0)
      const nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - i + 1, 0, 0, 0)
      const hourLabel = date.toLocaleTimeString('en-US', { hour: 'numeric' })
      points.push({
        label: hourLabel,
        shortLabel: hourLabel,
        peakLabel: hourLabel,
        visits: countInRange(date, nextDate),
      })
    }
  }

  return points
}