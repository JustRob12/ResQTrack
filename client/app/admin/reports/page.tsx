'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getUserRole } from '@/lib/role'
import { Header } from '@/components/common/Header'
import { AdminNav } from '@/components/admin/AdminNav'
import {
  ReportExportControls,
  type ReportPeriod,
} from '@/components/admin/ReportExportControls'
import { PdrrmoReportView } from '@/components/admin/PdrrmoReportView'
import { exportReportsToCsv } from '@/lib/reportExport'
import type { ReportItem, ReportStatus } from '@/types/report'
import { FileText, Loader2, AlertTriangle, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function AdminReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userName, setUserName] = useState('MDRRMO Officer')
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  // Data
  const [allReports, setAllReports] = useState<ReportItem[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [tableMissingNotice, setTableMissingNotice] = useState(false)

  // Filtering Controls
  const [period, setPeriod] = useState<ReportPeriod>('weekly')
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all')

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
      const meta = session.user.user_metadata || {}
      setUserName(meta.full_name || session.user.email?.split('@')[0] || 'MDRRMO Officer')
      setLoading(false)
    }

    verifyAdmin()
  }, [router])

  // 2. Fetch Reports for Reporting
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
      console.error('Failed to load reports for summary generator:', err)
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

  // Filtered reports based on selected period & status
  const filteredReports = useMemo(() => {
    const now = new Date().getTime()

    return allReports.filter((r) => {
      // 1. Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false
      }

      // 2. Period filter
      if (period === 'all') return true

      const reportTime = new Date(r.created_at).getTime()
      if (isNaN(reportTime)) return true

      const diffHours = (now - reportTime) / (1000 * 60 * 60)

      if (period === 'daily') {
        return diffHours <= 24
      }
      if (period === 'weekly') {
        return diffHours <= 24 * 7
      }
      if (period === 'monthly') {
        return diffHours <= 24 * 30
      }

      return true
    })
  }, [allReports, period, statusFilter])

  // Print Handler
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  // CSV Export Handler
  const handleExportCsv = () => {
    exportReportsToCsv(
      filteredReports,
      `PDRRMO_SitRep_Tarragona_${period.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`
    )
  }

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
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 pb-28 sm:pb-16 print:bg-white print:pb-0">
      {/* Top Header (Hidden on Print) */}
      <div className="print:hidden">
        <Header isAdmin={true} signingOut={signingOut} onSignOut={handleSignOut} />
        <AdminNav pendingCount={pendingCount} />
      </div>

      {/* Missing table notice */}
      {tableMissingNotice && (
        <div className="max-w-6xl mx-auto w-full px-4 pt-4 print:hidden">
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
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-6 flex-1 space-y-6 print:p-0 print:max-w-none">
        {/* Module Header Card (Hidden on Print) */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 shadow-xs print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold mb-2">
                <FileText className="w-3.5 h-3.5" />
                Disaster Risk Reduction &amp; Response Reporting
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 flex items-center gap-2">
                Automated Incident &amp; PDRRMO Report Generator
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Generate official Situation Reports (SitRep), rescue operations audits, and certified transmittals for Davao Oriental PDRRMO.
              </p>
            </div>
          </div>
        </div>

        {/* Filter and Export Action Bar (Hidden on Print) */}
        <ReportExportControls
          period={period}
          onPeriodChange={setPeriod}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onPrint={handlePrint}
          onExportCsv={handleExportCsv}
          reportCount={filteredReports.length}
        />

        {/* Official Formatted SitRep Document Preview */}
        <PdrrmoReportView
          reports={filteredReports}
          period={period}
          preparedBy={userName}
        />
      </main>
    </div>
  )
}
