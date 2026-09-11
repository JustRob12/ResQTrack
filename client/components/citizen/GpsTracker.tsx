'use client'

import { MapPin, RefreshCw, Loader2, ExternalLink } from 'lucide-react'
import type { GpsLocation } from '@/types/report'

interface GpsTrackerProps {
  gpsLocation: GpsLocation | null
  gpsLoading: boolean
  gpsError: string | null
  onRefresh: () => void
}

export function GpsTracker({
  gpsLocation,
  gpsLoading,
  gpsError,
  onRefresh,
}: GpsTrackerProps) {
  return (
    <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-zinc-800">
          <MapPin className="w-4 h-4 text-red-600" />
          <span>Automatic GPS Location Tracker</span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={gpsLoading}
          className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
          <span>{gpsLoading ? 'Locating...' : 'Refresh GPS'}</span>
        </button>
      </div>

      {gpsLocation ? (
        <div className="text-xs text-zinc-600 flex flex-wrap items-center gap-3">
          <div className="bg-white px-2.5 py-1 rounded border border-zinc-200 font-mono font-medium text-zinc-800">
            Lat: {gpsLocation.latitude.toFixed(5)}, Lng: {gpsLocation.longitude.toFixed(5)}
          </div>
          <span className="text-[11px] text-zinc-400">
            Accuracy: &plusmn;{gpsLocation.accuracy}m
          </span>
          <a
            href={`https://www.google.com/maps?q=${gpsLocation.latitude},${gpsLocation.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-red-600 hover:underline inline-flex items-center gap-0.5 font-bold"
          >
            View Map <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ) : gpsError ? (
        <div className="text-xs text-red-600 font-medium">{gpsError}</div>
      ) : (
        <div className="text-xs text-zinc-500 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
          <span>Acquiring GPS coordinates from device sensor...</span>
        </div>
      )}
    </div>
  )
}
