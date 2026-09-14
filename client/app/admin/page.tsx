'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getUserRole } from '@/lib/role'
import { Header } from '@/components/common/Header'
import { AdminNav } from '@/components/admin/AdminNav'
import { AdminCommandCenter } from '@/components/admin/AdminCommandCenter'
import { AdminRejectModal } from '@/components/admin/AdminRejectModal'
import { AdminDeleteModal } from '@/components/admin/AdminDeleteModal'
import type { ReportItem, ReportStatus } from '@/types/report'
import { Loader2, AlertTriangle, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function AdminPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  // Reports & Triage State
  const [allReports, setAllReports] = useState<ReportItem[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [tableMissingNotice, setTableMissingNotice] = useState(false)

  // Filter & Action State
  const [adminFilter, setAdminFilter] = useState<'all' | ReportStatus>('all')
  const [selectedReportForAction, setSelectedReportForAction] = useState<ReportItem | null>(null)
  const [selectedReportForDelete, setSelectedReportForDelete] = useState<ReportItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // 1. Session and Role Verification
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

      // Check role: 0 = Admin, 1 = Citizen
      const role = await getUserRole(supabase, session.user)
      if (role !== 0) {
        // Non-admin user redirected to citizen dashboard
        router.replace('/dashboard')
        return
      }

      setUser(session.user)
      setLoading(false)
    }

    verifyAdmin()
  }, [router])

  // 2. Fetch All Incident Reports for Triage
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
      console.error('Failed to load incident reports:', err)
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

  // Sign out handler
  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Action: Accept / Dispatch Emergency
  const handleAcceptReport = async (reportId: string) => {
    setActionLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'accepted',
          rejection_reason: null,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', reportId)

      if (error) {
        alert(`Failed to accept report: ${error.message}`)
      } else {
        setAllReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status: 'accepted',
                  rejection_reason: null,
                  verified_by: user?.id,
                  verified_at: new Date().toISOString(),
                }
              : r
          )
        )
      }
    } catch (err) {
      console.error('Accept error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Reject / Dismiss Incident
  const handleRejectConfirm = async () => {
    if (!selectedReportForAction) return
    setActionLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'rejected',
          rejection_reason: rejectReason || 'Declined by MDRRMO Administrator',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', selectedReportForAction.id)

      if (error) {
        alert(`Failed to reject report: ${error.message}`)
      } else {
        setAllReports((prev) =>
          prev.map((r) =>
            r.id === selectedReportForAction.id
              ? {
                  ...r,
                  status: 'rejected',
                  rejection_reason: rejectReason || 'Declined by MDRRMO Administrator',
                  verified_by: user?.id,
                  verified_at: new Date().toISOString(),
                }
              : r
          )
        )
        setSelectedReportForAction(null)
        setRejectReason('')
      }
    } catch (err) {
      console.error('Reject error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Delete Report permanently
  const handleDeleteReport = async () => {
    if (!selectedReportForDelete) return
    setActionLoading(true)
    const supabase = createClient()
    const reportId = selectedReportForDelete.id

    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId)

      if (error) {
        alert(`Failed to delete report: ${error.message}`)
      } else {
        setAllReports((prev) => prev.filter((r) => r.id !== reportId))
        setSelectedReportForDelete(null)
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('An unexpected error occurred while deleting the report.')
    } finally {
      setActionLoading(false)
    }
  }

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

  const pendingCount = allReports.filter((r) => r.status === 'pending').length

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 pb-28 sm:pb-16">
      {/* Top Header */}
      <Header isAdmin={true} signingOut={signingOut} onSignOut={handleSignOut} />

      {/* Admin Modules Navigation */}
      <AdminNav pendingCount={pendingCount} />

      {/* Database Schema Setup Notice */}
      {tableMissingNotice && (
        <div className="max-w-5xl mx-auto w-full px-4 pt-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs sm:text-sm text-amber-800 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">Supabase Database Setup Required:</span> Please execute the SQL
                script in <code className="font-mono bg-amber-100 px-1 rounded">supabase_schema.sql</code> inside your
                Supabase SQL Editor to create the <code className="font-mono bg-amber-100 px-1 rounded">reports</code> table.
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

      {/* Admin Command Center */}
      <AdminCommandCenter
        allReports={allReports}
        reportsLoading={reportsLoading}
        adminFilter={adminFilter}
        actionLoading={actionLoading}
        onFilterChange={setAdminFilter}
        onRefresh={fetchReports}
        onAcceptReport={handleAcceptReport}
        onRejectClick={(report) => setSelectedReportForAction(report)}
        onDeleteClick={(report) => setSelectedReportForDelete(report)}
      />

      {/* Reject Modal */}
      <AdminRejectModal
        report={selectedReportForAction}
        reason={rejectReason}
        loading={actionLoading}
        onReasonChange={setRejectReason}
        onClose={() => setSelectedReportForAction(null)}
        onConfirm={handleRejectConfirm}
      />

      {/* Delete Modal */}
      <AdminDeleteModal
        report={selectedReportForDelete}
        loading={actionLoading}
        onClose={() => setSelectedReportForDelete(null)}
        onConfirm={handleDeleteReport}
      />
    </div>
  )
}
