'use client'

import { useEffect, useState, useRef } from 'react'
import ThemeCycle from '@/components/ThemeCycle'
import ComingSoon from '@/components/ComingSoon'
import styles from './missions.module.css'
import { ThemeRecord, loadThemeRecord } from '@/lib/themeRecord'

const THEME_META = { korean: '전환', hanja: '轉換' }

const MISSIONS = [
  {
    id: 'hunt',
    eyebrow: 'EXPLORE',
    title: '단어 사냥',
    desc: '오늘의 테마를 도시에서 발견하고\n나만의 시선으로 기록해보세요',
    detail: '오늘의 테마 · 전환(轉換) →',
    gradient: 'linear-gradient(160deg, rgba(220,180,160,0.15) 0%, rgba(255,255,255,0.05) 100%)',
    accent: '#fac775',
    glow: 'radial-gradient(circle at 50% 30%, rgba(250, 199, 117, 0.25) 0%, transparent 60%)',
  },
  {
    id: 'write',
    eyebrow: 'WRITE',
    title: '필사 스팟',
    desc: '장소와 연결된 오늘의 문장을\n손으로 직접 쓰고 기록해보세요',
    detail: '오늘의 테마 · 전환(轉換) →',
    gradient: 'linear-gradient(160deg, rgba(190,170,220,0.15) 0%, rgba(255,255,255,0.05) 100%)',
    accent: '#b8a8ff',
    glow: 'radial-gradient(circle at 50% 30%, rgba(184, 168, 255, 0.25) 0%, transparent 60%)',
  },
  {
    id: 'create',
    eyebrow: 'CREATIVE',
    title: '문장 창작',
    desc: '주어진 단어를 활용해\n나만의 비즈니스 문장을 만드세요',
    detail: '오늘의 키워드 3개',
    gradient: 'linear-gradient(160deg, rgba(160,210,190,0.15) 0%, rgba(255,255,255,0.05) 100%)',
    accent: '#5dcaa5',
    glow: 'radial-gradient(circle at 50% 30%, rgba(93, 202, 165, 0.25) 0%, transparent 60%)',
  },
  {
    id: 'trap',
    eyebrow: 'CHALLENGE',
    title: '언어 함정',
    desc: '헷갈리는 표현 속에서\n정확한 의미를 골라내세요',
    detail: '3문제 · 30초 제한',
    gradient: 'linear-gradient(160deg, rgba(160,180,220,0.15) 0%, rgba(255,255,255,0.05) 100%)',
    accent: '#60a5fa',
    glow: 'radial-gradient(circle at 50% 30%, rgba(96, 165, 250, 0.25) 0%, transparent 60%)',
  },
]

const CONTENT_READY: Record<string, boolean> = {
  hunt: true,
  write: true,
  create: false,
  trap: false,
}

type View = 'slider' | 'theme' | 'coming-soon'

export default function MissionsPage() {
  const [view, setView] = useState<View>('slider')
  const [activeIndex, setActiveIndex] = useState(0)
  const [initialStage, setInitialStage] = useState<'hunt' | 'write'>('hunt')
  const [record, setRecord] = useState<ThemeRecord>({ hunt: false, write: false })
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setRecord(loadThemeRecord())
  }, [view])

  function handleScroll() {
    if (!scrollRef.current) return
    const { scrollLeft, clientWidth } = scrollRef.current
    const index = Math.round(scrollLeft / clientWidth)
    setActiveIndex(index)
  }

  function handleCardClick(id: string) {
    if (!CONTENT_READY[id]) {
      setView('coming-soon')
      return
    }
    if (id === 'hunt' || id === 'write') {
      setInitialStage(id)
      setView('theme')
    }
  }

  if (view !== 'slider') {
    return (
      <div className={styles.page}>
        <div className={styles.backBar}>
          <button className={styles.backBtn} onClick={() => setView('slider')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 12H5m0 0l7 7m-7-7l7-7" />
            </svg>
            미션 목록
          </button>
        </div>
        {view === 'theme' && <ThemeCycle initialStage={initialStage} onClose={() => setView('slider')} />}
        {view === 'coming-soon' && <ComingSoon />}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.headerEyebrow}>MISSIONS</span>
        <h1 className={styles.headerTitle}>오늘의 미션</h1>
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <span className="label-mono">TODAY'S THEME · {THEME_META.korean} {THEME_META.hanja}</span>
        <div style={{ marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)' }}>
          두 가지 방식으로 오늘의 단어를 경험해보세요.
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-purple)', letterSpacing: '0.08em' }}>
          EXPLORE {record.hunt ? 1 : 0}/1 · WRITE {record.write ? 1 : 0}/1
        </div>
      </div>

      <div ref={scrollRef} className={styles.slider} onScroll={handleScroll}>
        {MISSIONS.map((m) => (
          <div key={m.id} className={styles.slide}>
            <button className={styles.card} onClick={() => handleCardClick(m.id)}>
              <div className={styles.cardVisual} style={{ background: m.gradient }}>
                <div className={styles.cardGlow} style={{ background: m.glow }} />
                <div className={styles.cardGrid} />
                <div className={styles.cardIconArea}>
                  <div className={styles.cardIconRing} style={{ borderColor: `${m.accent}66` }}>
                    <div className={styles.cardIconDot} style={{ background: m.accent, boxShadow: `0 0 20px ${m.accent}80` }} />
                  </div>
                </div>
                <span className={styles.cardEyebrow} style={{ color: m.accent }}>{m.eyebrow}</span>
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{m.title}</h3>
                <p className={styles.cardDesc}>{m.desc}</p>
                <div className={styles.cardFooter}>
                  <span className={styles.cardDetail} style={{ color: m.accent }}>{m.detail}</span>
                  <span className={styles.cardArrow} style={{ color: m.accent }}>→</span>
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>

      <div className={styles.dots}>
        {MISSIONS.map((m, i) => (
          <div
            key={m.id}
            className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
            style={i === activeIndex ? { background: MISSIONS[activeIndex].accent } : undefined}
          />
        ))}
      </div>
    </div>
  )
}
