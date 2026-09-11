'use client'

import { Printer, Download, Calendar, Filter } from 'lucide-react'
import type { ReportStatus } from '@/types/report'

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'all'

interface ReportExportControlsProps {
  period: ReportPeriod
  onPeriodChange: (p: ReportPeriod) => void
  statusFilter: 'all' | ReportStatus
  onStatusFilterChange: (s: 'all' | ReportStatus) => void
  onPrint: () => void
  onExportCsv: () => void
  reportCount: number
}

export function ReportExportControls({
  period,
  onPeriodChange,
  statusFilter,
  onStatusFilterChange,
  onPrint,
  onExportCsv,
  reportCount,
}: ReportExportControlsProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
      {/* Left: Filter Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 p-1 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-zinc-400 ml-1.5" />
          {(
            [
              { id: 'daily', label: '24h SitRep' },
              { id: 'weekly', label: 'Weekly Summary' },
              { id: 'monthly', label: 'Monthly Report' },
              { id: 'all', label: 'All Records' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => onPeriodChange(p.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                period === p.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 p-1 rounded-lg text-xs">
          <Filter className="w-3.5 h-3.5 text-zinc-400 ml-1.5" />
          {(
            [
              { id: 'all', label: 'All Status' },
              { id: 'accepted', label: 'Dispatched Only' },
              { id: 'pending', label: 'Pending Only' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => onStatusFilterChange(s.id)}
              className={`px-2 py-1 rounded-md font-semibold transition-all ${
                statusFilter === s.id
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Export Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onExportCsv}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-zinc-500" />
          <span>Export CSV ({reportCount})</span>
        </button>

        <button
          onClick={onPrint}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-2xs"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Save PDF</span>
        </button>
      </div>
    </div>
  )
}
