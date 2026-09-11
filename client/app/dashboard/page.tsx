'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { useGpsLocation } from '@/hooks/useGpsLocation'
import { getUserRole } from '@/lib/role'
import { Header } from '@/components/common/Header'
import { BottomNav, type CitizenTab } from '@/components/common/BottomNav'
import { CitizenHomeTab } from '@/components/citizen/CitizenHomeTab'
import { CitizenReportTab } from '@/components/citizen/CitizenReportTab'
import { CitizenContactsTab } from '@/components/citizen/CitizenContactsTab'
import { ReportDetailModal } from '@/components/citizen/ReportDetailModal'
import { sanitizeDate, type UserProfile } from '@/types/profile'
import type { ReportItem } from '@/types/report'
import { Loader2, AlertTriangle, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function DashboardPage() {
  const router = useRouter()

  // Authentication & Profile State
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile>({
    fullName: 'Loading...',
    phone: '',
    email: '',
    gender: 'Not specified',
    dob: 'Not specified',
    role: 1,
  })
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  // Navigation State
  const [activeTab, setActiveTab] = useState<CitizenTab>('home')

  // Reports State
  const [userReports, setUserReports] = useState<ReportItem[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [tableMissingNotice, setTableMissingNotice] = useState(false)

  // Report Submission Form State
  const [reportTitle, setReportTitle] = useState('')
  const [reportCaption, setReportCaption] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'image' | 'video'>('image')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [submittingReport, setSubmittingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportSuccess, setReportSuccess] = useState(false)

  // GPS Location Hook
  const { gpsLocation, gpsLoading, gpsError, acquireGpsLocation } = useGpsLocation()

  // Citizen Viewing Detail Modal
  const [viewingReport, setViewingReport] = useState<ReportItem | null>(null)

  // 1. Initial Session & Role Verification
  useEffect(() => {
    const initAuth = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const currentUser = session.user
      setUser(currentUser)

      // Read role from public.profiles or metadata
      const userRole = await getUserRole(supabase, currentUser)

      // When the user's role is 0, direct them to the dedicated admin page
      if (userRole === 0) {
        router.replace('/admin')
        return
      }

      const meta = currentUser.user_metadata || {}
      const loadedProfile: UserProfile = {
        fullName: meta.full_name || currentUser.email?.split('@')[0] || 'Citizen',
        phone: meta.phone_number || '',
        email: currentUser.email || '',
        gender: meta.gender || 'Not specified',
        dob: meta.date_of_birth || 'Not specified',
        role: 1,
      }
      setProfile(loadedProfile)

      // Ensure profile exists in public.profiles table to prevent foreign key errors
      const safeInitDob = sanitizeDate(meta.date_of_birth)
      const safeInitGender = meta.gender && meta.gender !== 'Not specified' ? meta.gender : null

      const { error: initProfErr } = await supabase.from('profiles').upsert({
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: loadedProfile.fullName,
        phone_number: loadedProfile.phone || null,
        gender: safeInitGender,
        date_of_birth: safeInitDob,
        role: 1,
      })

      if (initProfErr) {
        console.warn('Profiles initial sync warning:', initProfErr.message, initProfErr.code)
      }

      setLoading(false)
    }

    initAuth()
  }, [router])

  // 2. Fetch User's Reports
  const fetchReports = useCallback(async () => {
    if (!user) return
    setReportsLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        if (
          error.code === 'PGRST205' ||
          error.message.includes('relation "public.reports" does not exist')
        ) {
          setTableMissingNotice(true)
        }
      } else if (data) {
        setUserReports(data as ReportItem[])
      }
    } catch (err) {
      console.error('Failed to load reports:', err)
    } finally {
      setReportsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchReports()
    }
  }, [user, fetchReports])

  // Auto acquire GPS when navigating to Report tab if not yet acquired
  useEffect(() => {
    if (activeTab === 'report' && !gpsLocation && !gpsLoading) {
      acquireGpsLocation()
    }
  }, [activeTab, gpsLocation, gpsLoading, acquireGpsLocation])

  // Sign out handler
  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Media Selection & Preview
  const handleMediaSelected = (file: File, type: 'image' | 'video') => {
    setSelectedFile(file)
    setFileType(type)
    const previewUrl = URL.createObjectURL(file)
    setFilePreview(previewUrl)
  }

  const handleClearMedia = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview)
    }
    setSelectedFile(null)
    setFilePreview(null)
  }

  // Submit Emergency Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault()
    setReportError(null)

    if (!selectedFile) {
      setReportError('Please take a live photo, record a video, or select media from your device.')
      return
    }

    if (!reportTitle.trim()) {
      setReportError('Please enter an incident title.')
      return
    }

    setSubmittingReport(true)
    setUploadProgress(0)

    try {
      const supabase = createClient()
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      const effectiveUser = currentUser || user

      if (!effectiveUser) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      // 1. Upload media to Cloudinary
      const uploadResult = await uploadToCloudinary(selectedFile, (percent) => {
        setUploadProgress(percent)
      })

      // 2. Ensure profile exists in public.profiles to satisfy foreign keys
      const safeDob =
        sanitizeDate(profile.dob) || sanitizeDate(effectiveUser.user_metadata?.date_of_birth)
      const safeGender =
        profile.gender && profile.gender !== 'Not specified'
          ? profile.gender
          : effectiveUser.user_metadata?.gender || null

      const { error: profErr } = await supabase.from('profiles').upsert({
        id: effectiveUser.id,
        email: effectiveUser.email || '',
        full_name: profile.fullName || effectiveUser.user_metadata?.full_name || 'Citizen',
        phone_number: profile.phone || effectiveUser.user_metadata?.phone_number || null,
        gender: safeGender,
        date_of_birth: safeDob,
        role: 1,
      })

      if (profErr) {
        console.error(
          'Profile upsert warning before report insert:',
          profErr.message,
          profErr.details,
          profErr.code
        )
      }

      // 3. Save report record in Supabase
      const { data, error } = await supabase
        .from('reports')
        .insert({
          user_id: effectiveUser.id,
          title: reportTitle.trim(),
          caption: reportCaption.trim() || null,
          media_url: uploadResult.secureUrl,
          media_type: uploadResult.mediaType,
          latitude: gpsLocation?.latitude || null,
          longitude: gpsLocation?.longitude || null,
          accuracy: gpsLocation?.accuracy || null,
          status: 'pending',
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase reports insert error details:', error)
        if (
          error.code === 'PGRST205' ||
          error.message?.includes('relation "public.reports" does not exist')
        ) {
          setTableMissingNotice(true)
          const mockReport: ReportItem = {
            id: 'temp-' + Date.now(),
            user_id: effectiveUser.id,
            title: reportTitle.trim(),
            caption: reportCaption.trim() || '',
            media_url: uploadResult.secureUrl,
            media_type: uploadResult.mediaType,
            latitude: gpsLocation?.latitude || null,
            longitude: gpsLocation?.longitude || null,
            accuracy: gpsLocation?.accuracy || null,
            status: 'pending',
            created_at: new Date().toISOString(),
          }
          setUserReports((prev) => [mockReport, ...prev])
        } else {
          throw new Error(
            error.message || error.details || error.hint || `Database error (${error.code})`
          )
        }
      } else if (data) {
        setUserReports((prev) => [data as ReportItem, ...prev])
      }

      setReportSuccess(true)
      setReportTitle('')
      setReportCaption('')
      handleClearMedia()
      setUploadProgress(null)

      setTimeout(() => {
        setReportSuccess(false)
        setActiveTab('home')
      }, 1500)
    } catch (err: unknown) {
      console.error('Submit report error:', err)
      const msg = err instanceof Error ? err.message : 'Failed to submit report. Please try again.'
      setReportError(msg)
    } finally {
      setSubmittingReport(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          <p className="text-sm text-zinc-500 font-medium">Loading ResQTrack...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 pb-24 sm:pb-12">
      {/* Top Navigation Header */}
      <Header isAdmin={false} signingOut={signingOut} onSignOut={handleSignOut} />

      {/* Database Schema Setup Notice */}
      {tableMissingNotice && (
        <div className="max-w-5xl mx-auto w-full px-4 pt-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs sm:text-sm text-amber-800 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">Supabase Database Setup Required:</span> Please execute
                the SQL script in <code className="font-mono bg-amber-100 px-1 rounded">supabase_schema.sql</code> inside
                your Supabase SQL Editor to create the <code className="font-mono bg-amber-100 px-1 rounded">reports</code> table.
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

      {/* Citizen View */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 flex-1">
        {/* Desktop/Tablet Tab Header */}
        <div className="hidden sm:flex items-center justify-between border-b border-zinc-200 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'home'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Home &amp; My Reports
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'report'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Report Incident
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'contacts'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Emergency Responders
            </button>
          </div>
          <div className="text-xs text-zinc-500 font-medium">
            Logged in as <span className="font-semibold text-zinc-800">{profile.fullName}</span>
          </div>
        </div>

        {/* TAB 1: HOME & RECENT REPORTS */}
        {activeTab === 'home' && (
          <CitizenHomeTab
            profile={profile}
            userReports={userReports}
            reportsLoading={reportsLoading}
            onRefresh={fetchReports}
            onNavigateToReport={() => setActiveTab('report')}
            onSelectReport={(report) => setViewingReport(report)}
          />
        )}

        {/* TAB 2: EMERGENCY INCIDENT REPORT */}
        {activeTab === 'report' && (
          <CitizenReportTab
            reportTitle={reportTitle}
            onTitleChange={setReportTitle}
            reportCaption={reportCaption}
            onCaptionChange={setReportCaption}
            selectedFile={selectedFile}
            filePreview={filePreview}
            fileType={fileType}
            onMediaSelected={handleMediaSelected}
            onClearMedia={handleClearMedia}
            gpsLocation={gpsLocation}
            gpsLoading={gpsLoading}
            gpsError={gpsError}
            onRefreshGps={acquireGpsLocation}
            uploadProgress={uploadProgress}
            submittingReport={submittingReport}
            reportError={reportError}
            reportSuccess={reportSuccess}
            onSubmit={handleSubmitReport}
          />
        )}

        {/* TAB 3: EMERGENCY RESPONDER CONTACTS */}
        {activeTab === 'contacts' && <CitizenContactsTab />}

        {/* Mobile Bottom Floating Navigation */}
        <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Report Detail Modal */}
        <ReportDetailModal report={viewingReport} onClose={() => setViewingReport(null)} />
      </main>
    </div>
  )
}
