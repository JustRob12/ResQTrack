'use client'

import { MapPin, RefreshCw, Loader2, ExternalLink, AlertTriangle, CheckCircle2, Radio } from 'lucide-react'
import type { GpsLocation } from '@/types/report'

interface GpsTrackerProps {
  gpsLocation: GpsLocation | null
  gpsLoading: boolean
  gpsError: string | null
  gpsStatus?: string | null
  onRefresh: () => void
}

export function GpsTracker({
  gpsLocation,
  gpsLoading,
  gpsError,
  gpsStatus,
  onRefresh,
}: GpsTrackerProps) {
  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-50 border border-zinc-200 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-zinc-800">
          <MapPin className="w-4 h-4 text-red-600" />
          <span>Automatic GPS Location Tracker</span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={gpsLoading}
          className="text-xs text-red-600 hover:text-red-700 active:text-red-800 font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
          <span>{gpsLoading ? 'Locating...' : 'Refresh GPS'}</span>
        </button>
      </div>

      {gpsLocation ? (
        <div className="space-y-2">
          <div className="text-xs text-zinc-600 flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="bg-white px-2.5 py-1 rounded-md border border-zinc-200 font-mono font-semibold text-zinc-800 shadow-2xs">
              Lat: {gpsLocation.latitude.toFixed(5)}, Lng: {gpsLocation.longitude.toFixed(5)}
            </div>
            <span className="text-[11px] text-zinc-500 font-medium">
              Accuracy: &plusmn;{gpsLocation.accuracy}m
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{gpsLocation.source === 'network' ? 'Network Fix' : 'GPS Satellite'}</span>
            </div>
            <a
              href={`https://www.google.com/maps?q=${gpsLocation.latitude},${gpsLocation.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1 font-bold ml-auto"
            >
              <span>View Map</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-[11px] text-zinc-400">
            Coordinates will be automatically transmitted with your emergency report.
          </p>
        </div>
      ) : gpsLoading ? (
        <div className="p-2 rounded-lg bg-red-50/50 border border-red-100 flex items-center gap-2 text-xs text-red-700">
          <Loader2 className="w-4 h-4 animate-spin text-red-600 shrink-0" />
          <span className="font-medium">
            {gpsStatus || 'Acquiring GPS coordinates from device sensor...'}
          </span>
        </div>
      ) : gpsError ? (
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{gpsError}</p>
                <p className="text-[11px] text-amber-800 mt-1">
                  You can still send this report — please enter your nearest landmarks in the situation details below.
                </p>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center justify-between">
              <span className="text-[11px] text-amber-700">GPS not locking?</span>
              <button
                type="button"
                onClick={onRefresh}
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Location</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-zinc-500 flex items-center justify-between p-2 rounded-lg bg-zinc-100/70 border border-zinc-200">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-zinc-400" />
            <span>GPS ready to track position</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
          >
            Acquire Location
          </button>
        </div>
      )}
    </div>
  )
}
