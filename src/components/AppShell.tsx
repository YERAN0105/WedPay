'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const tabs = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/expenses',
    label: 'Expenses',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
        <path d="M7 15h2" />
        <path d="M13 15h4" />
      </svg>
    ),
  },
  {
    href: '/contributions',
    label: 'Contribs',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21C12 21 3 14.5 3 9a4 4 0 0 1 7.74-1.5L12 9l1.26-1.5A4 4 0 0 1 21 9c0 5.5-9 12-9 12z" />
        <path d="M12 9v-5M9.5 6.5 12 4l2.5 2.5" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

const historyIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-stone-100 h-14 flex items-center px-4"
        style={{ boxShadow: '0 1px 8px 0 rgba(0,0,0,0.06)' }}
      >
        {/* Branded logo mark */}
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-7 h-7 rounded-lg bg-rose-700 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm leading-none">W</span>
          </div>
          <h1 className="text-lg font-bold text-stone-900 tracking-tight">WedPay</h1>
        </div>

        {/* Activity icon */}
        <button
          onClick={() => router.push('/activity')}
          className="w-10 h-10 flex items-center justify-center rounded-full text-stone-500 active:bg-stone-100 transition-colors"
          aria-label="View activity"
        >
          {historyIcon}
        </button>
      </header>

      {/* ── Scrollable content ── */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingTop: '3.5rem', paddingBottom: '4rem' }}
      >
        {children}
      </main>

      {/* ── Bottom tab bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-100 flex"
        style={{ boxShadow: '0 -1px 8px 0 rgba(0,0,0,0.06)' }}
        aria-label="Main navigation"
      >
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 min-h-[56px] transition-colors"
              aria-current={active ? 'page' : undefined}
            >
              {/* Pill behind active icon */}
              <span
                className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
                  active ? 'bg-rose-50' : ''
                }`}
              >
                <span className={active ? 'text-rose-700' : 'text-stone-400'}>
                  {tab.icon(active)}
                </span>
              </span>
              <span
                className={`text-[10px] font-semibold leading-tight tracking-wide ${
                  active ? 'text-rose-700' : 'text-stone-400'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
