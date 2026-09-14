'use client'

import { useState } from 'react'
import {
  Clock,
  Phone,
  MapPin,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Trash2,
  Shield,
  Car,
  CheckCheck,
} from 'lucide-react'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { ReportItem } from '@/types/report'

interface AdminReportCardProps {
  report: ReportItem
  actionLoading: boolean
  onAccept: (id: string) => void
  onRejectClick: (report: ReportItem) => void
  onDeleteClick: (report: ReportItem) => void
}

export function AdminReportCard({
  report,
  actionLoading,
  onAccept,
  onRejectClick,
  onDeleteClick,
}: AdminReportCardProps) {
  const [activeProofUrl, setActiveProofUrl] = useState<string | null>(null)

  const isCompleted = report.mission_status === 'completed'
  const isEnRoute = report.mission_status === 'en_route'
  const isOnScene = report.mission_status === 'on_scene'

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header with Title, Status, and Reporter */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <StatusBadge status={report.status} />

            {/* Responder mission status badge */}
            {isCompleted ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                <CheckCheck className="w-3 h-3" />
                Rescued &bull; Proof Submitted
              </span>
            ) : isOnScene ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 flex items-center gap-1 border border-purple-200">
                <MapPin className="w-3 h-3" />
                Responder On Scene
              </span>
            ) : isEnRoute ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 flex items-center gap-1 border border-amber-200">
                <Car className="w-3 h-3 animate-pulse" />
                Responder En Route
              </span>
            ) : report.status === 'accepted' ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-100 text-zinc-600 flex items-center gap-1">
                Dispatched to Field
              </span>
            ) : null}
          </div>

          <h3 className="text-base font-bold text-zinc-900">{report.title}</h3>

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
        <div className="text-xs text-zinc-600 sm:text-right bg-zinc-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl">
          <div className="text-[10px] text-zinc-400 uppercase font-bold">Reporter</div>
          <div className="font-bold text-zinc-800">
            {report.profiles?.full_name || 'Citizen User'}
          </div>
          {report.profiles?.phone_number && (
            <a
              href={`tel:${report.profiles.phone_number.replace(/[^0-9]/g, '')}`}
              className="text-red-600 hover:underline flex items-center sm:justify-end gap-1 font-mono font-bold"
            >
              <Phone className="w-3 h-3" />
              {report.profiles.phone_number}
            </a>
          )}
        </div>
      </div>

      {/* Responder Deployment Status Banner (Admin fetching responder name) */}
      {report.responder_name ? (
        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Field Responder Assigned
              </span>
              <span className="font-bold text-emerald-950 text-sm">
                {report.responder_name}
              </span>
            </div>
          </div>

          {report.responder_phone && (
            <a
              href={`tel:${report.responder_phone.replace(/[^0-9]/g, '')}`}
              className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-bold hover:bg-emerald-50 transition-colors flex items-center gap-1 font-mono"
            >
              <Phone className="w-3 h-3 text-emerald-600" />
              <span>{report.responder_phone}</span>
            </a>
          )}
        </div>
      ) : report.status === 'accepted' ? (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>Dispatched &bull; Waiting for available responder unit to accept in Tarragona</span>
        </div>
      ) : null}

      {/* Media and Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Media Preview */}
        <div className="rounded-xl overflow-hidden bg-black max-h-56 flex items-center justify-center border border-zinc-200">
          {report.media_type === 'video' ? (
            <video src={report.media_url} controls className="max-h-56 w-full object-contain" />
          ) : (
            <img
              src={report.media_url}
              alt={report.title}
              className="max-h-56 w-full object-contain cursor-pointer"
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
            <p className="text-xs sm:text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
              {report.caption || 'No detailed situation description provided.'}
            </p>
          </div>

          {/* Coordinates */}
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs">
            <div className="font-semibold text-zinc-700 flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              Incident Coordinates
            </div>
            {report.latitude && report.longitude ? (
              <div className="flex items-center justify-between">
                <span className="font-mono text-zinc-600">
                  {Number(report.latitude).toFixed(5)}, {Number(report.longitude).toFixed(5)}
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
            <div className="p-2.5 bg-zinc-100 rounded-lg text-xs text-zinc-600">
              <span className="font-bold text-zinc-800">Rejection Reason:</span>{' '}
              {report.rejection_reason}
            </div>
          )}
        </div>
      </div>

      {/* Responder Completion Proof Photo(s) (Uploaded upon finish of rescue) */}
      {(() => {
        const proofImages =
          report.resolution_images && report.resolution_images.length > 0
            ? report.resolution_images
            : report.resolution_image_url
            ? [report.resolution_image_url]
            : []

        if (proofImages.length === 0) return null

        return (
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Official Rescue Completion Proof ({proofImages.length} Photo{proofImages.length > 1 ? 's' : ''})
                </span>
              </div>
              {report.resolved_at && (
                <span className="text-[11px] text-emerald-700 font-medium">
                  Resolved at{' '}
                  {new Date(report.resolved_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
              {/* Photo Thumbnails */}
              <div className="md:col-span-7">
                {proofImages.length === 1 ? (
                  <div className="rounded-xl overflow-hidden bg-black max-h-56 flex items-center justify-center border border-emerald-200">
                    <img
                      src={proofImages[0]}
                      alt="Proof of rescue completion"
                      className="max-h-56 w-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setActiveProofUrl(proofImages[0])}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {proofImages.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveProofUrl(url)}
                        className="relative aspect-square rounded-xl overflow-hidden bg-black border border-emerald-200 cursor-pointer group shadow-2xs hover:scale-[1.02] transition-transform"
                      >
                        <img
                          src={url}
                          alt={`Proof ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:opacity-90"
                        />
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white">
                          #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-emerald-700 mt-1.5 italic">
                  Tap any photo to view full size
                </div>
              </div>

              {/* Notes & Responder Info */}
              <div className="md:col-span-5 space-y-2 text-xs text-emerald-950">
                <div className="font-semibold text-[11px] text-emerald-800 uppercase tracking-wider">
                  Operation Resolution Notes
                </div>
                <p className="bg-white/80 p-2.5 rounded-xl border border-emerald-200 text-xs italic leading-relaxed text-zinc-700">
                  &ldquo;{report.resolution_notes || 'Rescue completed successfully.'}&rdquo;
                </p>
                <div className="text-[11px] text-emerald-800">
                  Verified by Responder:{' '}
                  <span className="font-bold">{report.responder_name || 'Assigned Officer'}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Verification Actions for Admins */}
      <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-end gap-2.5">
        {report.status !== 'accepted' && (
          <button
            onClick={() => onAccept(report.id)}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve &amp; Dispatch Responders</span>
          </button>
        )}

        {report.status !== 'rejected' && !isCompleted && (
          <button
            onClick={() => onRejectClick(report)}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5 text-zinc-500" />
            <span>Reject Report</span>
          </button>
        )}

        <button
          onClick={() => onDeleteClick(report)}
          disabled={actionLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors disabled:opacity-50"
          title="Delete this report permanently"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>

      {/* Full image preview modal for completion proof */}
      {activeProofUrl && (
        <div
          onClick={() => setActiveProofUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeProofUrl}
              alt="Proof of rescue completion"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
