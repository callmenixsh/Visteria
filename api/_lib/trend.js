export const TREND_MODES = ['all', 'year', 'month', 'week', 'day']

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
    const monthStart = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
    const months =
      (now.getFullYear() - monthStart.getFullYear()) * 12 +
      (now.getMonth() - monthStart.getMonth()) +
      1

    for (let i = 0; i < months; i++) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth() + i, 1)
      const nextDate = new Date(monthStart.getFullYear(), monthStart.getMonth() + i + 1, 1)
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' })
      points.push({
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        shortLabel: monthLabel,
        peakLabel: `${monthLabel}-${date.getFullYear()}`,
        visits: countInRange(date, nextDate),
      })
    }
  }

  if (mode === 'year') {
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' })
      const yearLabel = date.getFullYear()
      points.push({
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        shortLabel: monthLabel,
        peakLabel: `${monthLabel}-${yearLabel}`,
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