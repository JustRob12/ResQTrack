'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ReportItem } from '@/types/report'
import { Navigation, Radio, Compass, ExternalLink, Clock, Route, RefreshCw, AlertCircle, MapPin } from 'lucide-react'
import { getDrivingRoute, type DrivingRouteResult } from '@/lib/routing'

interface ResponderTrackingMapProps {
  report: ReportItem
  responderCoords: {
    latitude: number
    longitude: number
    accuracy?: number
    speed?: number | null
  } | null
  distanceKm: number | null
  isSimulating?: boolean
  gpsError?: string | null
  onRetryGps?: () => void
  onUseStationLocation?: () => void
}

const TARRAGONA_CENTER: [number, number] = [7.0425, 126.4485]

export default function ResponderTrackingMap({
  report,
  responderCoords,
  distanceKm,
  isSimulating,
  gpsError,
  onRetryGps,
  onUseStationLocation,
}: ResponderTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const responderMarkerRef = useRef<L.Marker | null>(null)
  const incidentMarkerRef = useRef<L.Marker | null>(null)
  const routeCasingRef = useRef<L.Polyline | null>(null)
  const routeLineRef = useRef<L.Polyline | null>(null)

  const [routeInfo, setRouteInfo] = useState<DrivingRouteResult | null>(null)

  const incidentLat = Number(report.latitude || TARRAGONA_CENTER[0])
  const incidentLng = Number(report.longitude || TARRAGONA_CENTER[1])

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [incidentLat, incidentLng],
      zoom: 13,
      zoomControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | MDRRMO Tarragona',
      maxZoom: 18,
    }).addTo(map)

    mapInstanceRef.current = map

    // Incident Marker (Red pulsing beacon)
    const incidentHtml = `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #dc2626; opacity: 0.35; animation: ping 2s infinite;"></div>
        <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #dc2626; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px;">
          !
        </div>
      </div>
    `
    const incidentIcon = L.divIcon({
      className: 'resq-incident-marker',
      html: incidentHtml,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    })

    const incMarker = L.marker([incidentLat, incidentLng], { icon: incidentIcon }).addTo(map)
    incMarker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px; font-weight: 600;">
        <div style="color: #dc2626; font-size: 10px; font-weight: 800; text-transform: uppercase;">Emergency Scene</div>
        <div style="color: #18181b; margin-top: 2px;">${report.title}</div>
      </div>
    `)
    incidentMarkerRef.current = incMarker

    // Responder Marker (Emerald Vehicle beacon)
    const responderHtml = `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #10b981; opacity: 0.4; animation: pulse 1.5s infinite;"></div>
        <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #059669; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3m9-12h4l3 5v7h-3m-9 0a2 2 0 1 0 4 0m8 0a2 2 0 1 0 4 0"/></svg>
        </div>
      </div>
    `
    const respIcon = L.divIcon({
      className: 'resq-responder-marker',
      html: responderHtml,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    })

    const respMarker = L.marker([incidentLat, incidentLng], { icon: respIcon }).addTo(map)
    responderMarkerRef.current = respMarker

    // Road Polyline: Casing (Border) + Inner Active Line (Google Maps road styling)
    const casing = L.polyline([], {
      color: '#064e3b',
      weight: 6,
      opacity: 0.45,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)
    routeCasingRef.current = casing

    const line = L.polyline([], {
      color: '#059669',
      weight: 4,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)
    routeLineRef.current = line

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [incidentLat, incidentLng, report.title])

  // Update Responder Marker & Road Driving Route
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !responderCoords) return

    const respLat = responderCoords.latitude
    const respLng = responderCoords.longitude
    const respLatLng: [number, number] = [respLat, respLng]

    if (responderMarkerRef.current) {
      responderMarkerRef.current.setLatLng(respLatLng)
    }

    let active = true

    // Fetch real road navigation route (Route 902 / Coastal Highway)
    getDrivingRoute(respLat, respLng, incidentLat, incidentLng)
      .then((route) => {
        if (!active || !map) return
        setRouteInfo(route)

        const points = route.coordinates
        if (routeCasingRef.current) {
          routeCasingRef.current.setLatLngs(points)
        }
        if (routeLineRef.current) {
          routeLineRef.current.setLatLngs(points)
        }

        // Fit map bounds to encompass the entire driving road route
        if (points.length > 0) {
          const bounds = L.latLngBounds(points)
          map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 })
        }
      })
      .catch((err) => {
        console.error('Failed to load driving route:', err)
      })

    return () => {
      active = false
    }
  }, [responderCoords, incidentLat, incidentLng])

  const handleRecenter = () => {
    if (!mapInstanceRef.current) return
    if (responderCoords) {
      mapInstanceRef.current.setView([responderCoords.latitude, responderCoords.longitude], 15)
    } else {
      mapInstanceRef.current.setView([incidentLat, incidentLng], 14)
    }
  }

  // Driving route metrics
  const displayKm = routeInfo?.distanceKm ?? distanceKm
  const durationMins = routeInfo?.durationMinutes

  // Navigation URL with exact GPS coordinates
  const navUrl = responderCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${responderCoords.latitude},${responderCoords.longitude}&destination=${incidentLat},${incidentLng}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${incidentLat},${incidentLng}&travelmode=driving`

  return (
    <div className="relative w-full h-[380px] sm:h-[480px] rounded-2xl overflow-hidden border border-zinc-200 shadow-sm bg-zinc-100">
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Status Pill */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-200 shadow-sm flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-zinc-900">
            <span className={`w-2.5 h-2.5 rounded-full ${responderCoords ? 'bg-emerald-500 animate-ping' : 'bg-amber-500 animate-pulse'}`} />
            <span>
              {isSimulating
                ? 'Simulated Highway Motion'
                : responderCoords
                ? 'Live Road GPS Route'
                : 'Connecting GPS...'}
            </span>
          </div>

          {displayKm !== null && (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              <Route className="w-3 h-3 text-emerald-600" />
              <span>{displayKm} km</span>
            </span>
          )}

          {durationMins !== null && durationMins !== undefined && (
            <span className="inline-flex items-center gap-1 font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>~{durationMins} mins</span>
            </span>
          )}
        </div>

        <button
          onClick={handleRecenter}
          className="pointer-events-auto p-2 bg-white/95 backdrop-blur-md rounded-xl border border-zinc-200 shadow-sm text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
          title="Recenter Map"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Optional Warning Pill if GPS Permission is Denied or Slow */}
      {(!responderCoords || gpsError) && (
        <div className="absolute top-14 left-3 right-3 z-10 pointer-events-none flex justify-center">
          <div className="pointer-events-auto bg-amber-50/95 backdrop-blur-md border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 shadow-sm">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-medium">
              {gpsError || 'Device GPS signal is calibrating.'}
            </span>
            {onUseStationLocation && (
              <button
                type="button"
                onClick={onUseStationLocation}
                className="font-bold underline text-amber-900 hover:text-amber-700 cursor-pointer ml-1"
              >
                Use MDRRMO HQ Location
              </button>
            )}
            {onRetryGps && (
              <button
                type="button"
                onClick={onRetryGps}
                className="p-1 hover:bg-amber-100 rounded text-amber-800 transition-colors"
                title="Retry GPS"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Floating Navigation Controls */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-zinc-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-2 shadow-md shrink-0">
          <Radio className={`w-3.5 h-3.5 ${responderCoords ? 'text-emerald-400 animate-pulse' : 'text-amber-400 animate-ping'}`} />
          {responderCoords ? (
            <span>
              {responderCoords.latitude.toFixed(4)}, {responderCoords.longitude.toFixed(4)}
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-amber-300">Acquiring GPS...</span>
              {onUseStationLocation && (
                <button
                  type="button"
                  onClick={onUseStationLocation}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-[11px] font-sans font-semibold flex items-center gap-1 transition-colors border border-zinc-700"
                >
                  <MapPin className="w-3 h-3" />
                  <span>Use Station HQ</span>
                </button>
              )}
            </div>
          )}
          {routeInfo?.summary && (
            <span className="text-zinc-400 text-[11px] hidden md:inline">
              &bull; {routeInfo.summary}
            </span>
          )}
        </div>

        <a
          href={navUrl}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 shrink-0"
          title="Open in Google Maps for turn-by-turn voice navigation"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Google Maps Navigation</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
