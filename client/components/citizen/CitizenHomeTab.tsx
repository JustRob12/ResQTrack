'use client'

import { Mail, Phone, AlertTriangle, RefreshCw, FileText, MapPin, Video } from 'lucide-react'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { UserProfile } from '@/types/profile'
import type { ReportItem } from '@/types/report'

interface CitizenHomeTabProps {
  profile: UserProfile
  userReports: ReportItem[]
  reportsLoading: boolean
  onRefresh: () => void
  onNavigateToReport: () => void
  onSelectReport: (report: ReportItem) => void
}

export function CitizenHomeTab({
  profile,
  userReports,
  reportsLoading,
  onRefresh,
  onNavigateToReport,
  onSelectReport,
}: CitizenHomeTabProps) {
  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-lg">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">{profile.fullName}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  {profile.email}
                </span>
                {profile.phone && (
                  <>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      {profile.phone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToReport}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              Send New Emergency Report
            </button>
          </div>
        </div>

        {/* Profile Extra Info */}
        <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2 bg-zinc-50 rounded-lg">
            <span className="text-zinc-400 block">Gender</span>
            <span className="font-semibold text-zinc-700">{profile.gender}</span>
          </div>
          <div className="p-2 bg-zinc-50 rounded-lg">
            <span className="text-zinc-400 block">Date of Birth</span>
            <span className="font-semibold text-zinc-700">{profile.dob}</span>
          </div>
          <div className="p-2 bg-zinc-50 rounded-lg">
            <span className="text-zinc-400 block">Assigned Role</span>
            <span className="font-semibold text-emerald-700">Role 1 (Citizen)</span>
          </div>
          <div className="p-2 bg-zinc-50 rounded-lg">
            <span className="text-zinc-400 block">Reports Submitted</span>
            <span className="font-semibold text-zinc-800">{userReports.length}</span>
          </div>
        </div>
      </div>

      {/* My Recent Reports Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900">My Recent Reports</h3>
          <button
            onClick={onRefresh}
            disabled={reportsLoading}
            className="text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reportsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {userReports.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-800">No emergency reports sent yet</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              When you witness an incident or accident, use the Report button to send real-time photos, videos,
              and GPS location to MDRRMO Tarragona.
            </p>
            <button
              onClick={onNavigateToReport}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Create First Report
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userReports.map((report) => (
              <div
                key={report.id}
                onClick={() => onSelectReport(report)}
                className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs hover:border-zinc-300 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <StatusBadge status={report.status} />
                    <span className="text-[11px] text-zinc-400">
                      {new Date(report.created_at).toLocaleDateString()}{' '}
                      {new Date(report.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    {/* Media thumbnail */}
                    <div className="w-20 h-20 rounded-lg bg-zinc-100 overflow-hidden shrink-0 border border-zinc-100">
                      {report.media_type === 'video' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white text-[10px]">
                          <Video className="w-5 h-5 mb-1" />
                          Video
                        </div>
                      ) : (
                        <img
                          src={report.media_url}
                          alt={report.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-zinc-900 truncate">{report.title}</h4>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                        {report.caption || 'No additional caption provided.'}
                      </p>
                      {report.latitude && (
                        <div className="flex items-center gap-1 mt-2 text-[11px] text-zinc-400">
                          <MapPin className="w-3 h-3 text-red-500" />
                          <span>
                            {report.latitude.toFixed(4)}, {report.longitude?.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {report.status === 'rejected' && report.rejection_reason && (
                  <div className="mt-3 p-2 rounded bg-zinc-50 text-[11px] text-zinc-600">
                    <span className="font-semibold text-zinc-800">Note:</span> {report.rejection_reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
