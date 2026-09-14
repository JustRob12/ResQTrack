'use client'

import { useState } from 'react'
import type { ReportItem } from '@/types/report'
import {
  Clock,
  Phone,
  MapPin,
  ExternalLink,
  Navigation,
  CheckCircle2,
  Camera,
  ShieldAlert,
  Car,
  CheckCheck,
} from 'lucide-react'

interface ResponderMissionCardProps {
  report: ReportItem
  distanceKm: number | null
  isActiveMission: boolean
  isSimulating: boolean
  onStartResponse: (report: ReportItem) => void
  onArrivedScene: (report: ReportItem) => void
  onOpenCompletionModal: (report: ReportItem) => void
  onToggleSimulation: () => void
}

export function ResponderMissionCard({
  report,
  distanceKm,
  isActiveMission,
  isSimulating,
  onStartResponse,
  onArrivedScene,
  onOpenCompletionModal,
  onToggleSimulation,
}: ResponderMissionCardProps) {
  const [showFullImage, setShowFullImage] = useState(false)
  const [activeProofUrl, setActiveProofUrl] = useState<string | null>(null)
  const isCompleted = report.mission_status === 'completed'
  const isEnRoute = report.mission_status === 'en_route'
  const isOnScene = report.mission_status === 'on_scene'

  const statusBadge = isCompleted ? (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1">
      <CheckCheck className="w-3.5 h-3.5" />
      Mission Accomplished
    </span>
  ) : isOnScene ? (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 border border-purple-200 text-purple-700 flex items-center gap-1">
      <MapPin className="w-3.5 h-3.5" />
      On Scene / Rescuing
    </span>
  ) : isEnRoute ? (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1">
      <Car className="w-3.5 h-3.5 animate-pulse" />
      En Route to Area
    </span>
  ) : (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 border border-red-200 text-red-700 flex items-center gap-1">
      <ShieldAlert className="w-3.5 h-3.5" />
      Dispatched by Admin
    </span>
  )

  return (
    <div
      className={`bg-white rounded-2xl border transition-all p-5 shadow-xs space-y-4 ${
        isActiveMission
          ? 'border-red-500 ring-2 ring-red-500/20'
          : 'border-zinc-200 hover:border-zinc-300'
      }`}
    >
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {statusBadge}
            {isActiveMission && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-zinc-900 text-white">
                Active Tracking Mission
              </span>
            )}
            {distanceKm !== null && (
              <span className="text-xs font-semibold text-zinc-500">
                &bull; ~{distanceKm} km away
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-zinc-900">{report.title}</h3>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Dispatched {new Date(report.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              &bull; {new Date(report.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Reporter contact */}
        <div className="bg-zinc-50 rounded-xl p-3 sm:text-right border border-zinc-100 shrink-0">
          <div className="text-[11px] text-zinc-400 font-semibold uppercase">Reporter</div>
          <div className="text-xs font-bold text-zinc-800">
            {report.profiles?.full_name || 'Citizen Resident'}
          </div>
          {report.profiles?.phone_number && (
            <a
              href={`tel:${report.profiles.phone_number.replace(/[^0-9]/g, '')}`}
              className="text-xs text-red-600 font-bold hover:underline inline-flex items-center gap-1 mt-1 font-mono"
            >
              <Phone className="w-3 h-3" />
              <span>{report.profiles.phone_number}</span>
            </a>
          )}
        </div>
      </div>

      {/* Media & Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Incident Media */}
        <div className="rounded-xl overflow-hidden bg-black max-h-52 flex items-center justify-center border border-zinc-200">
          {report.media_type === 'video' ? (
            <video src={report.media_url} controls className="max-h-52 w-full object-contain" />
          ) : (
            <img
              src={report.media_url}
              alt={report.title}
              className="max-h-52 w-full object-contain cursor-pointer"
              onClick={() => setShowFullImage(true)}
            />
          )}
        </div>

        {/* Situation Details */}
        <div className="space-y-3 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Emergency Description
            </div>
            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap line-clamp-4">
              {report.caption || 'No detailed situation description entered by reporter.'}
            </p>
          </div>

          {/* Coordinates & Google Maps Link */}
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 text-xs">
            <div className="flex items-center justify-between text-zinc-700 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                Scene Coordinates
              </span>
              {report.latitude && report.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-red-600 hover:underline font-bold text-[11px] flex items-center gap-1"
                >
                  <span>Open Map</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {report.latitude && report.longitude ? (
              <span className="font-mono text-zinc-600 text-[11px]">
                {Number(report.latitude).toFixed(5)}, {Number(report.longitude).toFixed(5)}
              </span>
            ) : (
              <span className="text-zinc-400 text-[11px]">No GPS coordinate available</span>
            )}
          </div>
        </div>
      </div>

      {/* Completion Proof Section if Completed */}
      {(() => {
        const proofImages =
          report.resolution_images && report.resolution_images.length > 0
            ? report.resolution_images
            : report.resolution_image_url
            ? [report.resolution_image_url]
            : []

        if (!isCompleted || proofImages.length === 0) return null

        return (
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Rescue Operation Completed &amp; Verified ({proofImages.length} Proof Photo{proofImages.length > 1 ? 's' : ''})
              </span>
              {report.resolved_at && (
                <span className="text-[11px] text-emerald-700">
                  {new Date(report.resolved_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                {proofImages.length === 1 ? (
                  <div className="rounded-lg overflow-hidden border border-emerald-200 bg-black max-h-44 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proofImages[0]}
                      alt="Proof of rescue"
                      className="max-h-44 w-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setActiveProofUrl(proofImages[0])}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {proofImages.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveProofUrl(url)}
                        className="relative aspect-square rounded-lg overflow-hidden bg-black border border-emerald-200 cursor-pointer group shadow-2xs hover:scale-[1.02] transition-transform"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Proof ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:opacity-85 transition-opacity"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/70 text-[9px] font-bold text-white">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-xs text-emerald-900 flex flex-col justify-between">
                <div>
                  <div className="font-semibold text-emerald-950 mb-1">Completion Notes:</div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed italic">
                    &ldquo;{report.resolution_notes || 'Operation complete.'}&rdquo;
                  </p>
                </div>
                <div className="text-[10px] text-emerald-700 pt-2 border-t border-emerald-200/60 mt-2">
                  Responder: <span className="font-bold">{report.responder_name || 'Assigned Officer'}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Action Buttons for Responders */}
      {!isCompleted && (
        <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {isActiveMission && (
              <button
                type="button"
                onClick={onToggleSimulation}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border ${
                  isSimulating
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
                title="Toggle simulated moving GPS for testing without driving"
              >
                <Car className="w-3.5 h-3.5" />
                <span>{isSimulating ? 'Pause Movement' : 'Simulate Driving'}</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Step 1: Start En Route */}
            {!isEnRoute && !isOnScene && (
              <button
                onClick={() => onStartResponse(report)}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                <span>En Route to Scene (Start Tracking)</span>
              </button>
            )}

            {/* Step 2: Arrived on Scene */}
            {isEnRoute && !isOnScene && (
              <button
                onClick={() => onArrivedScene(report)}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                <span>I Have Arrived at Scene</span>
              </button>
            )}

            {/* Step 3: Complete Mission & Upload Proof Photo */}
            {(isEnRoute || isOnScene) && (
              <button
                onClick={() => onOpenCompletionModal(report)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Upload Rescue Proof &amp; Complete</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal for full original image */}
      {showFullImage && (
        <div
          onClick={() => setShowFullImage(false)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={report.media_url}
            alt={report.title}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
          />
        </div>
      )}

      {/* Modal for full proof photo */}
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
