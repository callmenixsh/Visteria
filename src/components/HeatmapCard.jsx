import { useState } from 'react'

const LEGEND_STOPS = [4, 20, 36, 52, 68]

function heatOpacity(count, max) {
  return count > 0 ? 5 + Math.round((count / max) * 60) : 4
}

export default function HeatmapCard({ title, peak, rows, max, cellSize, gap }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const [hoverIndex, setHoverIndex] = useState(null)

  const labelWidth = 30
  const gridStyle = {
    gridTemplateColumns: `${labelWidth}px repeat(24, ${cellSize}px)`,
    gap: `${gap}px`,
  }

  return (
    <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-4">
        <p className="text-xs font-medium text-black/60 dark:text-white/60">{title}</p>
        {peak && (
          <p className="text-xs text-black/40 dark:text-white/40 truncate">
            Peak: <span className="text-black dark:text-white font-medium">{peak.label} ({peak.count})</span>
          </p>
        )}
      </div>
      <div className="w-fit mx-auto">
        <div className="grid text-black dark:text-white" style={gridStyle}>
          {rows.flatMap((row, ri) => [
            <div
              key={`${row.dateKey}-label`}
              className="flex items-center justify-end pr-1 text-[9px] text-black/40 dark:text-white/40 leading-none truncate"
            >
              {row.dayLabel}
            </div>,
            ...row.cells.map((count, hour) => {
              const flat = ri * 24 + hour
              const active = (hoverIndex ?? activeIndex) === flat
              const pct = heatOpacity(count, max)
              return (
                <button
                  key={`${row.dateKey}-${hour}`}
                  type="button"
                  onClick={() => setActiveIndex((prev) => (prev === flat ? null : flat))}
                  onMouseEnter={() => setHoverIndex(flat)}
                  onMouseLeave={() => setHoverIndex(null)}
                  className="relative"
                  aria-label={`${row.dayLabel} ${hour}:00 — ${count} ${count === 1 ? 'visit' : 'visits'}`}
                >
                  <div
                    className={`rounded-[2px] transition-opacity ${
                      active ? 'outline outline-1 outline-current' : ''
                    }`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: `color-mix(in srgb, currentColor ${pct}%, transparent)`,
                    }}
                  />
                  <div
                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded-md bg-black text-white dark:bg-white dark:text-black text-[9px] font-medium whitespace-nowrap pointer-events-none z-10 transition-opacity ${
                      active ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    {row.dayLabel} {hour}:00 — {count}
                  </div>
                </button>
              )
            }),
          ])}
        </div>
        <div className="grid mt-1.5 text-[9px] text-black/40 dark:text-white/40" style={gridStyle}>
          <span />
          <span className="col-start-2">12am</span>
          <span className="col-start-7">6am</span>
          <span className="col-start-13">12pm</span>
          <span className="col-start-19">6pm</span>
          <span className="col-start-25 justify-self-end">11pm</span>
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[9px] text-black/40 dark:text-white/40">
          <span>Less</span>
          <span className="flex gap-0.5">
            {LEGEND_STOPS.map((opacity) => (
              <span
                key={opacity}
                className="w-2.5 h-2.5 rounded-[2px]"
                style={{ backgroundColor: `color-mix(in srgb, currentColor ${opacity}%, transparent)` }}
              />
            ))}
          </span>
          <span>More</span>
        </div>
      </div>
    </div>
  )
}