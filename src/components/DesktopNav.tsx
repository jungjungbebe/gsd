'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserAvatar } from '@/components/Avatar'
import styles from './DesktopNav.module.css'

const LINKS = [
  { href: '/tone-check', label: '톤체크', match: (p: string) => p === '/tone-check' || p === '/service' },
  { href: '/diagnosis', label: '진단', match: (p: string) => p.startsWith('/diagnosis') },
  { href: '/missions', label: '미션', badge: '모바일 전용', match: (p: string) => p.startsWith('/missions') },
  { href: '/my', label: 'MY', match: (p: string) => p.startsWith('/my') },
]

export default function DesktopNav() {
  const pathname = usePathname()

  // PC에서는 화면 폭에 비례해 전체 요소를 키워 화면을 꽉 채운다 (기준 960px, 최대 2배)
  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const ds = w >= 1024 ? Math.min(2, Math.max(1, Math.min(w / 960, h / 830))) : 1
      const root = document.documentElement.style
      root.setProperty('--ds', ds.toFixed(3))
      // 확대 후 실제로 보이는 화면 높이(상단 메뉴 제외)
      root.setProperty('--eh', `${Math.max(560, h / ds - 68).toFixed(0)}px`)
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [])
  if (pathname === '/' || pathname === '/home') return null
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <Link href="/tone-check" aria-label="투톤 홈">
          <img src="/tutone-logo.svg" alt="투톤" className={styles.logo} />
        </Link>
        <nav className={styles.links}>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`${styles.link} ${l.match(pathname) ? styles.active : ''}`}>
              {l.label}
              {l.badge && <span className={styles.badge}>{l.badge}</span>}
            </Link>
          ))}
        </nav>
        <Link href="/my" className={styles.avatar} aria-label="MY">
          <UserAvatar fallback="U" />
        </Link>
      </div>
    </header>
  )
}
