'use client'

import { Radio, Map, CheckCheck, Shield } from 'lucide-react'

export type ResponderTab = 'dispatches' | 'map' | 'resolved' | 'profile'

interface ResponderNavProps {
  activeTab: ResponderTab
  activeCount: number
  resolvedCount: number
  onTabChange: (tab: ResponderTab) => void
}

export function ResponderNav({
  activeTab,
  activeCount,
  resolvedCount,
  onTabChange,
}: ResponderNavProps) {
  const tabs = [
    {
      id: 'dispatches' as ResponderTab,
      label: 'Dispatched Missions',
      shortLabel: 'Missions',
      icon: Radio,
      badge: activeCount > 0 ? activeCount : undefined,
    },
    {
      id: 'map' as ResponderTab,
      label: 'Live Tracking Map',
      shortLabel: 'Live Map',
      icon: Map,
    },
    {
      id: 'resolved' as ResponderTab,
      label: 'Resolved Operations',
      shortLabel: 'History',
      icon: CheckCheck,
      badge: resolvedCount > 0 ? resolvedCount : undefined,
    },
    {
      id: 'profile' as ResponderTab,
      label: 'Unit Status',
      shortLabel: 'Status',
      icon: Shield,
    },
  ]

  return (
    <>
      {/* 1. Desktop & Tablet Top Sticky Sub-Navigation */}
      <nav className="hidden sm:block bg-white border-b border-zinc-200 sticky top-16 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 py-2.5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                        isActive ? 'bg-white text-red-600' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* 2. Mobile Floating Bottom Pill Navigation */}
      <nav
        aria-label="Responder Mobile Navigation"
        className="sm:hidden fixed bottom-4 left-3 right-3 max-w-sm mx-auto z-40"
      >
        <div className="bg-white/95 backdrop-blur-md border border-zinc-200 rounded-full shadow-xl p-1.5 flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all ${
                  isActive
                    ? 'text-red-600 bg-red-50 font-bold'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 px-1 py-0.2 min-w-[14px] h-[14px] rounded-full bg-red-600 text-white text-[8px] font-extrabold flex items-center justify-center shadow-xs">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="mt-0.5">{tab.shortLabel}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
