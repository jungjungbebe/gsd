'use client'

import Link from 'next/link'
import styles from './QuickMenu.module.css'

const ITEMS = [
  {
    label: '필사하기\n좋은 곳',
    action: 'scroll' as const,
    target: 'curation',
    glow: 'rgba(160,120,220,0.3)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    ),
  },
  {
    label: '신조어\n퀴즈',
    action: 'link' as const,
    target: '/diagnosis',
    glow: 'rgba(220,120,80,0.3)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    label: '내 문해력\n테스트',
    action: 'link' as const,
    target: '/diagnosis',
    glow: 'rgba(80,160,140,0.3)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
      </svg>
    ),
  },
]

export default function QuickMenu() {
  function handleScroll(target: string) {
    const el = document.getElementById(target)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className={styles.scroll}>
      {ITEMS.map((item) =>
        item.action === 'link' ? (
          <Link key={item.label} href={item.target} className={styles.card}>
            <div className={styles.iconWrap} style={{ background: `radial-gradient(circle, ${item.glow} 0%, rgba(255,255,255,0.15) 70%)` }}>
              {item.icon}
            </div>
            <span className={styles.label}>{item.label}</span>
          </Link>
        ) : (
          <button key={item.label} className={styles.card} onClick={() => handleScroll(item.target)}>
            <div className={styles.iconWrap} style={{ background: `radial-gradient(circle, ${item.glow} 0%, rgba(255,255,255,0.15) 70%)` }}>
              {item.icon}
            </div>
            <span className={styles.label}>{item.label}</span>
          </button>
        )
      )}
    </div>
  )
}
