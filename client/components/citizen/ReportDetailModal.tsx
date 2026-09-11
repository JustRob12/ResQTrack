'use client'

import { X, ExternalLink } from 'lucide-react'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { ReportItem } from '@/types/report'

interface ReportDetailModalProps {
  report: ReportItem | null
  onClose: () => void
}

export function ReportDetailModal({ report, onClose }: ReportDetailModalProps) {
  if (!report) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <StatusBadge status={report.status} />
            <h3 className="text-base font-bold text-zinc-900 mt-1">{report.title}</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media */}
        <div className="rounded-lg overflow-hidden bg-black max-h-72 flex items-center justify-center border border-zinc-200">
          {report.media_type === 'video' ? (
            <video src={report.media_url} controls className="max-h-72 w-full object-contain" />
          ) : (
            <img
              src={report.media_url}
              alt={report.title}
              className="max-h-72 w-full object-contain"
            />
          )}
        </div>

        {/* Description */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Details</h4>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
            {report.caption || 'No situation description provided.'}
          </p>
        </div>

        {/* GPS */}
        {report.latitude && (
          <div className="p-3 bg-zinc-50 rounded-lg text-xs flex items-center justify-between">
            <span className="font-mono text-zinc-600">
              {report.latitude.toFixed(5)}, {report.longitude?.toFixed(5)}
            </span>
            <a
              href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="text-red-600 hover:underline inline-flex items-center gap-1 font-bold"
            >
              View on Map <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Rejection Note */}
        {report.status === 'rejected' && report.rejection_reason && (
          <div className="p-3 rounded-lg bg-zinc-50 text-xs text-zinc-600">
            <span className="font-bold text-zinc-800">Admin Rejection Note:</span>{' '}
            {report.rejection_reason}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}
