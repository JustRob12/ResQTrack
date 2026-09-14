'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { getUserRole } from '@/lib/role'
import { Header } from '@/components/common/Header'
import { AdminNav } from '@/components/admin/AdminNav'
import { AnalyticsKpis } from '@/components/admin/AnalyticsKpis'
import { IncidentFrequencyChart } from '@/components/admin/IncidentFrequencyChart'
import { IncidentTrendChart } from '@/components/admin/IncidentTrendChart'
import { IncidentTypeBreakdown } from '@/components/admin/IncidentTypeBreakdown'
import { LocationAffectedTable } from '@/components/admin/LocationAffectedTable'
import { RescuerPerformanceCard } from '@/components/admin/RescuerPerformanceCard'
import {
  computeFrequencyAnalysis,
  computeIncidentTypes,
  computeAffectedLocations,
  computeIncidentTrends,
  computeRescuerMetrics,
} from '@/lib/analytics'
import type { ReportItem } from '@/types/report'
import {
  BarChart3,
  Flame,
  RefreshCw,
  Loader2,
  AlertTriangle,
  X,
  FileText,
  MapPin,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function AdminAnalyticsPage() {
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

  // 2. Fetch Reports for Analytics
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
      console.error('Failed to load analytics reports:', err)
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

  // Memoized Analytics Computations
  const frequencyData = useMemo(() => computeFrequencyAnalysis(allReports), [allReports])
  const incidentTypes = useMemo(() => computeIncidentTypes(allReports), [allReports])
  const affectedLocations = useMemo(() => computeAffectedLocations(allReports), [allReports])
  const trends14Days = useMemo(() => computeIncidentTrends(allReports, 14), [allReports])
  const rescuerMetrics = useMemo(() => computeRescuerMetrics(allReports), [allReports])

  const topBarangay = affectedLocations[0]?.name || 'Central (Poblacion)'
  const pendingCount = allReports.filter((r) => r.status === 'pending').length

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
      <AdminNav pendingCount={pendingCount} />

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
        {/* Module Header Card */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold mb-2">
                <BarChart3 className="w-3.5 h-3.5" />
                MDRRMO Tarragona Operations Intelligence
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 flex items-center gap-2">
                Descriptive Analytics &amp; Disaster Response Performance
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Statistical frequency analysis, incident trends, barangay vulnerability ranking, and rescuer operational monitoring.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/admin/map"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>View Live Heatmap</span>
              </Link>
              <button
                onClick={fetchReports}
                disabled={reportsLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reportsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* 1. Core KPIs Summary */}
        <AnalyticsKpis metrics={rescuerMetrics} mostAffectedBarangay={topBarangay} />

        {/* 2. 14-Day Timeline Trend */}
        <IncidentTrendChart trends={trends14Days} />

        {/* 3. Frequency Analysis (Peak Hours & Days of Week) */}
        <IncidentFrequencyChart
          days={frequencyData.days}
          hours={frequencyData.hours}
          peakDay={frequencyData.peakDay}
          peakHour={frequencyData.peakHour}
        />

        {/* 4. Categorical Breakdown & Most Affected Locations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IncidentTypeBreakdown types={incidentTypes} />
          <LocationAffectedTable locations={affectedLocations} />
        </div>

        {/* 5. Rescue Operations & Rescuer Force Performance */}
        <RescuerPerformanceCard metrics={rescuerMetrics} />
      </main>
    </div>
  )
}
