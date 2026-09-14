'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/utils/supabase/client'
import { getUserRole } from '@/lib/role'
import { Header } from '@/components/common/Header'
import {
  ResponderNav,
  type ResponderTab,
} from '@/components/responder/ResponderNav'
import { ResponderMissionCard } from '@/components/responder/ResponderMissionCard'
import { ResponderNotificationBanner } from '@/components/responder/ResponderNotificationBanner'
import { RescueCompletionModal } from '@/components/responder/RescueCompletionModal'
import { useResponderTracker } from '@/hooks/useResponderTracker'
import type { ReportItem } from '@/types/report'
import type { UserProfile } from '@/types/profile'
import {
  Shield,
  Radio,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Phone,
  User as UserIcon,
  Compass,
  Car,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'

// Dynamic import for Leaflet map with SSR disabled
const ResponderTrackingMap = dynamic(
  () => import('@/components/responder/ResponderTrackingMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[380px] sm:h-[460px] rounded-2xl bg-zinc-100 flex flex-col items-center justify-center gap-2 border border-zinc-200">
        <Loader2 className="w-7 h-7 text-red-600 animate-spin" />
        <p className="text-xs text-zinc-500 font-semibold">
          Loading Emergency Geospatial Navigation...
        </p>
      </div>
    ),
  }
)

