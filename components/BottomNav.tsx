'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './BottomNav.module.css'

const TABS = [
  {
    id: 'home', href: '/tone-check', label: '홈',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'diagnose', href: '/diagnosis', label: '진단',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    id: 'mission', href: '/missions', label: '미션',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    id: 'my', href: '/my', label: 'MY',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  // 랜딩/스플래시에서는 숨김
  if (pathname === '/' || pathname === '/home') return null

  const isActive = (id: string, href: string) =>
    id === 'home' ? pathname === '/tone-check' || pathname === '/service' : pathname.startsWith(href)
  const byId = (id: string) => TABS.find((t) => t.id === id)!

  const renderTab = (id: string, extra = '') => {
    const tab = byId(id)
    const active = isActive(tab.id, tab.href)
    return (
      <Link
        key={tab.id}
        href={tab.href}
        aria-label={tab.label}
        aria-current={active ? 'page' : undefined}
        onClick={() => {
          // 이미 홈(톤체크)에 있을 때 다시 누르면 처음 입력 화면으로 돌아감
          if (tab.id === 'home' && pathname === '/tone-check') {
            window.dispatchEvent(new Event('tutone:home'))
          }
        }}
        className={`${styles.tab} ${extra} ${active ? styles.active : ''}`}
      >
        <span className={styles.icon}>{tab.icon}</span>
        {tab.id !== 'home' && <span className={styles.label}>{tab.label}</span>}
      </Link>
    )
  }

  // 진단 · 미션은 왼쪽, 홈은 정중앙, MY는 오른쪽 넓은 영역
  return (
    <nav className={styles.nav}>
      <div className={styles.bar}>
        {renderTab('diagnose')}
        {renderTab('mission')}
        {renderTab('home', styles.home)}
        {renderTab('my', styles.wide)}
      </div>
    </nav>
  )
}
