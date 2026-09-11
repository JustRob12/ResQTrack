'use client'

import { PieChart, ShieldAlert } from 'lucide-react'
import type { IncidentTypeStat } from '@/lib/analytics'

interface IncidentTypeBreakdownProps {
  types: IncidentTypeStat[]
}

export function IncidentTypeBreakdown({ types }: IncidentTypeBreakdownProps) {
  const totalIncidents = types.reduce((sum, t) => sum + t.count, 0)

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-red-600" />
            Incident Classification Breakdown
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Categorical analysis of emergencies logged in MDRRMO Tarragona.
          </p>
        </div>
        <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-lg">
          {totalIncidents} Total
        </span>
      </div>

      <div className="space-y-3 pt-2">
        {types.map((type) => (
          <div key={type.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: type.color }}
                />
                <span className="font-semibold text-zinc-800">{type.name}</span>
              </div>
              <span className="font-mono text-zinc-500">
                <span className="font-bold text-zinc-800">{type.count}</span> ({type.percentage}%)
              </span>
            </div>

            {/* Horizontal progress bar */}
            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(3, type.percentage)}%`,
                  backgroundColor: type.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
