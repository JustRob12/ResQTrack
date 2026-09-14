'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { createClient } from '@/utils/supabase/client'
import type { ReportItem, ReportStatus, ResponderLocationBroadcast } from '@/types/report'
import {
  Flame,
  MapPin,
  Layers,
  Compass,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Car,
} from 'lucide-react'
import { getDrivingRoute } from '@/lib/routing'

// Default Tarragona Center Coordinates
const TARRAGONA_CENTER: [number, number] = [7.0425, 126.4485]
const TARRAGONA_DEFAULT_ZOOM = 12

// Tarragona High-Risk Hazard Reference Zones
const TARRAGONA_HAZARD_ZONES = [
  {
    name: 'Coastal Storm Surge & Tsunami Vulnerability Corridor',
    type: 'coastal',
    coords: [
      [7.155, 126.495],
      [7.112, 126.471],
      [7.085, 126.462],
      [7.042, 126.452],
      [6.985, 126.425],
      [6.953, 126.405],
    ] as [number, number][],
    color: '#0284c7',
  },
  {
    name: 'Davao Oriental Coastal Highway (Vehicular Collision Zone)',
    type: 'highway',
    coords: [
      [7.14, 126.48],
      [7.08, 126.45],
      [7.0425, 126.4485],
      [6.99, 126.415],
      [6.95, 126.395],
    ] as [number, number][],
    color: '#dc2626',
  },
]

interface IncidentLeafletMapProps {
  reports: ReportItem[]
  onSelectReport?: (report: ReportItem) => void
}

