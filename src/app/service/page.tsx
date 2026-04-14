'use client'

import { useState, useEffect } from 'react'
import TranslatorOrb from '@/components/TranslatorOrb'
import TranslatorSection from '@/components/TranslatorSection'
import QuickMenu from '@/components/QuickMenu'
import CurationSection from '@/components/CurationSection'
import styles from './service.module.css'

export default function ServicePage() {
  const [splash, setSplash] = useState(true)
  const [phase, setPhase] = useState<'in' | 'out'>('in')
  const [orbActive, setOrbActive] = useState(true)
  const [show, setShow] = useState({ orb: false, translator: false, quick: false, curation: false })

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('out'), 1000)
    const t2 = setTimeout(() => {
      setSplash(false)
      setTimeout(() => setShow((s) => ({ ...s, orb: true })), 200)
      setTimeout(() => setShow((s) => ({ ...s, translator: true })), 600)
      setTimeout(() => setShow((s) => ({ ...s, quick: true })), 1000)
      setTimeout(() => setShow((s) => ({ ...s, curation: true })), 1400)
      setTimeout(() => setOrbActive(false), 2500)
    }, 3000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (splash) {
    return (
      <div className={`${styles.splash} ${phase === 'out' ? styles.splashOut : ''}`}>
        <div className={styles.splashContent}>
          <img src="/tutone-logo.svg" alt="Tutone" className={styles.splashLogo} />
          <span className={styles.splashBrand}>TUTONE</span>
        </div>
      </div>
    )
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <img src="/tutone-logo.svg" alt="Tutone" className={styles.logo} />
        <div className={styles.avatar}>U</div>
      </header>

      <div className={`${styles.fadeItem} ${show.orb ? styles.fadeIn : ''}`}>
        <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
          <TranslatorOrb isActive={orbActive} />
        </div>
      </div>

      <div className={`${styles.fadeItem} ${show.translator ? styles.fadeIn : ''}`}>
        <TranslatorSection />
      </div>

      <div className={`${styles.fadeItem} ${show.quick ? styles.fadeIn : ''}`}>
        <QuickMenu />
      </div>

      <div className={`${styles.fadeItem} ${show.curation ? styles.fadeIn : ''}`} id="curation">
        <CurationSection />
      </div>
    </main>
  )
}
