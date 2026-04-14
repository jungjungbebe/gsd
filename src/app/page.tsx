'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './splash.module.css'

export default function SplashPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')

  useEffect(() => {
    // 페이드인 0.8s → 유지 1.5s → 페이드아웃 0.6s → 이동
    const t1 = setTimeout(() => setPhase('hold'), 800)
    const t2 = setTimeout(() => setPhase('out'), 2300)
    const t3 = setTimeout(() => router.replace('/home'), 2900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [router])

  return (
    <div className={`${styles.splash} ${styles[phase]}`}>
      <div className={styles.content}>
        <img
          src="/tutone-logo.svg"
          alt="Tutone"
          className={styles.logo}
        />
        <span className={styles.brand}>TUTONE</span>
      </div>
    </div>
  )
}
