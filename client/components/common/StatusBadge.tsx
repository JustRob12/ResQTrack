import type { ReportStatus } from '@/types/report'

interface StatusBadgeProps {
  status: ReportStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'accepted') {
    return (
      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800">
        Responders Dispatched
      </span>
    )
  }

  if (status === 'rejected') {
    return (
      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-zinc-200 text-zinc-700">
        Rejected
      </span>
    )
  }

  return (
    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-100 text-amber-800">
      Pending Verification
    </span>
  )
}
