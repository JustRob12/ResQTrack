'use client'

import { X } from 'lucide-react'
import type { ReportItem } from '@/types/report'

interface AdminRejectModalProps {
  report: ReportItem | null
  reason: string
  loading: boolean
  onReasonChange: (val: string) => void
  onClose: () => void
  onConfirm: () => void
}

export function AdminRejectModal({
  report,
  reason,
  loading,
  onReasonChange,
  onClose,
  onConfirm,
}: AdminRejectModalProps) {
  if (!report) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900">Reject Emergency Report</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-500">
          Provide a reason for declining report #{report.id.slice(0, 8)}. This will be visible to the reporter.
        </p>

        <div>
          <label className="block text-xs font-bold text-zinc-700 mb-1">Rejection Reason</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g. False alarm / Duplicate report / Situation already resolved"
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  )
}
