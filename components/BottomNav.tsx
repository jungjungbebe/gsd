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

  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => {
        // 홈 = TONE CHECK. 기존 /service 화면에서도 홈 탭이 켜져 있도록 함께 인식
        const isActive = tab.id === 'home'
          ? pathname === '/tone-check' || pathname === '/service'
          : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.id}
            href={tab.href}
            onClick={() => {
              // 이미 홈(톤체크)에 있을 때 다시 누르면 처음 입력 화면으로 돌아감
              if (tab.id === 'home' && pathname === '/tone-check') {
                window.dispatchEvent(new Event('tutone:home'))
              }
            }}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.icon}>{tab.icon}</span>
            <span className={styles.label}>{tab.label}</span>
            {isActive && <span className={styles.dot} />}
          </Link>
        )
      })}
    </nav>
  )
}
