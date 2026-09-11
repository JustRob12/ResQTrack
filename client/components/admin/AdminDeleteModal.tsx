'use client'

import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import type { ReportItem } from '@/types/report'

interface AdminDeleteModalProps {
  report: ReportItem | null
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

export function AdminDeleteModal({
  report,
  loading,
  onClose,
  onConfirm,
}: AdminDeleteModalProps) {
  if (!report) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Delete Incident Report</h3>
              <p className="text-xs text-zinc-500">Report ID: #{report.id.slice(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-zinc-400 hover:text-zinc-600 p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Warning:</span> Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-zinc-900">&ldquo;{report.title}&rdquo;</span>?
            This will remove all associated media references and GPS coordinates. This action cannot be undone.
          </div>
        </div>

        {/* Report Details summary */}
        <div className="p-3 rounded-xl bg-zinc-50 text-xs space-y-1 text-zinc-600">
          <div>
            <span className="font-semibold text-zinc-800">Reporter:</span>{' '}
            {report.profiles?.full_name || 'Citizen'}
          </div>
          <div>
            <span className="font-semibold text-zinc-800">Logged At:</span>{' '}
            {new Date(report.created_at).toLocaleString()}
          </div>
          <div>
            <span className="font-semibold text-zinc-800">Status:</span>{' '}
            <span className="uppercase font-bold text-zinc-800">{report.status}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
