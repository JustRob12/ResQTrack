'use client'

import { Users, Shield, CheckCircle2, Clock, Radio, Activity } from 'lucide-react'
import type { RescuerMetrics } from '@/lib/analytics'

interface RescuerPerformanceCardProps {
  metrics: RescuerMetrics
}

export function RescuerPerformanceCard({ metrics }: RescuerPerformanceCardProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-red-600" />
            Rescue Operations &amp; Rescuer Performance Monitoring
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Operational status pipeline, verification speed, and dispatch force readiness.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 self-start sm:self-auto">
          <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
          <span>Active Operations Force</span>
        </div>
      </div>

      {/* Triage Pipeline Progress Bar */}
      <div className="space-y-2 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-700">
          <span>Incident Triage Pipeline</span>
          <span className="text-zinc-500 font-normal">
            {metrics.accepted} of {metrics.total} Dispatched
          </span>
        </div>

        {/* Multi-segment bar */}
        <div className="h-3.5 w-full rounded-full bg-zinc-200 overflow-hidden flex">
          {metrics.accepted > 0 && (
            <div
              className="h-full bg-emerald-600 transition-all"
              style={{
                width: `${(metrics.accepted / (metrics.total || 1)) * 100}%`,
              }}
              title={`Dispatched: ${metrics.accepted}`}
            />
          )}
          {metrics.pending > 0 && (
            <div
              className="h-full bg-amber-500 transition-all"
              style={{
                width: `${(metrics.pending / (metrics.total || 1)) * 100}%`,
              }}
              title={`Pending: ${metrics.pending}`}
            />
          )}
          {metrics.rejected > 0 && (
            <div
              className="h-full bg-zinc-400 transition-all"
              style={{
                width: `${(metrics.rejected / (metrics.total || 1)) * 100}%`,
              }}
              title={`Dismissed: ${metrics.rejected}`}
            />
          )}
        </div>

        {/* Pipeline Legend */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>Dispatched: {metrics.accepted}</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Pending: {metrics.pending}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-400"></span>
            <span>Dismissed: {metrics.rejected}</span>
          </div>
        </div>
      </div>

      {/* Dispatched Forces & Response Teams Table */}
      <div>
        <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2.5">
          Emergency Response Units Deployment Status
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {metrics.activeUnits.map((unit) => {
            const statusColor =
              unit.status === 'Ready'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : unit.status === 'On Mission'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-zinc-100 text-zinc-600 border-zinc-200'

            return (
              <div
                key={unit.name}
                className="p-3 bg-white border border-zinc-200 rounded-lg flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-zinc-900">{unit.name}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{unit.role}</div>
                  <div className="text-[11px] font-mono text-zinc-600 mt-1">
                    <span className="font-bold text-red-600">{unit.dispatches}</span> operations assigned
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusColor}`}
                >
                  {unit.status}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
