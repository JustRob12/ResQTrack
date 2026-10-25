'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/utils/supabase/client'
import { getUserRole } from '@/lib/role'
import { Header } from '@/components/common/Header'
import { AdminNav } from '@/components/admin/AdminNav'
import type { ReportItem } from '@/types/report'
import {
  Map,
  MapPin,
  Flame,
  Radio,
  RefreshCw,
  Loader2,
  AlertTriangle,
  X,
  Compass,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export const TARRAGONA_BARANGAYS = [
  { name: 'Central (Poblacion / Court & Gym)', lat: 7.0435, lng: 126.449 },
  { name: 'Cabagayan', lat: 7.065, lng: 126.471 },
  { name: 'Tomoang', lat: 7.078, lng: 126.435 },
  { name: 'Lucatan', lat: 6.985, lng: 126.431 },
  { name: 'Tagabakid', lat: 7.012, lng: 126.398 },
  { name: 'Jovellar', lat: 7.125, lng: 126.485 },
  { name: 'Dadong', lat: 7.031, lng: 126.385 },
]

// Dynamic import with SSR disabled to prevent Leaflet window errors
const IncidentLeafletMap = dynamic(
  () => import('@/components/admin/IncidentLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[680px] rounded-2xl bg-zinc-100 flex flex-col items-center justify-center gap-3 border border-zinc-200">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        <p className="text-xs text-zinc-500 font-semibold">
          Loading Tarragona Geospatial &amp; Heatmap Engine...
        </p>
      </div>
    ),
  }
)

