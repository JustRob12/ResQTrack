'use client'

import { MapPin, AlertOctagon } from 'lucide-react'
import type { BarangayStat } from '@/lib/analytics'

interface LocationAffectedTableProps {
  locations: BarangayStat[]
}

export function LocationAffectedTable({ locations }: LocationAffectedTableProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-600" />
              Most Affected Locations (Barangay Breakdown)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Spatial vulnerability and incident density ranking across Tarragona barangays.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="pb-2.5">Barangay</th>
                <th className="pb-2.5 text-center">Incidents</th>
                <th className="pb-2.5 text-center">Municipal Share</th>
                <th className="pb-2.5 text-right">Risk Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {locations.map((item, index) => {
                const badgeColor =
                  item.riskLevel === 'Critical'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : item.riskLevel === 'High'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : item.riskLevel === 'Moderate'
                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200'

                return (
                  <tr key={item.name} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-2 font-bold text-zinc-800 flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-400 w-4">
                        #{index + 1}
                      </span>
                      <span>{item.name}</span>
                    </td>
                    <td className="py-2 text-center font-mono font-bold text-zinc-900">
                      {item.count}
                    </td>
                    <td className="py-2 text-center">
                      <div className="inline-flex items-center gap-1.5 w-24">
                        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-600 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-zinc-500 w-8 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}
                      >
                        {item.riskLevel}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-zinc-400 border-t border-zinc-100 pt-3">
        Data integrates geotagged incidents, citizen reports, and MDRRMO incident coordinates.
      </p>
    </div>
  )
}
