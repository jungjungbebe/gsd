'use client'

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
