'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import type { ReportItem, ReportStatus } from '@/types/report'
import {
  Flame,
  MapPin,
  Layers,
  Eye,
  ExternalLink,
  ShieldAlert,
  Compass,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react'

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
  const heatLayerRef = useRef<any>(null)
  const hazardLayerRef = useRef<L.LayerGroup | null>(null)

  // Filter & Display States
  const [viewMode, setViewMode] = useState<'both' | 'heatmap' | 'pins'>('both')
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all')
  const [showHazardZones, setShowHazardZones] = useState(true)
  const [heatRadius, setHeatRadius] = useState<number>(28)
  const [heatBlur, setHeatBlur] = useState<number>(18)

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
      // Pending and accepted incidents have higher heat weight
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

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | MDRRMO Tarragona',
      maxZoom: 18,
    }).addTo(map)

    // Layers groups
    const markersLayer = L.layerGroup().addTo(map)
    const hazardLayer = L.layerGroup().addTo(map)

    markersLayerRef.current = markersLayer
    hazardLayerRef.current = hazardLayer
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

  // Update Markers Layer
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
          ${
            report.caption
              ? `<p style="font-size: 11px; color: #52525b; margin-bottom: 8px; line-height: 1.4; max-height: 48px; overflow: hidden;">${report.caption}</p>`
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

        marker.bindPopup(popupContent)
        markersLayer.addLayer(marker)
      })
    }
  }, [validReports, viewMode])

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
      if (heatPoints.length > 0 && (L as any).heatLayer) {
        const heat = (L as any).heatLayer(heatPoints, {
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

    if (validReports.length > 0) {
      const bounds = L.latLngBounds(
        validReports.map((r) => [Number(r.latitude), Number(r.longitude)])
      )
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

        {/* Status Filter Pill */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-zinc-200 shadow-md flex items-center gap-1">
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
          title="Fit All Incidents"
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

      {/* Bottom Floating Legend & Metric Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        {/* Heatmap & Pin Legend Card */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-zinc-200 shadow-md text-xs space-y-2 max-w-sm">
          <div className="font-bold text-zinc-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-red-600" />
              Incident Density &amp; Hazard Key
            </span>
            <span className="text-[10px] text-zinc-500 font-medium">
              {validReports.length} Mapped
            </span>
          </div>

          {/* Gradient Density Bar */}
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-500 via-amber-500 to-red-600"></div>
            <div className="flex justify-between text-[10px] text-zinc-500 font-semibold">
              <span>Low Density</span>
              <span>Moderate</span>
              <span className="text-red-600">Critical Hotspot</span>
            </div>
          </div>

          {/* Status Pin Indicators */}
          <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-600 border-t border-zinc-100">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Pending
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Dispatched
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Dismissed
            </span>
          </div>

          {/* Hazard Zones Toggle */}
          <div className="pt-1 flex items-center justify-between text-[11px] border-t border-zinc-100">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-zinc-700 font-medium">
              <input
                type="checkbox"
                checked={showHazardZones}
                onChange={(e) => setShowHazardZones(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
              />
              Show Tarragona Risk Corridors
            </label>
          </div>
        </div>

        {/* Heatmap Radius Slider Panel (when heatmap is visible) */}
        {(viewMode === 'both' || viewMode === 'heatmap') && (
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md p-3 rounded-xl border border-zinc-200 shadow-md text-xs space-y-1.5">
            <div className="flex justify-between text-zinc-700 font-semibold">
              <span>Heat Radius</span>
              <span className="font-mono text-red-600">{heatRadius}px</span>
            </div>
            <input
              type="range"
              min="15"
              max="50"
              value={heatRadius}
              onChange={(e) => setHeatRadius(Number(e.target.value))}
              className="w-36 accent-red-600 cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  )
}
