'use client'

import { useState, useEffect } from 'react'
import TranslatorOrb from '@/components/TranslatorOrb'
import TranslatorSection from '@/components/TranslatorSection'
import QuickMenu from '@/components/QuickMenu'
import CurationSection from '@/components/CurationSection'
import styles from './home.module.css'

export default function HomePage() {
  const [orbActive, setOrbActive] = useState(true)

  // 인삿말 시퀀스 동안 Orb 활성화 (2.5초)
  useEffect(() => {
    const timer = setTimeout(() => setOrbActive(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <img src="/tutone-logo.svg" alt="Tutone" className={styles.logo} />
        <div className={styles.avatar}>U</div>
      </header>

      <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
        <TranslatorOrb isActive={orbActive} />
      </div>

      <TranslatorSection />
      <QuickMenu />
      <div id="curation">
        <CurationSection />
      </div>
    </main>
  )
}
