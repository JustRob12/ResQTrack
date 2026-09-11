'use client'

import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'

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
    if (user) {
      fetchReports()
    }
  }, [user, fetchReports])

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-zinc-100 text-xs">
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
            <div className="p-3 bg-sky-50 rounded-lg">
              <span className="text-sky-700 block font-medium">GPS Coordinate Coverage</span>
              <span className="text-lg font-bold text-sky-900">{coveragePercent}%</span>
            </div>
          </div>
        </div>

        {/* Interactive Leaflet Map with Heatmap */}
        <IncidentLeafletMap reports={allReports} />
      </main>
    </div>
  )
}
