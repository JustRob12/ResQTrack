'use client'

import { TrendingUp, Activity } from 'lucide-react'
import type { TrendDay } from '@/lib/analytics'

interface IncidentTrendChartProps {
  trends: TrendDay[]
}

export function IncidentTrendChart({ trends }: IncidentTrendChartProps) {
  const maxTotal = Math.max(1, ...trends.map((t) => t.total))

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-600" />
            14-Day Incident Volume &amp; Dispatch Trend
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Temporal tracking of emergency notifications vs. deployed rescue operations.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-zinc-600">
            <span className="w-3 h-3 rounded bg-zinc-300"></span> Total Incidents
          </span>
          <span className="flex items-center gap-1.5 font-medium text-zinc-800">
            <span className="w-3 h-3 rounded bg-red-600"></span> Dispatched
          </span>
        </div>
      </div>

      {/* Bar Trend Columns */}
      <div className="h-48 flex items-end justify-between gap-1.5 sm:gap-3 pt-6 pb-2">
        {trends.map((day) => {
          const totalHeightPercent = Math.round((day.total / maxTotal) * 100)
          const dispatchedHeightPercent =
            day.total > 0 ? Math.round((day.dispatched / maxTotal) * 100) : 0

          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative"
            >
              {/* Tooltip on hover */}
              <div className="absolute -top-10 hidden group-hover:flex z-20 flex-col items-center p-1.5 rounded bg-zinc-900 text-white text-[10px] whitespace-nowrap shadow-md">
                <span className="font-bold">{day.label}</span>
                <span>
                  {day.total} Reported &bull; {day.dispatched} Dispatched
                </span>
              </div>

              {/* Stacked / Grouped Bar */}
              <div className="w-full flex items-end justify-center gap-0.5 h-full">
                {/* Total Bar */}
                <div
                  className={`w-full max-w-[14px] rounded-t transition-all ${
                    day.total > 0 ? 'bg-zinc-300 group-hover:bg-zinc-400' : 'bg-zinc-100'
                  }`}
                  style={{ height: `${Math.max(4, totalHeightPercent)}%` }}
                />
                {/* Dispatched Bar */}
                <div
                  className={`w-full max-w-[14px] rounded-t transition-all ${
                    day.dispatched > 0 ? 'bg-red-600 group-hover:bg-red-700' : 'bg-transparent'
                  }`}
                  style={{ height: `${Math.max(0, dispatchedHeightPercent)}%` }}
                />
              </div>

              {/* X-axis Date label */}
              <span className="text-[10px] text-zinc-400 truncate w-full text-center mt-1">
                {day.label.split(' ')[1] || day.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
