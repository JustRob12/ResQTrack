'use client'

import { ShieldAlert, RefreshCw, Filter } from 'lucide-react'
import { AdminReportCard } from '@/components/admin/AdminReportCard'
import type { ReportItem, ReportStatus } from '@/types/report'

interface AdminCommandCenterProps {
  allReports: ReportItem[]
  reportsLoading: boolean
  adminFilter: 'all' | ReportStatus
  actionLoading: boolean
  onFilterChange: (filter: 'all' | ReportStatus) => void
  onRefresh: () => void
  onAcceptReport: (id: string) => void
  onRejectClick: (report: ReportItem) => void
}

export function AdminCommandCenter({
  allReports,
  reportsLoading,
  adminFilter,
  actionLoading,
  onFilterChange,
  onRefresh,
  onAcceptReport,
  onRejectClick,
}: AdminCommandCenterProps) {
  const filteredReports = allReports.filter(
    (r) => (adminFilter === 'all' ? true : r.status === adminFilter)
  )

  const pendingCount = allReports.filter((r) => r.status === 'pending').length
  const acceptedCount = allReports.filter((r) => r.status === 'accepted').length
  const rejectedCount = allReports.filter((r) => r.status === 'rejected').length

  return (
    <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 flex-1 space-y-6">
      {/* Admin Header Stats */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-600" />
              MDRRMO Incident Verification &amp; Dispatch Center
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Real-time monitoring and verification of citizen emergency reports across Tarragona.
            </p>
          </div>

          <button
            onClick={onRefresh}
            disabled={reportsLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reportsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-zinc-100 text-xs">
          <div className="p-3 bg-zinc-50 rounded-lg">
            <span className="text-zinc-400 block font-medium">Total Received</span>
            <span className="text-lg font-bold text-zinc-800">{allReports.length}</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <span className="text-amber-700 block font-medium">Pending Review</span>
            <span className="text-lg font-bold text-amber-900">{pendingCount}</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg">
            <span className="text-emerald-700 block font-medium">Accepted (Dispatched)</span>
            <span className="text-lg font-bold text-emerald-900">{acceptedCount}</span>
          </div>
          <div className="p-3 bg-zinc-100 rounded-lg">
            <span className="text-zinc-500 block font-medium">Rejected / Dismissed</span>
            <span className="text-lg font-bold text-zinc-700">{rejectedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-zinc-400 ml-1 shrink-0" />
        {(['all', 'pending', 'accepted', 'rejected'] as const).map((filterType) => (
          <button
            key={filterType}
            onClick={() => onFilterChange(filterType)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0 ${
              adminFilter === filterType
                ? 'bg-zinc-900 text-white'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {filterType} (
            {filterType === 'all'
              ? allReports.length
              : filterType === 'pending'
              ? pendingCount
              : filterType === 'accepted'
              ? acceptedCount
              : rejectedCount}
            )
          </button>
        ))}
      </div>

      {/* Reports Queue */}
      <div className="space-y-4">
        {filteredReports.map((report) => (
          <AdminReportCard
            key={report.id}
            report={report}
            actionLoading={actionLoading}
            onAccept={onAcceptReport}
            onRejectClick={onRejectClick}
          />
        ))}

        {filteredReports.length === 0 && (
          <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center shadow-xs">
            <p className="text-sm text-zinc-500">No emergency reports found in this view.</p>
          </div>
        )}
      </div>
    </main>
  )
}
