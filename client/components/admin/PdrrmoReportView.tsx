'use client'

import type { ReportItem } from '@/types/report'
import type { ReportPeriod } from '@/components/admin/ReportExportControls'

interface PdrrmoReportViewProps {
  reports: ReportItem[]
  period: ReportPeriod
  preparedBy: string
}

export function PdrrmoReportView({
  reports,
  period,
  preparedBy,
}: PdrrmoReportViewProps) {
  const currentDate = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const currentTime = new Date().toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const periodTitle =
    period === 'daily'
      ? '24-Hour Situation Report (SitRep)'
      : period === 'weekly'
      ? 'Weekly Emergency Operations & Incident Summary'
      : period === 'monthly'
      ? 'Monthly Disaster Risk Reduction & Response Assessment'
      : 'Comprehensive Disaster Response & Incident Registry'

  const total = reports.length
  const accepted = reports.filter((r) => r.status === 'accepted').length
  const pending = reports.filter((r) => r.status === 'pending').length
  const rejected = reports.filter((r) => r.status === 'rejected').length
  const dispatchRate = total > 0 ? Math.round((accepted / total) * 100) : 0

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-10 shadow-sm print:shadow-none print:border-none print:p-0 text-zinc-900 font-sans">
      {/* 1. Official Government Header */}
      <div className="text-center pb-6 border-b-2 border-zinc-900 mb-6">
        <p className="text-[11px] uppercase tracking-widest font-serif font-bold text-zinc-600">
          Republic of the Philippines
        </p>
        <p className="text-xs uppercase font-serif font-semibold text-zinc-700">
          Province of Davao Oriental &bull; Municipality of Tarragona
        </p>
        <h1 className="text-base sm:text-lg font-black uppercase tracking-wide text-zinc-900 mt-1">
          Municipal Disaster Risk Reduction &amp; Management Office
        </h1>
        <p className="text-[11px] text-zinc-500 font-medium">
          MDRRMO Operations Center, Poblacion, Tarragona, Davao Oriental &bull; Emergency Hotline: 0917-827-7278
        </p>

        <div className="mt-4 pt-3 border-t border-zinc-200 inline-block">
          <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-zinc-100 text-zinc-700 font-bold">
            Document No: MDRRMO-TAR-{new Date().getFullYear()}-{String(reports.length).padStart(4, '0')}
          </span>
        </div>
      </div>

      {/* 2. Target Agency Routing Memo */}
      <div className="bg-zinc-50 print:bg-transparent border border-zinc-200 print:border-zinc-300 rounded-xl p-4 mb-6 text-xs space-y-1.5 font-sans">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
          <span className="font-bold text-zinc-600 sm:col-span-1">TO:</span>
          <span className="font-bold text-zinc-900 sm:col-span-3">
            Provincial Disaster Risk Reduction &amp; Management Office (PDRRMO)
            <span className="block text-[11px] font-normal text-zinc-600">
              Province of Davao Oriental, City of Mati
            </span>
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
          <span className="font-bold text-zinc-600 sm:col-span-1">FROM:</span>
          <span className="font-bold text-zinc-900 sm:col-span-3">
            MDRRMO Tarragona Emergency Operations Center
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
          <span className="font-bold text-zinc-600 sm:col-span-1">SUBJECT:</span>
          <span className="font-bold text-red-600 sm:col-span-3 uppercase">
            {periodTitle}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
          <span className="font-bold text-zinc-600 sm:col-span-1">DATE TRANSMITTED:</span>
          <span className="font-mono text-zinc-800 sm:col-span-3">
            {currentDate} at {currentTime}
          </span>
        </div>
      </div>

      {/* 3. Executive Situation Overview */}
      <div className="mb-6 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1 flex items-center justify-between">
          <span>I. Operational Executive Summary</span>
          <span className="text-[10px] text-zinc-500 font-normal">ResQTrack Verified Registry</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 border border-zinc-200 rounded-lg bg-zinc-50 print:bg-transparent">
            <span className="text-zinc-500 text-[11px] block">Total Incidents Reported</span>
            <span className="text-xl font-bold text-zinc-900">{total}</span>
          </div>
          <div className="p-3 border border-emerald-200 rounded-lg bg-emerald-50/50 print:bg-transparent">
            <span className="text-emerald-700 text-[11px] block">Operations Dispatched</span>
            <span className="text-xl font-bold text-emerald-800">{accepted} ({dispatchRate}%)</span>
          </div>
          <div className="p-3 border border-amber-200 rounded-lg bg-amber-50/50 print:bg-transparent">
            <span className="text-amber-700 text-[11px] block">Pending Verification</span>
            <span className="text-xl font-bold text-amber-800">{pending}</span>
          </div>
          <div className="p-3 border border-zinc-200 rounded-lg bg-zinc-50 print:bg-transparent">
            <span className="text-zinc-500 text-[11px] block">Dismissed / False Alarms</span>
            <span className="text-xl font-bold text-zinc-700">{rejected}</span>
          </div>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed pt-1">
          This report compiles real-time citizen notifications, digital photographic/video evidence,
          and automated GPS coordinate mapping recorded by the MDRRMO Tarragona ResQTrack emergency response system.
          Dispatched incidents indicate immediate deployment of municipal search and rescue, medical, or security personnel.
        </p>
      </div>

      {/* 4. Tabular Incident Matrix */}
      <div className="mb-6 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1">
          II. Incident &amp; Operations Registry Log
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-zinc-200 print:border-zinc-300">
            <thead>
              <tr className="bg-zinc-100 print:bg-zinc-200 text-zinc-700 font-bold uppercase text-[10px] border-b border-zinc-200">
                <th className="p-2 border-r border-zinc-200 text-center w-8">#</th>
                <th className="p-2 border-r border-zinc-200 w-28">Date &amp; Time</th>
                <th className="p-2 border-r border-zinc-200">Incident Details</th>
                <th className="p-2 border-r border-zinc-200 w-28">Coordinates</th>
                <th className="p-2 border-r border-zinc-200 w-28">Reporter</th>
                <th className="p-2 text-center w-24">Action Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {reports.map((r, idx) => (
                <tr key={r.id} className="hover:bg-zinc-50/50">
                  <td className="p-2 border-r border-zinc-200 text-center font-mono text-[10px] text-zinc-500">
                    {idx + 1}
                  </td>
                  <td className="p-2 border-r border-zinc-200 font-mono text-[11px] text-zinc-700">
                    {new Date(r.created_at).toLocaleDateString()}<br />
                    <span className="text-[10px] text-zinc-400">
                      {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="p-2 border-r border-zinc-200">
                    <div className="font-bold text-zinc-900">{r.title}</div>
                    {r.caption && (
                      <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">
                        {r.caption}
                      </div>
                    )}
                    {r.rejection_reason && (
                      <div className="text-[10px] text-rose-700 italic mt-0.5">
                        Note: {r.rejection_reason}
                      </div>
                    )}
                  </td>
                  <td className="p-2 border-r border-zinc-200 font-mono text-[11px] text-zinc-600">
                    {r.latitude && r.longitude ? (
                      <>
                        {Number(r.latitude).toFixed(4)},<br />
                        {Number(r.longitude).toFixed(4)}
                      </>
                    ) : (
                      <span className="text-zinc-400 italic">No GPS</span>
                    )}
                  </td>
                  <td className="p-2 border-r border-zinc-200 text-[11px]">
                    <span className="font-semibold text-zinc-800">
                      {r.profiles?.full_name || 'Citizen'}
                    </span>
                    {r.profiles?.phone_number && (
                      <span className="block font-mono text-[10px] text-zinc-500">
                        {r.profiles.phone_number}
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        r.status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status === 'accepted'
                        ? 'Dispatched'
                        : r.status === 'rejected'
                        ? 'Dismissed'
                        : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}

              {reports.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-zinc-500 text-xs">
                    No emergency incidents logged for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Official Signatory Certification Block */}
      <div className="pt-8 mt-8 border-t-2 border-zinc-900 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs font-sans">
        <div>
          <p className="text-zinc-500 text-[11px] mb-8 font-medium">Prepared &amp; Verified by:</p>
          <div className="border-b border-zinc-900 w-48 mb-1"></div>
          <p className="font-bold uppercase text-zinc-900">{preparedBy}</p>
          <p className="text-zinc-500 text-[11px]">MDRRMO Operations &amp; Intelligence Officer</p>
          <p className="text-zinc-400 text-[10px]">ResQTrack Automated Incident Mapping System</p>
        </div>

        <div className="sm:text-right">
          <p className="text-zinc-500 text-[11px] mb-8 font-medium">Approved &amp; Noted by:</p>
          <div className="border-b border-zinc-900 w-48 mb-1 sm:ml-auto"></div>
          <p className="font-bold uppercase text-zinc-900">MDRRMO Officer / Municipal Mayor</p>
          <p className="text-zinc-500 text-[11px]">Municipal Disaster Risk Reduction &amp; Management Council</p>
          <p className="text-zinc-400 text-[10px]">Municipality of Tarragona, Davao Oriental</p>
        </div>
      </div>
    </div>
  )
}
