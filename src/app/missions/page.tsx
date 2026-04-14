'use client'

import { useState, useRef } from 'react'
import KakaoMap from '@/components/KakaoMap'
import styles from './missions.module.css'

const MISSIONS = [
  {
    id: 'pilsa',
    eyebrow: 'DAILY WRITING',
    title: '필사 미션',
    desc: '비즈니스 쿠션어를 따라 쓰며\n표현력을 키워보세요',
    detail: '오늘의 문장 · 쿠션어',
    gradient: 'linear-gradient(160deg, rgba(200,170,220,0.15) 0%, rgba(255,255,255,0.05) 100%)',
    accent: 'rgba(160,120,220,0.6)',
    glow: 'radial-gradient(circle at 50% 30%, rgba(181, 167, 143, 0.2) 0%, transparent 60%)',
  },
  {
    id: 'hunt',
    eyebrow: 'EXPLORE',
    title: '단어 사냥',
    desc: '거리의 간판과 안내문에서\n한자어를 찾아 인증하세요',
    detail: '오늘의 단어 · 검토(檢討)',
    gradient: 'linear-gradient(160deg, rgba(220,180,160,0.15) 0%, rgba(255,255,255,0.05) 100%)',
    accent: '#fac775',
    glow: 'radial-gradient(circle at 50% 30%, rgba(250, 199, 117, 0.25) 0%, transparent 60%)',
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

export default function MissionsPage() {
  const [view, setView] = useState<'slider' | 'hunt'>('slider')
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  function handleScroll() {
    if (!scrollRef.current) return
    const { scrollLeft, clientWidth } = scrollRef.current
    const index = Math.round(scrollLeft / clientWidth)
    setActiveIndex(index)
  }

  function handleCardClick(id: string) {
    if (id === 'hunt') setView('hunt')
    else alert('준비 중입니다')
  }

  if (view === 'hunt') {
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
        <KakaoMap />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <span className={styles.headerEyebrow}>MISSIONS</span>
        <h1 className={styles.headerTitle}>오늘의 미션</h1>
      </div>

      {/* 풀스크린 슬라이더 */}
      <div
        ref={scrollRef}
        className={styles.slider}
        onScroll={handleScroll}
      >
        {MISSIONS.map((m) => (
          <div key={m.id} className={styles.slide}>
            <button
              className={styles.card}
              onClick={() => handleCardClick(m.id)}
            >
              {/* 상단 60% 이미지 영역 */}
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

              {/* 하단 40% 텍스트 영역 */}
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

      {/* 인디케이터 */}
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
