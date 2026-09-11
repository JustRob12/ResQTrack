'use client'

import { Clock, Calendar, BarChart2 } from 'lucide-react'
import type { DayFrequency, HourFrequency } from '@/lib/analytics'

interface IncidentFrequencyChartProps {
  days: DayFrequency[]
  hours: HourFrequency[]
  peakDay: string
  peakHour: string
}

export function IncidentFrequencyChart({
  days,
  hours,
  peakDay,
  peakHour,
}: IncidentFrequencyChartProps) {
  const maxDayCount = Math.max(1, ...days.map((d) => d.count))
  const maxHourCount = Math.max(1, ...hours.map((h) => h.count))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Frequency by Day of the Week */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600" />
              Incident Frequency by Day of Week
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700">
              Peak: {peakDay}
            </span>
          </div>

          <div className="space-y-2.5">
            {days.map((item) => {
              const fillPercent = Math.round((item.count / maxDayCount) * 100)
              const isPeak = item.day === peakDay && item.count > 0

              return (
                <div key={item.day} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`font-semibold ${
                        isPeak ? 'text-red-600 font-bold' : 'text-zinc-700'
                      }`}
                    >
                      {item.day}
                    </span>
                    <span className="font-mono text-zinc-500">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isPeak ? 'bg-red-600' : 'bg-zinc-700'
                      }`}
                      style={{ width: `${Math.max(4, fillPercent)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <p className="mt-4 text-[11px] text-zinc-400 border-t border-zinc-100 pt-3">
          Reflects temporal clustering of reported emergencies across week cycles in Tarragona.
        </p>
      </div>

      {/* 2. Frequency by Peak Hours of the Day */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-600" />
              Hourly Distribution (24-Hour Timeline)
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800">
              Peak Window: {peakHour}
            </span>
          </div>

          {/* 24-Hour Bar Column Layout */}
          <div className="h-40 flex items-end justify-between gap-1 pt-4 pb-2">
            {hours.map((h) => {
              const heightPercent = Math.round((h.count / maxHourCount) * 100)
              const isPeak = h.count === maxHourCount && h.count > 0

              return (
                <div
                  key={h.hour}
                  className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-7 hidden group-hover:flex z-10 px-1.5 py-0.5 rounded bg-zinc-900 text-white text-[10px] whitespace-nowrap shadow-sm">
                    {h.label}: {h.count}
                  </div>

                  <div
                    className={`w-full rounded-t transition-all ${
                      isPeak
                        ? 'bg-red-600'
                        : h.count > 0
                        ? 'bg-zinc-700 hover:bg-zinc-900'
                        : 'bg-zinc-100'
                    }`}
                    style={{ height: `${Math.max(4, heightPercent)}%` }}
                  />
                </div>
              )
            })}
          </div>

          {/* Axis Labels */}
          <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-1 border-t border-zinc-100 pt-1">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span>11 PM</span>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-zinc-400 border-t border-zinc-100 pt-3">
          Surveillance monitoring reveals high emergency reporting density during peak transit &amp; evening hours.
        </p>
      </div>
    </div>
  )
}
