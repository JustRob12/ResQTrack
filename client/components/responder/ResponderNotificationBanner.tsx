'use client'

import { useEffect, useRef } from 'react'
import { Bell, AlertTriangle, ArrowRight, X, Volume2 } from 'lucide-react'
import type { ReportItem } from '@/types/report'

interface ResponderNotificationBannerProps {
  latestApprovedReport: ReportItem | null
  onDismiss: () => void
  onRespond: (report: ReportItem) => void
}

export function ResponderNotificationBanner({
  latestApprovedReport,
  onDismiss,
  onRespond,
}: ResponderNotificationBannerProps) {
  const lastPlayedReportIdRef = useRef<string | null>(null)

  // Play audio chime using Web Audio API
  useEffect(() => {
    if (latestApprovedReport && lastPlayedReportIdRef.current !== latestApprovedReport.id) {
      lastPlayedReportIdRef.current = latestApprovedReport.id
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()

        osc.type = 'triangle'
        // Two-tone alert chime (880Hz -> 1174Hz)
        osc.frequency.setValueAtTime(880, audioCtx.currentTime)
        osc.frequency.setValueAtTime(1174, audioCtx.currentTime + 0.15)

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5)

        osc.connect(gain)
        gain.connect(audioCtx.destination)

        osc.start()
        osc.stop(audioCtx.currentTime + 0.5)
      } catch {
        // AudioContext may be blocked before user gesture
      }
    }
  }, [latestApprovedReport])

  if (!latestApprovedReport) return null

  return (
    <div className="fixed top-20 left-4 right-4 max-w-xl mx-auto z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-red-600 text-white p-4 rounded-2xl shadow-xl border border-red-500/50 flex items-start justify-between gap-3">
        <div className="p-2 bg-white/10 rounded-xl shrink-0 mt-0.5">
          <Bell className="w-5 h-5 text-white animate-bounce" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-100">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Emergency Dispatched by Admin</span>
            <Volume2 className="w-3.5 h-3.5 ml-auto opacity-75" />
          </div>

          <h4 className="text-sm font-bold text-white mt-1 truncate">
            {latestApprovedReport.title}
          </h4>

          <p className="text-xs text-red-100 mt-0.5 line-clamp-1">
            {latestApprovedReport.caption || 'New emergency requiring responder deployment.'}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => onRespond(latestApprovedReport)}
              className="px-3 py-1.5 rounded-lg bg-white text-red-600 hover:bg-red-50 active:bg-red-100 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>Accept &amp; Respond</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onDismiss}
              className="px-2.5 py-1.5 rounded-lg bg-red-700/60 hover:bg-red-700 text-white font-semibold text-xs transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-red-200 hover:text-white p-1 rounded-lg transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
