import { ShieldAlert } from 'lucide-react'

export function AuthHeader() {
  return (
    <header className="w-full max-w-md mx-auto text-center pt-4 pb-2">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold uppercase tracking-wider mb-4">
        <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
        MDRRMO Tarragona Portal
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-red-600">
        ResQTrack
      </h1>
      <p className="mt-2 text-xs sm:text-sm font-medium text-zinc-600 leading-relaxed max-w-sm mx-auto">
        An Emergency Response Information and Incident Mapping System
        <span className="block font-semibold text-zinc-800">
          for MDRRMO Tarragona, Davao Oriental
        </span>
      </p>
    </header>
  )
}
