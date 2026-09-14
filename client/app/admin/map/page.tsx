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
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 pb-28 sm:pb-16">
      {/* Top Header */}
      <Header isAdmin={true} signingOut={signingOut} onSignOut={handleSignOut} />

      {/* Admin Modules Navigation */}
      <AdminNav pendingCount={allReports.filter((r) => r.status === 'pending').length} />

      {/* Missing table notice */}
      {tableMissingNotice && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs sm:text-sm text-amber-800 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">Supabase Database Setup Required:</span> Execute the
                SQL script in <code className="font-mono bg-amber-100 px-1 rounded">supabase_schema.sql</code>.
              </div>
            </div>
            <button
              onClick={() => setTableMissingNotice(false)}
              className="text-amber-600 hover:text-amber-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 flex-1 space-y-6">
        {/* Module Title & Spatial Overview */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold mb-2">
                <Flame className="w-3.5 h-3.5" />
                MDRRMO Tarragona Spatial Intelligence
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 flex items-center gap-2">
                Incident Mapping &amp; Heatmap Visualization
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Real-time geospatial plotting, heat density clusters, and hazard corridor monitoring across Tarragona, Davao Oriental.
              </p>
            </div>

            <button
              onClick={fetchReports}
              disabled={reportsLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 transition-colors shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reportsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Map Data</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-zinc-100 text-xs">
            <div className="p-3 bg-zinc-50 rounded-lg">
              <span className="text-zinc-400 block font-medium">Mapped Incidents</span>
              <span className="text-lg font-bold text-zinc-800">
                {mappedReports} <span className="text-xs text-zinc-400 font-normal">/ {totalReports}</span>
              </span>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <span className="text-amber-700 block font-medium">Pending Review</span>
              <span className="text-lg font-bold text-amber-900">{pendingMapped}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <span className="text-emerald-700 block font-medium">Dispatched Operations</span>
              <span className="text-lg font-bold text-emerald-900">{dispatchedMapped}</span>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <span className="text-purple-700 block font-medium">Live Field Responders</span>
              <span className="text-lg font-bold text-purple-900">{activeResponders} active</span>
            </div>
            <div className="p-3 bg-sky-50 rounded-lg">
              <span className="text-sky-700 block font-medium">Coordinate Coverage</span>
              <span className="text-lg font-bold text-sky-900">{coveragePercent}%</span>
            </div>
          </div>
        </div>

        {/* Success alert after coordinates assigned */}
        {assignSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{assignSuccess}</span>
          </div>
        )}

        {/* Unmapped Incidents (Missing GPS) Manager Panel */}
        {unmappedReports.length > 0 && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {unmappedReports.length} Incident{unmappedReports.length > 1 ? 's' : ''} Missing GPS Coordinates (Unmapped)
                </span>
              </div>
              <span className="text-xs text-amber-800 font-medium">
                Submitted without GPS. Click a Barangay below to plot it immediately on the map:
              </span>
            </div>

            <div className="space-y-2.5">
              {unmappedReports.map((report: ReportItem) => {
                const isBusy = assigningId === report.id
                return (
                  <div
                    key={report.id}
                    className="bg-white p-3.5 sm:p-4 rounded-xl border border-amber-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-zinc-900 text-sm">{report.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          Needs Location
                        </span>
                      </div>
                      <div className="text-zinc-500 mt-1 flex flex-wrap items-center gap-2">
                        <span>
                          Reporter: <strong className="text-zinc-700">{report.profiles?.full_name || 'Citizen'}</strong>
                        </span>
                        {report.caption && (
                          <span>
                            &bull; Landmarks: <em className="text-zinc-700 font-semibold">&ldquo;{report.caption}&rdquo;</em>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Barangay Assignment Pill Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-zinc-500 font-bold text-[11px] mr-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-600" />
                        <span>Plot at:</span>
                      </span>
                      {TARRAGONA_BARANGAYS.map((b) => (
                        <button
                          key={b.name}
                          type="button"
                          onClick={() => handleAssignCoordinates(report.id, b.lat, b.lng, b.name)}
                          disabled={isBusy}
                          className="px-2.5 py-1 rounded-lg bg-zinc-50 hover:bg-red-50 hover:border-red-300 hover:text-red-700 text-zinc-700 font-semibold text-[11px] transition-all border border-zinc-200 flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-2xs"
                          title={`Plot coordinates to ${b.name} (${b.lat}, ${b.lng})`}
                        >
                          {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          <span>{b.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Interactive Leaflet Map with Heatmap */}
        <IncidentLeafletMap reports={allReports} />
      </main>
    </div>
  )
}