export default function IncidentLeafletMap({
  reports,
  onSelectReport,
}: IncidentLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const respondersLayerRef = useRef<L.LayerGroup | null>(null)
  const heatLayerRef = useRef<L.Layer | null>(null)
  const hazardLayerRef = useRef<L.LayerGroup | null>(null)

  // Filter & Display States
  const [viewMode, setViewMode] = useState<'both' | 'heatmap' | 'pins'>('both')
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all')
  const [showHazardZones, setShowHazardZones] = useState(true)
  const [showResponders, setShowResponders] = useState(true)
  const [heatRadius] = useState<number>(28)
  const [heatBlur] = useState<number>(18)

  // Real-time Responders Live Broadcast Map
  const [broadcastResponders, setBroadcastResponders] = useState<Record<string, ResponderLocationBroadcast>>({})

  // Derived responders from reports data
  const reportResponders = useMemo(() => {
    const res: Record<string, ResponderLocationBroadcast> = {}
    reports.forEach((r) => {
      if (
        r.responder_id &&
        r.responder_latitude &&
        r.responder_longitude &&
        (r.mission_status === 'en_route' || r.mission_status === 'on_scene')
      ) {
        res[r.responder_id] = {
          report_id: r.id,
          responder_id: r.responder_id,
          responder_name: r.responder_name || 'Responder Unit',
          responder_phone: r.responder_phone,
          latitude: Number(r.responder_latitude),
          longitude: Number(r.responder_longitude),
          mission_status: r.mission_status,
          updated_at: r.responder_updated_at || r.created_at,
        }
      }
    })
    return res
  }, [reports])

  // Combine report responders with realtime broadcast updates
  const combinedResponders = useMemo(() => {
    return { ...reportResponders, ...broadcastResponders }
  }, [reportResponders, broadcastResponders])

  // Realtime WebSocket Subscription: Receive live responder movement
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('resqtrack-dispatch')

    channel
      .on('broadcast', { event: 'responder_location' }, (payload) => {
        const broadcast = payload.payload as ResponderLocationBroadcast
        if (broadcast && broadcast.responder_id) {
          setBroadcastResponders((prev) => ({
            ...prev,
            [broadcast.responder_id]: broadcast,
          }))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Filter reports that have valid coordinates
  const validReports = useMemo(() => {
    return reports.filter(
      (r) =>
        r.latitude !== null &&
        r.latitude !== undefined &&
        r.longitude !== null &&
        r.longitude !== undefined &&
        !isNaN(Number(r.latitude)) &&
        !isNaN(Number(r.longitude)) &&
        (statusFilter === 'all' ? true : r.status === statusFilter)
    )
  }, [reports, statusFilter])

  // Heatmap data points: [lat, lng, intensity]
  const heatPoints = useMemo(() => {
    return validReports.map((r) => {
      const weight = r.status === 'pending' ? 1.0 : r.status === 'accepted' ? 0.8 : 0.4
      return [Number(r.latitude), Number(r.longitude), weight] as [number, number, number]
    })
  }, [validReports])

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: TARRAGONA_CENTER,
      zoom: TARRAGONA_DEFAULT_ZOOM,
      zoomControl: false,
    })

    // OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | MDRRMO Tarragona',
      maxZoom: 18,
    }).addTo(map)

    // Layers groups
    const markersLayer = L.layerGroup().addTo(map)
    const hazardLayer = L.layerGroup().addTo(map)
    const respondersLayer = L.layerGroup().addTo(map)

    markersLayerRef.current = markersLayer
    hazardLayerRef.current = hazardLayer
    respondersLayerRef.current = respondersLayer
    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Update Hazard Zones Layer
  useEffect(() => {
    const map = mapInstanceRef.current
    const hazardLayer = hazardLayerRef.current
    if (!map || !hazardLayer) return

    hazardLayer.clearLayers()

    if (showHazardZones) {
      TARRAGONA_HAZARD_ZONES.forEach((zone) => {
        const polyline = L.polyline(zone.coords, {
          color: zone.color,
          weight: 4,
          opacity: 0.7,
          dashArray: zone.type === 'highway' ? '6, 8' : undefined,
        })

        polyline.bindTooltip(zone.name, {
          permanent: false,
          direction: 'top',
          className: 'px-2 py-1 bg-zinc-900 text-white text-xs rounded shadow-md border-0',
        })

        hazardLayer.addLayer(polyline)
      })
    }
  }, [showHazardZones])

  // Update Incident Markers Layer
  useEffect(() => {
    const map = mapInstanceRef.current
    const markersLayer = markersLayerRef.current
    if (!map || !markersLayer) return

    markersLayer.clearLayers()

    if (viewMode === 'both' || viewMode === 'pins') {
      validReports.forEach((report) => {
        const lat = Number(report.latitude)
        const lng = Number(report.longitude)

        const statusColor =
          report.status === 'accepted'
            ? '#10b981' // Green
            : report.status === 'rejected'
            ? '#f43f5e' // Rose
            : '#f59e0b' // Amber

        const markerHtml = `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${statusColor}; opacity: 0.3; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 22px; height: 22px; border-radius: 50%; background-color: ${statusColor}; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
              <div style="width: 6px; height: 6px; border-radius: 50%; background-color: white;"></div>
            </div>
          </div>
        `

        const customIcon = L.divIcon({
          className: 'resq-custom-marker',
          html: markerHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        })

        const marker = L.marker([lat, lng], { icon: customIcon })

        // Detailed popup content
        const statusBadgeLabel =
          report.status === 'accepted'
            ? 'Dispatched'
            : report.status === 'rejected'
            ? 'Rejected'
            : 'Pending Verification'

        const statusBadgeBg =
          report.status === 'accepted'
            ? 'background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;'
            : report.status === 'rejected'
            ? 'background:#fff1f2; color:#9f1239; border:1px solid #fecdd3;'
            : 'background:#fffbeb; color:#92400e; border:1px solid #fde68a;'

        const responderBadge = report.responder_name
          ? `<div style="margin-top: 6px; padding: 4px 8px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 11px; color: #15803d; font-weight: 700; display: flex; align-items: center; gap: 4px;">
               <span>🚑 Responded by: ${report.responder_name}</span>
             </div>`
          : ''

        const popupContent = document.createElement('div')
        popupContent.className = 'p-1 max-w-xs text-zinc-900 font-sans'
        popupContent.innerHTML = `
          <div style="margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; ${statusBadgeBg}">
              ${statusBadgeLabel}
            </span>
            <span style="font-size: 10px; color: #71717a;">
              ${new Date(report.created_at).toLocaleDateString()}
            </span>
          </div>
          <h4 style="font-size: 13px; font-weight: 700; color: #18181b; margin-bottom: 4px; line-height: 1.3;">
            ${report.title}
          </h4>
          ${responderBadge}
          ${
            report.caption
              ? `<p style="font-size: 11px; color: #52525b; margin-top: 6px; margin-bottom: 8px; line-height: 1.4; max-height: 48px; overflow: hidden;">${report.caption}</p>`
              : ''
          }
          ${
            report.media_url
              ? `<div style="width: 100%; height: 110px; border-radius: 6px; overflow: hidden; background: #000; margin-bottom: 8px;">
                  <img src="${report.media_url}" style="width: 100%; height: 100%; object-fit: cover;" alt="${report.title}" />
                 </div>`
              : ''
          }
          <div style="font-size: 10px; color: #71717a; border-top: 1px solid #f4f4f5; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noreferrer" style="color: #dc2626; font-weight: 700; text-decoration: none;">
              Open Map &rarr;
            </a>
          </div>
        `

        if (onSelectReport) {
          marker.on('click', () => onSelectReport(report))
        }

        marker.bindPopup(popupContent)
        markersLayer.addLayer(marker)
      })
    }
  }, [validReports, viewMode, onSelectReport])

  // Update Live Responders Layer (Real-time tracking pins and connection lines)
  useEffect(() => {
    const map = mapInstanceRef.current
    const respondersLayer = respondersLayerRef.current
    if (!map || !respondersLayer) return

    respondersLayer.clearLayers()

    if (showResponders) {
      const activeList = Object.values(combinedResponders).filter(
        (res) => res.mission_status !== 'completed'
      )

      activeList.forEach((responder) => {
        const respLat = responder.latitude
        const respLng = responder.longitude

        // Custom Vehicle Beacon Marker
        const beaconHtml = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <!-- Floating name tag badge -->
            <div style="background: #0f172a; color: white; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 1px solid #334155; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
              <span>${responder.responder_name} (${responder.mission_status === 'on_scene' ? 'On Scene' : 'En Route'})</span>
            </div>
            <!-- Vehicle circle with pulsing radar -->
            <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #059669; opacity: 0.4; animation: ping 1.8s infinite;"></div>
              <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #059669; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white;">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3m9-12h4l3 5v7h-3m-9 0a2 2 0 1 0 4 0m8 0a2 2 0 1 0 4 0"/></svg>
              </div>
            </div>
          </div>
        `

        const beaconIcon = L.divIcon({
          className: 'resq-responder-beacon',
          html: beaconHtml,
          iconSize: [160, 60],
          iconAnchor: [80, 52],
          popupAnchor: [0, -48],
        })

        const marker = L.marker([respLat, respLng], { icon: beaconIcon })

        // Find matching incident to draw connection line
        const targetIncident = reports.find((r) => r.id === responder.report_id)

        if (targetIncident && targetIncident.latitude && targetIncident.longitude) {
          const incLat = Number(targetIncident.latitude)
          const incLng = Number(targetIncident.longitude)

          // Road route polyline (Casing + Active Route)
          const casingLine = L.polyline([[respLat, respLng], [incLat, incLng]], {
            color: '#064e3b',
            weight: 5,
            opacity: 0.35,
            lineCap: 'round',
            lineJoin: 'round',
          })
          const navLine = L.polyline([[respLat, respLng], [incLat, incLng]], {
            color: '#059669',
            weight: 3.5,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          })
          respondersLayer.addLayer(casingLine)
          respondersLayer.addLayer(navLine)

          // Fetch driving road route
          getDrivingRoute(respLat, respLng, incLat, incLng)
            .then((route) => {
              if (route.coordinates && route.coordinates.length > 0) {
                casingLine.setLatLngs(route.coordinates)
                navLine.setLatLngs(route.coordinates)
              }
            })
            .catch(() => {})
        }

        // Detailed Responder Popup
        const navUrl = targetIncident?.latitude && targetIncident?.longitude
          ? `https://www.google.com/maps/dir/?api=1&origin=${respLat},${respLng}&destination=${targetIncident.latitude},${targetIncident.longitude}&travelmode=driving`
          : null

        const popupContent = document.createElement('div')
        popupContent.className = 'p-1 max-w-xs text-zinc-900 font-sans'
        popupContent.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 800; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
              Active Field Responder
            </span>
          </div>
          <h4 style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
            ${responder.responder_name}
          </h4>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            Status: <span style="font-weight: 700; color: #059669; text-transform: capitalize;">${responder.mission_status.replace('_', ' ')}</span>
          </div>
          ${
            responder.responder_phone
              ? `<div style="font-size: 11px; margin-bottom: 6px;">
                  <a href="tel:${responder.responder_phone}" style="color: #dc2626; font-weight: 700; text-decoration: none;">
                    📞 ${responder.responder_phone}
                  </a>
                 </div>`
              : ''
          }
          ${
            targetIncident
              ? `<div style="font-size: 11px; background: #f8fafc; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 6px;">
                   <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700; display: block;">Responding to</span>
                   <span style="font-weight: 700; color: #1e293b;">${targetIncident.title}</span>
                 </div>`
              : ''
          }
          <div style="font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>${respLat.toFixed(4)}, ${respLng.toFixed(4)}</span>
            ${
              navUrl
                ? `<a href="${navUrl}" target="_blank" rel="noreferrer" style="color: #2563eb; font-weight: 700; text-decoration: none;">Google Maps ↗</a>`
                : ''
            }
          </div>
        `

        marker.bindPopup(popupContent)
        respondersLayer.addLayer(marker)
      })
    }
  }, [combinedResponders, showResponders, reports])

  // Update Heatmap Layer
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Remove existing heatmap layer if any
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current)
      heatLayerRef.current = null
    }

    if (viewMode === 'both' || viewMode === 'heatmap') {
      const leafletHeat = (L as unknown as { heatLayer: (pts: [number, number, number][], opts: unknown) => L.Layer }).heatLayer
      if (heatPoints.length > 0 && leafletHeat) {
        const heat = leafletHeat(heatPoints, {
          radius: heatRadius,
          blur: heatBlur,
          maxZoom: 16,
          max: 1.0,
          gradient: {
            0.2: '#0284c7', // Sky Blue
            0.4: '#10b981', // Emerald
            0.6: '#eab308', // Amber
            0.8: '#f97316', // Orange
            1.0: '#dc2626', // Red
          },
        })

        heat.addTo(map)
        heatLayerRef.current = heat
      }
    }
  }, [heatPoints, viewMode, heatRadius, heatBlur])

  // Fit bounds to all reports or reset
  const handleFitBounds = () => {
    const map = mapInstanceRef.current
    if (!map) return

    const points: [number, number][] = validReports.map((r) => [
      Number(r.latitude),
      Number(r.longitude),
    ])

    // Include active responders in bounding box
    Object.values(combinedResponders).forEach((res) => {
      if (res.mission_status !== 'completed') {
        points.push([res.latitude, res.longitude])
      }
    })

    if (points.length > 0) {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    } else {
      map.setView(TARRAGONA_CENTER, TARRAGONA_DEFAULT_ZOOM)
    }
  }

  const handleResetCenter = () => {
    const map = mapInstanceRef.current
    if (!map) return
    map.setView(TARRAGONA_CENTER, TARRAGONA_DEFAULT_ZOOM)
  }

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn()
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut()

  const activeRespondersCount = Object.values(combinedResponders).filter(
    (r) => r.mission_status !== 'completed'
  ).length

  return (
    <div className="relative w-full h-[540px] sm:h-[680px] rounded-2xl overflow-hidden border border-zinc-200 shadow-sm bg-zinc-100">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Header Controls Panel */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* View Mode Toggle Pill */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-zinc-200 shadow-md flex items-center gap-1">
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'both'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Combined</span>
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'heatmap'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Heatmap Only</span>
          </button>
          <button
            onClick={() => setViewMode('pins')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'pins'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Pins Only</span>
          </button>
        </div>

        {/* Live Responders Filter & Status Filter Pill */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {/* Responder Layer Toggle */}
          <button
            onClick={() => setShowResponders(!showResponders)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md border ${
              showResponders
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-white/95 backdrop-blur-md text-zinc-600 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Live Responders ({activeRespondersCount})</span>
          </button>

          {/* Status Filter Pill */}
          <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-zinc-200 shadow-md flex items-center gap-1">
            {(['all', 'pending', 'accepted', 'rejected'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all ${
                  statusFilter === st
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Map Utility Bar (Right side) */}
      <div className="absolute right-4 top-20 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2.5 rounded-xl bg-white border border-zinc-200 shadow-md text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2.5 rounded-xl bg-white border border-zinc-200 shadow-md text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFitBounds}
          title="Fit All Incidents & Responders"
          className="p-2.5 rounded-xl bg-white border border-zinc-200 shadow-md text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetCenter}
          title="Center on Tarragona MDRRMO"
          className="p-2.5 rounded-xl bg-white border border-zinc-200 shadow-md text-red-600 hover:bg-zinc-50 transition-colors"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Live Tracking Status Bar */}
      {activeRespondersCount > 0 && (
        <div className="absolute bottom-4 left-4 z-10 bg-zinc-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl text-xs flex items-center gap-2.5 shadow-lg border border-zinc-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-bold">
            {activeRespondersCount} Active Responder{activeRespondersCount > 1 ? 's' : ''} En Route / In Field
          </span>
        </div>
      )}
    </div>
  )
}
