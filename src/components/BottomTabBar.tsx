'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    href: '/',
    label: '홈',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#7c5cfc' : 'none'} stroke={active ? '#7c5cfc' : '#3a3a38'} strokeWidth="1.5">
        <path d="M3 12l9-8 9 8" />
        <path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
      </svg>
    ),
  },
  {
    href: '/diagnosis',
    label: '진단',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#7c5cfc' : '#3a3a38'} strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    href: '/missions',
    label: '미션',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#7c5cfc' : '#3a3a38'} strokeWidth="1.5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/community',
    label: '커뮤니티',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#7c5cfc' : '#3a3a38'} strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
]

export default function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      style={{ background: 'var(--glass-bg)', borderTop: '1px solid var(--border-subtle)' }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around py-1.5">
        {TABS.map((tab) => {
          const isActive = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-0.5 px-5 py-1.5"
            >
              {tab.icon(isActive)}
              <span
                className="text-[10px] tracking-[0.02em]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: isActive ? 'var(--purple-500)' : 'var(--text-muted)',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
