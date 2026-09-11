'use client'

import { AlertTriangle, Clock, CheckCircle2, ShieldAlert, Activity, Users } from 'lucide-react'
import type { RescuerMetrics } from '@/lib/analytics'

interface AnalyticsKpisProps {
  metrics: RescuerMetrics
  mostAffectedBarangay: string
}

export function AnalyticsKpis({ metrics, mostAffectedBarangay }: AnalyticsKpisProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Incidents */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Total Incidents
          </span>
          <div className="p-2 rounded-lg bg-red-50 text-red-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-zinc-900">{metrics.total}</span>
          <span className="text-xs text-zinc-400 font-medium">Recorded</span>
        </div>
        <div className="mt-2 text-[11px] text-zinc-500 flex items-center gap-1">
          <span className="font-bold text-amber-600">{metrics.pending} pending</span> review
        </div>
      </div>

      {/* 2. Operations Dispatched Rate */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Dispatch Rate
          </span>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-emerald-600">
            {metrics.dispatchRate}%
          </span>
          <span className="text-xs text-zinc-400 font-medium">
            ({metrics.accepted} / {metrics.total || 1})
          </span>
        </div>
        <div className="mt-2 text-[11px] text-zinc-500">
          Responders deployed on-site
        </div>
      </div>

      {/* 3. Avg Dispatch Latency */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Avg Verification Time
          </span>
          <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-zinc-900">
            {metrics.avgResponseTimeMinutes}
          </span>
          <span className="text-xs text-zinc-500 font-semibold">mins</span>
        </div>
        <div className="mt-2 text-[11px] text-zinc-500 flex items-center gap-1">
          Fastest dispatch: <span className="font-bold text-zinc-700">{metrics.fastestResponseMinutes}m</span>
        </div>
      </div>

      {/* 4. Top Impact Zone */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Highest Density Area
          </span>
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-base sm:text-lg font-black text-zinc-900 truncate block">
            {mostAffectedBarangay}
          </span>
        </div>
        <div className="mt-2 text-[11px] text-zinc-500">
          Priority surveillance zone
        </div>
      </div>
    </div>
  )
}
