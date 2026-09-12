import { useState } from 'react'

const W = 300
const H = 140
const PAD = 6
const PLOT_H = H - PAD * 2

function yPct(visits, axisMax) {
  const y = H - PAD - (Math.max(0, visits) / Math.max(axisMax, 1)) * PLOT_H
  return (y / H) * 100
}

function buildCoords(points, axisMax) {
  const n = points.length
  const xFor = (i) => (n <= 1 ? W / 2 : (i / (n - 1)) * W)
  const yFor = (visits) => H - PAD - (Math.max(0, visits) / Math.max(axisMax, 1)) * PLOT_H
  return points.map((point, i) => ({ x: xFor(i), y: yFor(point.visits) }))
}

function niceCeil(value) {
  if (value <= 1) return 1
  const power = Math.pow(10, Math.floor(Math.log10(value)))
  const fraction = value / power
  if (fraction <= 1) return power
  if (fraction <= 2) return 2 * power
  if (fraction <= 5) return 5 * power
  return 10 * power
}

function formatCompact(value) {
  if (value >= 1000) {
    const rounded = (value / 1000).toFixed(value >= 10000 ? 0 : 1)
    return `${rounded.replace(/\.0$/, '')}k`
  }
  return String(value)
}

function smoothPath(coords) {
  if (!coords.length) return ''

  const clamp = (v) => Math.min(H - PAD, Math.max(PAD, v))

  let d = `M ${coords[0].x},${coords[0].y}`
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] || coords[i]
    const p1 = coords[i]
    const p2 = coords[i + 1]
    const p3 = coords[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6)
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6)
    d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
  }
  return d
}

export default function TrendChart({
  points,
  maxVisits,
  activeIndex,
  onSelect,
  height = 'h-44 sm:h-52',
}) {
  const [hoverIndex, setHoverIndex] = useState(null)

  const n = points.length
  const axisMax = niceCeil(Math.max(1, maxVisits))
  const coords = buildCoords(points, axisMax)
  const shownIndex = hoverIndex ?? activeIndex
  const xPct = (i) => (n <= 1 ? 50 : (i / (n - 1)) * 100)

  const lineD = smoothPath(coords)
  const areaD =
    lineD && coords.length
      ? `${lineD} L ${coords[coords.length - 1].x},${H} L ${coords[0].x},${H} Z`
      : ''

  return (
    <div className={`relative ${height} flex gap-2 text-black dark:text-white`}>
      {/* Y-axis value labels, aligned to the gridlines */}
      <div className="relative w-7 flex-shrink-0 text-right text-[9px] text-black/40 dark:text-white/40 tabular-nums">
        {[1, 0.5, 0].map((fraction) => {
          const y = PAD + (1 - fraction) * PLOT_H
          const value = Math.round(fraction * axisMax)
          return (
            <span
              key={fraction}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${(y / H) * 100}%` }}
            >
              {formatCompact(value)}
            </span>
          )
        })}
      </div>

      <div className="relative flex-1 min-w-0">
      <svg
        className="w-full h-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((ratio) => {
          const y = PAD + ratio * PLOT_H
          return (
            <line
              key={ratio}
              x1="0"
              x2={W}
              y1={y}
              y2={y}
              className="stroke-black/[0.06] dark:stroke-white/[0.06]"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}

        {areaD && <path d={areaD} fill="url(#trendFill)" />}
        {lineD && (
          <path
            d={lineD}
            fill="none"
            className="stroke-black dark:stroke-white"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* Hover / active marker (crisp HTML elements, no SVG distortion) */}
      {shownIndex != null && coords[shownIndex] && (
        <>
          <div
            className="absolute top-1 bottom-1 w-px bg-black/25 dark:bg-white/25 pointer-events-none"
            style={{ left: `${xPct(shownIndex)}%` }}
          />
          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-current ring-4 ring-black/10 dark:ring-white/10 pointer-events-none"
            style={{ left: `${xPct(shownIndex)}%`, top: `${yPct(points[shownIndex].visits, axisMax)}%` }}
          />
        </>
      )}

      {/* Tap/hover zones + tooltip */}
      <div className="absolute inset-0 flex">
        {points.map((point, i) => {
          const show = shownIndex === i
          const alignLeft = i === 0
          const alignRight = i === n - 1
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect?.(i)}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onFocus={() => setHoverIndex(i)}
              onBlur={() => setHoverIndex(null)}
              className="flex-1 relative"
              aria-label={`Show visits for ${point.label}`}
            >
              <div
                className={`absolute bottom-full mb-2 w-max max-w-[160px] px-2 py-1 rounded-md bg-black text-white dark:bg-white dark:text-black text-[10px] font-medium whitespace-nowrap pointer-events-none z-10 transition-opacity ${
                  show ? 'opacity-100' : 'opacity-0'
                } ${
                  alignLeft
                    ? 'left-0'
                    : alignRight
                      ? 'right-0'
                      : 'left-1/2 -translate-x-1/2'
                }`}
              >
                {point.label}: {point.visits}
              </div>
            </button>
          )
        })}
      </div>
      </div>
    </div>
  )
}