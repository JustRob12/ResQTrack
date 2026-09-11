'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Radio, Map, BarChart3, FileText } from 'lucide-react'

interface AdminNavProps {
  pendingCount?: number
}

export function AdminNav({ pendingCount }: AdminNavProps) {
  const pathname = usePathname()

  const tabs = [
    {
      name: 'Incident Dispatch',
      shortName: 'Dispatch',
      href: '/admin',
      icon: Radio,
      exact: true,
      badge: pendingCount && pendingCount > 0 ? pendingCount : undefined,
    },
    {
      name: 'Mapping & Heatmap',
      shortName: 'Map',
      href: '/admin/map',
      icon: Map,
      exact: false,
    },
    {
      name: 'Descriptive Analytics',
      shortName: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      exact: false,
    },
    {
      name: 'PDRRMO Reports',
      shortName: 'Reports',
      href: '/admin/reports',
      icon: FileText,
      exact: false,
    },
  ]

  const isActive = (tabHref: string, exact: boolean) => {
    if (exact) {
      return pathname === tabHref
    }
    return pathname.startsWith(tabHref)
  }

  return (
    <>
      {/* 1. Desktop & Tablet Top Sticky Sub-Navigation (Hidden on Mobile & Print) */}
      <nav className="hidden sm:block bg-white border-b border-zinc-200 sticky top-16 z-20 shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 py-2.5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = isActive(tab.href, tab.exact)

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-zinc-500'}`} />
                  <span>{tab.name}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                        active ? 'bg-white text-red-600' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* 2. Mobile Floating Bottom Pill Navigation (Visible on Mobile only, Hidden on Print) */}
      <nav
        aria-label="Admin Mobile Navigation"
        className="sm:hidden fixed bottom-4 left-3 right-3 max-w-sm mx-auto z-40 print:hidden"
      >
        <div className="bg-white/95 backdrop-blur-md border border-zinc-200 rounded-full shadow-lg p-1.5 flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = isActive(tab.href, tab.exact)

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex flex-col items-center justify-center px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all ${
                  active
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
                <span className="mt-0.5">{tab.shortName}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
