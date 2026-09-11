'use client'

import { Home as HomeIcon, AlertTriangle, PhoneCall } from 'lucide-react'

export type CitizenTab = 'home' | 'report' | 'contacts'

interface BottomNavProps {
  activeTab: CitizenTab
  onSelectTab: (tab: CitizenTab) => void
}

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  return (
    <nav className="sm:hidden fixed bottom-4 left-4 right-4 max-w-sm mx-auto z-40">
      <div className="bg-white/95 backdrop-blur-md border border-zinc-200 rounded-full shadow-lg p-1.5 flex items-center justify-around">
        {/* 1. Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
            activeTab === 'home' ? 'text-red-600 bg-red-50' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <HomeIcon className="w-5 h-5" />
          <span>Home</span>
        </button>

        {/* 2. Main Report Button (Highlighted center) */}
        <button
          onClick={() => onSelectTab('report')}
          className={`flex flex-col items-center justify-center px-5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
            activeTab === 'report' ? 'bg-red-600 text-white shadow-xs' : 'text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
          <span>Report</span>
        </button>

        {/* 3. Emergency Contacts */}
        <button
          onClick={() => onSelectTab('contacts')}
          className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
            activeTab === 'contacts' ? 'text-red-600 bg-red-50' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <PhoneCall className="w-5 h-5" />
          <span>Contacts</span>
        </button>
      </div>
    </nav>
  )
}