export default function AdminMapPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  // Data
  const [allReports, setAllReports] = useState<ReportItem[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [tableMissingNotice, setTableMissingNotice] = useState(false)

  // 1. Session and Admin Role Verification
  useEffect(() => {
    const verifyAdmin = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const role = await getUserRole(supabase, session.user)
      if (role !== 0) {
        router.replace('/dashboard')
        return
      }

      setUser(session.user)
      setLoading(false)
    }

    verifyAdmin()
  }, [router])

  // 2. Fetch Reports with GPS coordinates
  const fetchReports = useCallback(async () => {
    if (!user) return
    setReportsLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*, profiles:user_id(full_name, phone_number, email)')
        .order('created_at', { ascending: false })

      if (error) {
        if (
          error.code === 'PGRST205' ||
          error.message.includes('relation "public.reports" does not exist')
        ) {
          setTableMissingNotice(true)
        }
      } else if (data) {
        setAllReports(data as ReportItem[])
      }
    } catch (err) {
      console.error('Failed to load map reports:', err)
    } finally {
      setReportsLoading(false)
    }
  }, [user])

  useEffect(() => {
    let active = true
    if (user) {
      Promise.resolve().then(() => {
        if (active) fetchReports()
      })
    }
    return () => {
      active = false
    }
  }, [user, fetchReports])

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Unmapped Reports & Coordinates Assignment
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null)

  const unmappedReports = useMemo(() => {
    return allReports.filter(
      (r) => r.latitude === null || r.longitude === null || isNaN(Number(r.latitude))
    )
  }, [allReports])

  const handleAssignCoordinates = async (
    reportId: string,
    lat: number,
    lng: number,
    barangayName: string
  ) => {
    setAssigningId(reportId)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          latitude: lat,
          longitude: lng,
        })
        .eq('id', reportId)

      if (error) {
        alert(`Failed to assign coordinates: ${error.message}`)
      } else {
        setAllReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, latitude: lat, longitude: lng } : r))
        )
        setAssignSuccess(`Incident coordinates set to ${barangayName} (${lat}, ${lng})!`)
        setTimeout(() => setAssignSuccess(null), 4000)
      }
    } catch (err) {
      console.error('Assign coordinates error:', err)
    } finally {
      setAssigningId(null)
    }
  }

  // Floating Overview State
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(true)
  const [showUnmappedDrawer, setShowUnmappedDrawer] = useState(false)

  // Summary Metrics
  const totalReports = allReports.length
  const mappedReports = allReports.filter(
    (r) => r.latitude !== null && r.longitude !== null && !isNaN(Number(r.latitude))
  ).length
  const pendingMapped = allReports.filter(
    (r) =>
      r.status === 'pending' &&
      r.latitude !== null &&
      r.longitude !== null &&
      !isNaN(Number(r.latitude))
  ).length
  const dispatchedMapped = allReports.filter(
    (r) =>
      r.status === 'accepted' &&
      r.latitude !== null &&
      r.longitude !== null &&
      !isNaN(Number(r.latitude))
  ).length
  const activeResponders = allReports.filter(
    (r) =>
      r.responder_name &&
      (r.mission_status === 'en_route' || r.mission_status === 'on_scene')
  ).length
  const coveragePercent =
    totalReports > 0 ? Math.round((mappedReports / totalReports) * 100) : 100

  // Floating Expandable/Collapsible Spatial Intelligence Overview Card (matching user's screenshot)
  const floatingOverview = (
    <div className="transition-all duration-300">
      {isOverviewExpanded ? (
        <div className="bg-white/95 backdrop-blur-md border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 max-w-3xl w-[calc(100vw-2rem)] sm:w-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold mb-1.5">
                <Flame className="w-3.5 h-3.5" />
                MDRRMO Tarragona Spatial Intelligence
              </div>
              <h1 className="text-lg sm:text-xl font-black text-zinc-900 flex items-center gap-2">
                Incident Mapping &amp; Heatmap Visualization
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5 max-w-xl">
                Real-time geospatial plotting, heat density clusters, and hazard corridor monitoring across Tarragona, Davao Oriental.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={fetchReports}
                disabled={reportsLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 transition-colors shrink-0 shadow-2xs cursor-pointer"
                title="Refresh Map Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reportsLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh Map Data</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOverviewExpanded(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-100 transition-colors shrink-0 shadow-2xs cursor-pointer"
                title="Collapse Overview"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span className="text-[11px]">Collapse</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 border-t border-zinc-100 text-xs">
            <div className="p-2.5 sm:p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-zinc-400 block font-medium text-[11px]">Mapped Incidents</span>
              <span className="text-base sm:text-lg font-bold text-zinc-800">
                {mappedReports} <span className="text-xs text-zinc-400 font-normal">/ {totalReports}</span>
              </span>
            </div>
            <div className="p-2.5 sm:p-3 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-amber-700 block font-medium text-[11px]">Pending Review</span>
              <span className="text-base sm:text-lg font-bold text-amber-900">{pendingMapped}</span>
            </div>
            <div className="p-2.5 sm:p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-emerald-700 block font-medium text-[11px]">Dispatched Operations</span>
              <span className="text-base sm:text-lg font-bold text-emerald-900">{dispatchedMapped}</span>
            </div>
            <div className="p-2.5 sm:p-3 bg-purple-50 rounded-xl border border-purple-100">
              <span className="text-purple-700 block font-medium text-[11px]">Live Field Responders</span>
              <span className="text-base sm:text-lg font-bold text-purple-900">{activeResponders} active</span>
            </div>
            <div className="p-2.5 sm:p-3 bg-sky-50 rounded-xl border border-sky-100">
              <span className="text-sky-700 block font-medium text-[11px]">Coordinate Coverage</span>
              <span className="text-base sm:text-lg font-bold text-sky-900">{coveragePercent}%</span>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOverviewExpanded(true)}
          className="bg-white/95 backdrop-blur-md border border-zinc-200/90 rounded-xl px-3.5 py-2 shadow-lg flex items-center gap-2 text-xs font-bold text-zinc-800 hover:bg-white hover:border-zinc-300 transition-all cursor-pointer group"
          title="Expand Overview Metrics"
        >
          <div className="p-1 rounded-md bg-red-50 text-red-600">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold text-zinc-900">Spatial Intelligence</span>
          <span className="text-zinc-300 font-normal">|</span>
          <div className="flex items-center gap-1.5 text-zinc-600 font-semibold">
            <span className="text-emerald-700 font-bold">{mappedReports} Mapped</span>
            <span>&bull;</span>
            <span className="text-purple-700 font-bold">{activeResponders} Responders</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-lg group-hover:bg-red-100 transition-colors ml-1">
            <span>Expand</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </button>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          <p className="text-sm text-zinc-500 font-medium">Verifying Administrator Access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-900 text-zinc-900 overflow-hidden">
      {/* Top Header */}
      <Header isAdmin={true} signingOut={signingOut} onSignOut={handleSignOut} />

      {/* Admin Modules Navigation */}
      <AdminNav pendingCount={allReports.filter((r) => r.status === 'pending').length} />

      {/* Database Schema Setup Notice */}
      {tableMissingNotice && (
        <div className="absolute top-28 left-4 right-4 z-40 max-w-xl mx-auto">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs sm:text-sm text-amber-800 flex items-start justify-between gap-3 shadow-lg">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">Supabase Database Setup Required:</span> Execute the
                SQL script in <code className="font-mono bg-amber-100 px-1 rounded">supabase_schema.sql</code>.
              </div>
            </div>
            <button
              onClick={() => setTableMissingNotice(false)}
              className="text-amber-600 hover:text-amber-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Full-Screen Map Viewport */}
      <main className="relative flex-1 w-full h-[calc(100dvh-64px)] sm:h-[calc(100dvh-113px)] overflow-hidden">
        {/* Full-Screen Interactive Leaflet Map */}
        <IncidentLeafletMap
          reports={allReports}
          className="w-full h-full rounded-none border-0 shadow-none"
          floatingHeader={floatingOverview}
        />

        {/* Floating Success Alert */}
        {assignSuccess && (
          <div className="absolute top-24 left-4 z-30 p-3 bg-emerald-50/95 backdrop-blur-md border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{assignSuccess}</span>
          </div>
        )}

        {/* Floating Unmapped Incidents Trigger Button & Modal */}
        {unmappedReports.length > 0 && (
          <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
            {!showUnmappedDrawer ? (
              <button
                type="button"
                onClick={() => setShowUnmappedDrawer(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {unmappedReports.length} Unmapped Incident{unmappedReports.length > 1 ? 's' : ''} (Plot Coordinates)
                </span>
              </button>
            ) : (
              <div className="bg-white/95 backdrop-blur-md border border-amber-300 rounded-2xl p-4 shadow-2xl max-w-lg w-[calc(100vw-2rem)] sm:w-auto max-h-[60vh] overflow-y-auto space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-xs sm:text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Plot Unmapped Incidents on Map</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUnmappedDrawer(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {unmappedReports.map((report: ReportItem) => {
                    const isBusy = assigningId === report.id
                    return (
                      <div
                        key={report.id}
                        className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-2"
                      >
                        <div className="font-bold text-zinc-900">{report.title}</div>
                        <div className="text-[11px] text-zinc-600">
                          Reporter: <strong className="text-zinc-700">{report.profiles?.full_name || 'Citizen'}</strong>
                          {report.caption && (
                            <span> &bull; &ldquo;{report.caption}&rdquo;</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-red-600" /> Plot at:
                          </span>
                          {TARRAGONA_BARANGAYS.map((b) => (
                            <button
                              key={b.name}
                              type="button"
                              onClick={() => handleAssignCoordinates(report.id, b.lat, b.lng, b.name)}
                              disabled={isBusy}
                              className="px-2 py-0.5 rounded-lg bg-white hover:bg-red-50 hover:text-red-700 text-zinc-700 font-semibold text-[10px] border border-zinc-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              {b.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
