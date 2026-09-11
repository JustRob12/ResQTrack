'use client'

import { ShieldAlert, LogOut } from 'lucide-react'

interface HeaderProps {
  isAdmin: boolean
  signingOut: boolean
  onSignOut: () => void
}

export function Header({ isAdmin, signingOut, onSignOut }: HeaderProps) {
  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-red-600 text-white rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-red-600 tracking-tight">ResQTrack</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isAdmin ? 'bg-zinc-900 text-white' : 'bg-red-50 text-red-700'
                }`}
              >
                {isAdmin ? 'ADMINISTRATOR' : 'MDRRMO CITIZEN'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block">
              MDRRMO Tarragona, Davao Oriental
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSignOut}
            disabled={signingOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 text-xs sm:text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
