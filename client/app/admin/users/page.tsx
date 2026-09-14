'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getUserRole } from '@/lib/role'
import { Header } from '@/components/common/Header'
import { AdminNav } from '@/components/admin/AdminNav'
import type { UserRole } from '@/types/profile'
import {
  Users,
  Shield,
  UserCheck,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  Filter,
  User,
  ShieldAlert,
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface ProfileItem {
  id: string
  email: string
  full_name: string
  phone_number?: string | null
  gender?: string | null
  date_of_birth?: string | null
  role: UserRole
  created_at: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  // Profiles Data
  const [profiles, setProfiles] = useState<ProfileItem[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | '0' | '1' | '2'>('all')

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

      setCurrentUser(session.user)
      setLoading(false)
    }

    verifyAdmin()
  }, [router])

  // 2. Fetch All Profiles
  const fetchProfiles = useCallback(async () => {
    if (!currentUser) return
    setProfilesLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setErrorMessage(error.message)
      } else if (data) {
        setProfiles(data as ProfileItem[])
      }
    } catch (err) {
      console.error('Failed to load user profiles:', err)
    } finally {
      setProfilesLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    let active = true
    if (currentUser) {
      Promise.resolve().then(() => {
        if (active) fetchProfiles()
      })
    }
    return () => {
      active = false
    }
  }, [currentUser, fetchProfiles])

  // 3. Action: Admin sets the role of a user
  const handleSetRole = async (profileId: string, profileName: string, newRole: UserRole) => {
    setActionLoadingId(profileId)
    setErrorMessage(null)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', profileId)

      if (error) {
        setErrorMessage(`Failed to update role: ${error.message}`)
      } else {
        setProfiles((prev) =>
          prev.map((p) => (p.id === profileId ? { ...p, role: newRole } : p))
        )
        const roleLabel =
          newRole === 2
            ? 'Emergency Responder (Role 2)'
            : newRole === 0
            ? 'Administrator (Role 0)'
            : 'Citizen (Role 1)'
        setSuccessMessage(`Successfully updated ${profileName} to ${roleLabel}.`)
        setTimeout(() => setSuccessMessage(null), 4000)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update role.'
      setErrorMessage(msg)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Sign out handler
  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Filtered Profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesRole =
        roleFilter === 'all' ? true : String(p.role) === roleFilter

      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone_number?.toLowerCase().includes(q)

      return matchesRole && matchesSearch
    })
  }, [profiles, roleFilter, searchQuery])

  // Summary Metrics
  const totalCount = profiles.length
  const citizenCount = profiles.filter((p) => p.role === 1).length
  const responderCount = profiles.filter((p) => p.role === 2).length
  const adminCount = profiles.filter((p) => p.role === 0).length

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
      <AdminNav />

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-6 flex-1 space-y-6">
        {/* Module Header & Summary Cards */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold mb-2">
                <Users className="w-3.5 h-3.5" />
                MDRRMO Tarragona Access Control
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 flex items-center gap-2">
                Personnel &amp; Role Management
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Citizens automatically register with default role. Assign and designate verified personnel as Emergency Responders (Role 2) or Dispatch Admins (Role 0).
              </p>
            </div>

            <button
              onClick={fetchProfiles}
              disabled={profilesLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-300 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 transition-colors shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${profilesLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Personnel</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-zinc-100 text-xs">
            <div className="p-3 bg-zinc-50 rounded-xl">
              <span className="text-zinc-400 block font-medium">Total Registered</span>
              <span className="text-lg font-bold text-zinc-800">{totalCount}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <span className="text-emerald-700 block font-medium">Emergency Responders</span>
              <span className="text-lg font-bold text-emerald-900">{responderCount}</span>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <span className="text-blue-700 block font-medium">Registered Citizens</span>
              <span className="text-lg font-bold text-blue-900">{citizenCount}</span>
            </div>
            <div className="p-3 bg-zinc-100 rounded-xl">
              <span className="text-zinc-600 block font-medium">MDRRMO Admins</span>
              <span className="text-lg font-bold text-zinc-800">{adminCount}</span>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by citizen name, email, or phone number..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <Filter className="w-3.5 h-3.5 text-zinc-400 mr-1 shrink-0" />
            {[
              { id: 'all', label: `All (${totalCount})` },
              { id: '2', label: `Responders (${responderCount})` },
              { id: '1', label: `Citizens (${citizenCount})` },
              { id: '0', label: `Admins (${adminCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id as 'all' | '0' | '1' | '2')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  roleFilter === tab.id
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Personnel List Cards / Table */}
        <div className="space-y-3">
          {profilesLoading && profiles.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200">
              <Loader2 className="w-7 h-7 text-red-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-zinc-500 font-semibold">Loading personnel directory...</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200 space-y-2">
              <Users className="w-8 h-8 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-800">No personnel found</h3>
              <p className="text-xs text-zinc-500">
                {searchQuery
                  ? `No profiles matching "${searchQuery}".`
                  : 'No users registered under this role filter.'}
              </p>
            </div>
          ) : (
            filteredProfiles.map((profile) => {
              const isBusy = actionLoadingId === profile.id

              const roleBadge =
                profile.role === 2 ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shrink-0">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    Responder (Role 2)
                  </span>
                ) : profile.role === 0 ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-900 text-white flex items-center gap-1.5 shrink-0">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                    Administrator (Role 0)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center gap-1.5 shrink-0">
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                    Citizen (Role 1)
                  </span>
                )

              return (
                <div
                  key={profile.id}
                  className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-zinc-300"
                >
                  {/* User Profile Information */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                        {profile.full_name}
                      </h3>
                      {roleBadge}
                      {profile.id === currentUser?.id && (
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                          (You)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{profile.email}</span>
                      </span>

                      {profile.phone_number && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                          <a
                            href={`tel:${profile.phone_number.replace(/[^0-9]/g, '')}`}
                            className="text-red-600 hover:underline"
                          >
                            {profile.phone_number}
                          </a>
                        </span>
                      )}

                      {profile.gender && (
                        <span className="text-zinc-400">&bull; {profile.gender}</span>
                      )}

                      {profile.created_at && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role Assignment Action Controls */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100 shrink-0">
                    {/* Role 1 (Citizen) -> Promote to Responder (Role 2) */}
                    {profile.role === 1 && (
                      <button
                        onClick={() => handleSetRole(profile.id, profile.full_name, 2)}
                        disabled={isBusy}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        title="Authorize this citizen as an Emergency Responder"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Shield className="w-3.5 h-3.5" />
                        )}
                        <span>Set as Responder</span>
                      </button>
                    )}

                    {/* Role 2 (Responder) -> Revert to Citizen (Role 1) */}
                    {profile.role === 2 && (
                      <button
                        onClick={() => handleSetRole(profile.id, profile.full_name, 1)}
                        disabled={isBusy}
                        className="px-3.5 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        title="Revert role back to standard Citizen"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                        <span>Revert to Citizen</span>
                      </button>
                    )}

                    {/* Quick switch to Admin or toggle */}
                    {profile.role !== 0 && (
                      <button
                        onClick={() => {
                          if (confirm(`Promote ${profile.full_name} to MDRRMO Administrator?`)) {
                            handleSetRole(profile.id, profile.full_name, 0)
                          }
                        }}
                        disabled={isBusy}
                        className="px-3 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-semibold text-xs transition-colors disabled:opacity-50"
                        title="Make Administrator"
                      >
                        Make Admin
                      </button>
                    )}

                    {/* If Admin (and not current user) -> option to set as Responder or Citizen */}
                    {profile.role === 0 && profile.id !== currentUser?.id && (
                      <button
                        onClick={() => handleSetRole(profile.id, profile.full_name, 2)}
                        disabled={isBusy}
                        className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors disabled:opacity-50"
                      >
                        Set as Responder
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