export default function ResponderPage() {
  const router = useRouter()

  // Authentication & Profile State
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile>({
    fullName: 'Loading...',
    phone: '',
    email: '',
    gender: 'Not specified',
    dob: 'Not specified',
    role: 2,
  })
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<ResponderTab>('dispatches')

  // Reports Data
  const [reports, setReports] = useState<ReportItem[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [activeMission, setActiveMission] = useState<ReportItem | null>(null)

  // Real-time Notification Banner for Admin Approvals
  const [latestApprovedReport, setLatestApprovedReport] = useState<ReportItem | null>(null)

  // Completion Proof Modal State
  const [completionModalReport, setCompletionModalReport] = useState<ReportItem | null>(null)

  // Live GPS Tracker Hook
  const {
    currentLocation,
    isTracking,
    gpsError,
    isSimulating,
    distanceKm,
    startTracking,
    stopTracking,
    toggleSimulatedMovement,
    broadcastLocation,
    requestDeviceLocation,
    setManualLocation,
  } = useResponderTracker()

  // 1. Session & Role Verification
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

      const userRole = await getUserRole(supabase, currentUser)

      // Citizens (role 1) redirected to citizen dashboard
      if (userRole === 1) {
        router.replace('/dashboard')
        return
      }

      const meta = currentUser.user_metadata || {}
      setProfile({
        fullName: meta.full_name || currentUser.email?.split('@')[0] || 'Responder Officer',
        phone: meta.phone_number || '',
        email: currentUser.email || '',
        gender: meta.gender || 'Not specified',
        dob: meta.date_of_birth || 'Not specified',
        role: 2,
      })

      setLoading(false)
    }

    initAuth()
  }, [router])

  // 2. Fetch Accepted (Dispatched) & Assigned Incidents
  const fetchDispatchedReports = useCallback(async () => {
    if (!user) return
    setReportsLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*, profiles:user_id(full_name, phone_number, email)')
        .in('status', ['accepted'])
        .order('created_at', { ascending: false })

      if (!error && data) {
        setReports(data as ReportItem[])

        // Check if there is an ongoing active mission for this responder
        const ongoing = (data as ReportItem[]).find(
          (r) =>
            (r.mission_status === 'en_route' || r.mission_status === 'on_scene') &&
            r.responder_id === user.id
        )
        if (ongoing) {
          setActiveMission(ongoing)
          if (ongoing.responder_latitude && ongoing.responder_longitude) {
            setManualLocation(Number(ongoing.responder_latitude), Number(ongoing.responder_longitude))
          }
        }
      }
    } catch (err) {
      console.error('Failed to load dispatched reports:', err)
    } finally {
      setReportsLoading(false)
    }
  }, [user, setManualLocation])

  useEffect(() => {
    let active = true
    if (user) {
      Promise.resolve().then(() => {
        if (active) fetchDispatchedReports()
      })
    }
    return () => {
      active = false
    }
  }, [user, fetchDispatchedReports])

  // 3. Realtime Listener: Alert responder when Admin approves an emergency
  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    const channel = supabase
      .channel('responder-reports-listener')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
        },
        (payload) => {
          const newOrUpdated = payload.new as ReportItem

          if (newOrUpdated && newOrUpdated.status === 'accepted') {
            // Update local state list
            setReports((prev) => {
              const existingIdx = prev.findIndex((r) => r.id === newOrUpdated.id)
              if (existingIdx >= 0) {
                const updated = [...prev]
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  ...newOrUpdated,
                }
                return updated
              }
              return [newOrUpdated, ...prev]
            })

            // If this is a newly approved report that was just updated from pending, notify responder
            const oldRecord = payload.old as Partial<ReportItem>
            if (oldRecord && oldRecord.status === 'pending') {
              setLatestApprovedReport(newOrUpdated)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // 4. Action: En Route to Scene (Start Tracking & Dispatch Response)
  const handleStartResponse = async (report: ReportItem) => {
    if (!user) return

    const supabase = createClient()
    const responderName = profile.fullName || 'Emergency Responder'
    const responderPhone = profile.phone || ''

    try {
      // Update report with responder details and en_route status
      const { error } = await supabase
        .from('reports')
        .update({
          responder_id: user.id,
          responder_name: responderName,
          responder_phone: responderPhone,
          mission_status: 'en_route',
          responder_latitude: currentLocation?.latitude || 7.0425,
          responder_longitude: currentLocation?.longitude || 126.4485,
          responder_updated_at: new Date().toISOString(),
        })
        .eq('id', report.id)

      if (error) {
        if (error.message.includes('schema cache') || error.message.includes('column')) {
          alert('Database migration required:\n\nThe new responder columns (mission_status, responder_id, etc.) have not been created in your Supabase database yet.\n\nPlease open your Supabase SQL Editor and run the migration script in `add_responder_role.sql` to add the columns.')
        } else {
          alert(`Failed to accept dispatch: ${error.message}`)
        }
        return
      }

      const updated: ReportItem = {
        ...report,
        responder_id: user.id,
        responder_name: responderName,
        responder_phone: responderPhone,
        mission_status: 'en_route',
      }

      setReports((prev) => prev.map((r) => (r.id === report.id ? updated : r)))
      setActiveMission(updated)
      setActiveTab('map') // Automatically switch to map tab to navigate

      // Start live GPS tracking
      startTracking(
        report.id,
        { id: user.id, name: responderName, phone: responderPhone },
        report.latitude && report.longitude
          ? { latitude: Number(report.latitude), longitude: Number(report.longitude) }
          : undefined
      )
    } catch (err) {
      console.error('Start response error:', err)
    }
  }

  // 5. Action: Arrived on Scene
  const handleArrivedScene = async (report: ReportItem) => {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('reports')
        .update({
          mission_status: 'on_scene',
          responder_updated_at: new Date().toISOString(),
        })
        .eq('id', report.id)

      if (error) {
        alert(`Failed to update status: ${error.message}`)
        return
      }

      const updated: ReportItem = {
        ...report,
        mission_status: 'on_scene',
      }

      setReports((prev) => prev.map((r) => (r.id === report.id ? updated : r)))
      setActiveMission(updated)

      // Broadcast on_scene event
      if (currentLocation) {
        broadcastLocation(
          {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          },
          'on_scene'
        )
      }
    } catch (err) {
      console.error('Arrived scene error:', err)
    }
  }

  // 6. Action: Finished Rescue Operation - Success Callback from Modal
  const handleCompletionSuccess = (updatedReport: ReportItem) => {
    setReports((prev) => prev.map((r) => (r.id === updatedReport.id ? updatedReport : r)))
    if (activeMission?.id === updatedReport.id) {
      setActiveMission(null)
      stopTracking()
    }
    setActiveTab('resolved')
  }

  // Sign out handler
  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    stopTracking()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Categorize reports
  const activeReports = useMemo(() => {
    return reports.filter((r) => r.mission_status !== 'completed')
  }, [reports])

  const resolvedReports = useMemo(() => {
    return reports.filter((r) => r.mission_status === 'completed')
  }, [reports])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          <p className="text-sm text-zinc-500 font-medium">
            Verifying MDRRMO Responder Credentials...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 pb-28 sm:pb-16">
      {/* Top Header */}
      <Header
        role={2}
        isResponder={true}
        signingOut={signingOut}
        onSignOut={handleSignOut}
      />

      {/* Responder Navigation Tabs */}
      <ResponderNav
        activeTab={activeTab}
        activeCount={activeReports.length}
        resolvedCount={resolvedReports.length}
        onTabChange={setActiveTab}
      />

      {/* Floating Notification Banner when Admin Approves an Emergency */}
      <ResponderNotificationBanner
        latestApprovedReport={latestApprovedReport}
        onDismiss={() => setLatestApprovedReport(null)}
        onRespond={(rep) => {
          setLatestApprovedReport(null)
          handleStartResponse(rep)
        }}
      />

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 flex-1 space-y-6">
        {/* Responder Unit Status Bar */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-zinc-900">
                  {profile.fullName}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  ON DUTY
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                MDRRMO Quick Response Force &bull; Tarragona, Davao Oriental
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-2 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center gap-2">
              <Radio
                className={`w-4 h-4 ${
                  isTracking ? 'text-emerald-600 animate-pulse' : 'text-zinc-400'
                }`}
              />
              <span className="font-semibold text-zinc-700">
                {isTracking ? 'GPS Tracking Active' : 'GPS Standby'}
              </span>
            </div>

            <button
              onClick={fetchDispatchedReports}
              disabled={reportsLoading}
              className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors"
              title="Refresh Dispatches"
            >
              <RefreshCw className={`w-4 h-4 ${reportsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* GPS Warning if error */}
        {gpsError && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>GPS Sensor Notice: {gpsError}</span>
          </div>
        )}

        {/* Tab 1: Dispatched Missions Feed */}
        {activeTab === 'dispatches' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                  Active Emergency Dispatches ({activeReports.length})
                </h2>
                <p className="text-xs text-zinc-500">
                  Verified incidents dispatched by MDRRMO Admin awaiting or undergoing response.
                </p>
              </div>
            </div>

            {reportsLoading && reports.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200">
                <Loader2 className="w-7 h-7 text-red-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-zinc-500 font-semibold">
                  Checking emergency dispatch queue...
                </p>
              </div>
            ) : activeReports.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">No Pending Emergency Dispatches</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  All active incidents in Tarragona have been resolved. Your unit will be alerted automatically when an admin approves a new incident.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeReports.map((report) => (
                  <ResponderMissionCard
                    key={report.id}
                    report={report}
                    distanceKm={activeMission?.id === report.id ? distanceKm : null}
                    isActiveMission={activeMission?.id === report.id}
                    isSimulating={isSimulating}
                    onStartResponse={handleStartResponse}
                    onArrivedScene={handleArrivedScene}
                    onOpenCompletionModal={(rep) => setCompletionModalReport(rep)}
                    onToggleSimulation={toggleSimulatedMovement}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Live Tracking & Navigation Map */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <Compass className="w-4 h-4 text-red-600" />
                  Live Geospatial Navigation &amp; Responder Beacon
                </h2>
                <p className="text-xs text-zinc-500">
                  Real-time GPS stream transmitting directly to the Admin Command Center Map.
                </p>
              </div>

              {activeMission && (
                <button
                  type="button"
                  onClick={toggleSimulatedMovement}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border shrink-0 ${
                    isSimulating
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>{isSimulating ? 'Pause Simulator' : 'Test Drive Simulator'}</span>
                </button>
              )}
            </div>

            {activeMission ? (
              <div className="space-y-4">
                <ResponderTrackingMap
                  report={activeMission}
                  responderCoords={
                    currentLocation ||
                    (activeMission.responder_latitude && activeMission.responder_longitude
                      ? {
                          latitude: Number(activeMission.responder_latitude),
                          longitude: Number(activeMission.responder_longitude),
                        }
                      : null)
                  }
                  distanceKm={distanceKm}
                  isSimulating={isSimulating}
                  gpsError={gpsError}
                  onRetryGps={requestDeviceLocation}
                  onUseStationLocation={() => setManualLocation(7.0425, 126.4485)}
                />

                <ResponderMissionCard
                  report={activeMission}
                  distanceKm={distanceKm}
                  isActiveMission={true}
                  isSimulating={isSimulating}
                  onStartResponse={handleStartResponse}
                  onArrivedScene={handleArrivedScene}
                  onOpenCompletionModal={(rep) => setCompletionModalReport(rep)}
                  onToggleSimulation={toggleSimulatedMovement}
                />
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200 space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">No Active Mission Selected</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Select a dispatched incident from the &ldquo;Dispatched Missions&rdquo; tab and tap &ldquo;En Route to Scene&rdquo; to launch live tracking navigation.
                </p>
                <button
                  onClick={() => setActiveTab('dispatches')}
                  className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  View Dispatches
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Resolved Operations History */}
        {activeTab === 'resolved' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                Resolved Operations History ({resolvedReports.length})
              </h2>
              <p className="text-xs text-zinc-500">
                Completed emergencies with verified rescue proof photos and post-incident reports.
              </p>
            </div>

            {resolvedReports.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200 space-y-2">
                <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">No Resolved Operations Yet</h3>
                <p className="text-xs text-zinc-500">
                  When you complete an emergency mission and upload the resolution proof photo, it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {resolvedReports.map((report) => (
                  <ResponderMissionCard
                    key={report.id}
                    report={report}
                    distanceKm={null}
                    isActiveMission={false}
                    isSimulating={false}
                    onStartResponse={handleStartResponse}
                    onArrivedScene={handleArrivedScene}
                    onOpenCompletionModal={(rep) => setCompletionModalReport(rep)}
                    onToggleSimulation={toggleSimulatedMovement}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Responder Profile & Duty Readiness */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Responder Profile &amp; Unit Information</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Official registration details for MDRRMO disaster response personnel.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block font-medium mb-1">Full Name</span>
                <span className="font-bold text-zinc-800 text-sm flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-red-600" />
                  {profile.fullName}
                </span>
              </div>

              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block font-medium mb-1">Contact Number</span>
                <span className="font-bold text-zinc-800 text-sm font-mono flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-red-600" />
                  {profile.phone || 'Not provided'}
                </span>
              </div>

              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block font-medium mb-1">Assigned Department</span>
                <span className="font-bold text-zinc-800 text-sm">
                  MDRRMO Quick Response Force &bull; Tarragona
                </span>
              </div>

              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block font-medium mb-1">Role Permission</span>
                <span className="font-bold text-emerald-700 text-sm flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Role 2 &bull; Emergency Field Responder
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>Account Email: {profile.email}</span>
              <button
                onClick={handleSignOut}
                className="text-red-600 font-bold hover:underline"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Completion Proof Photo Upload Modal */}
      <RescueCompletionModal
        report={completionModalReport}
        isOpen={completionModalReport !== null}
        onClose={() => setCompletionModalReport(null)}
        onSuccess={handleCompletionSuccess}
      />
    </div>
  )
}
