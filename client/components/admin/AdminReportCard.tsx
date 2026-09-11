'use client'

import { Clock, Phone, MapPin, ExternalLink, CheckCircle2, XCircle } from 'lucide-react'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { ReportItem } from '@/types/report'

interface AdminReportCardProps {
  report: ReportItem
  actionLoading: boolean
  onAccept: (id: string) => void
  onRejectClick: (report: ReportItem) => void
}

export function AdminReportCard({
  report,
  actionLoading,
  onAccept,
  onRejectClick,
}: AdminReportCardProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge status={report.status} />
            <h3 className="text-base font-bold text-zinc-900">{report.title}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {new Date(report.created_at).toLocaleDateString()}{' '}
              {new Date(report.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Reporter contact */}
        <div className="text-xs text-zinc-600 sm:text-right bg-zinc-50 sm:bg-transparent p-2.5 sm:p-0 rounded-lg">
          <div className="font-semibold text-zinc-800">
            {report.profiles?.full_name || 'Citizen User'}
          </div>
          {report.profiles?.phone_number && (
            <a
              href={`tel:${report.profiles.phone_number.replace(/[^0-9]/g, '')}`}
              className="text-red-600 hover:underline flex items-center sm:justify-end gap-1 font-mono"
            >
              <Phone className="w-3 h-3" />
              {report.profiles.phone_number}
            </a>
          )}
          {report.profiles?.email && (
            <div className="text-zinc-400">{report.profiles.email}</div>
          )}
        </div>
      </div>

      {/* Media and Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Media Preview */}
        <div className="rounded-lg overflow-hidden bg-black max-h-60 flex items-center justify-center border border-zinc-200">
          {report.media_type === 'video' ? (
            <video src={report.media_url} controls className="max-h-60 w-full object-contain" />
          ) : (
            <img
              src={report.media_url}
              alt={report.title}
              className="max-h-60 w-full object-contain cursor-pointer"
              onClick={() => window.open(report.media_url, '_blank')}
            />
          )}
        </div>

        {/* Incident Details & GPS */}
        <div className="space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Situation Description
            </h4>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
              {report.caption || 'No detailed situation description provided.'}
            </p>
          </div>

          {/* Coordinates */}
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100 text-xs">
            <div className="font-semibold text-zinc-700 flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              Incident Coordinates
            </div>
            {report.latitude ? (
              <div className="flex items-center justify-between">
                <span className="font-mono text-zinc-600">
                  {report.latitude.toFixed(5)}, {report.longitude?.toFixed(5)}
                </span>
                <a
                  href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-red-600 hover:underline inline-flex items-center gap-1 font-bold"
                >
                  Open in Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <span className="text-zinc-400">GPS location was not provided.</span>
            )}
          </div>

          {/* Rejection Note if Rejected */}
          {report.status === 'rejected' && report.rejection_reason && (
            <div className="p-2.5 bg-zinc-100 rounded text-xs text-zinc-600">
              <span className="font-bold text-zinc-800">Rejection Reason:</span>{' '}
              {report.rejection_reason}
            </div>
          )}
        </div>
      </div>

      {/* Verification Actions for Admins */}
      <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-end gap-2.5">
        {report.status !== 'accepted' && (
          <button
            onClick={() => onAccept(report.id)}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Accept Emergency (Dispatch)</span>
          </button>
        )}

        {report.status !== 'rejected' && (
          <button
            onClick={() => onRejectClick(report)}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5 text-zinc-500" />
            <span>Reject Report</span>
          </button>
        )}
      </div>
    </div>
  )
}
