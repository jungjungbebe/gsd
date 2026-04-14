'use client'

import { motion } from 'framer-motion'
import TranslatorOrb from '@/components/TranslatorOrb'

// 단어별 순차 등장
const wordVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 80, damping: 18, delay: 0.8 + i * 0.15 },
  }),
}

export default function LandingHero() {
  const words = [
    { text: 'Two', italic: false },
    { text: 'Tone,', italic: true },
    { text: 'One', italic: false },
    { text: 'Connection.', italic: true },
  ]

  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 24px 20px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      gap: 0,
    }}>
      {/* 배경 글로우 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        style={{
          position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(160,120,220,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* 서브카피 — 상단 고정 */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        style={{
          position: 'absolute',
          top: 160,
          left: 0,
          right: 0,
          margin: '0 auto',
          fontFamily: "'Pretendard Variable', 'Inter', sans-serif",
          fontSize: 'clamp(14px, 2vw, 17px)', fontWeight: 300,
          color: 'var(--text-secondary)', lineHeight: 1.7,
          maxWidth: 480, letterSpacing: '-0.01em',
          textAlign: 'center',
          zIndex: 20,
        }}
      >
        Brand Insight x AI Logic.<br />
        두 가지 톤이 만나 완성되는 하이엔드 솔루션.
      </motion.p>

      {/* ① 슬로건 — 극단적 크기 */}
      <div style={{
        position: 'relative', zIndex: 20,
        marginBottom: 48,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center',
        width: '100%',
      }}>
        {/* 첫 줄: Two Tone, */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.15em' }}>
          {words.slice(0, 2).map((w, i) => (
            <motion.span
              key={w.text}
              custom={i}
              initial="hidden"
              animate="show"
              variants={wordVariants}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(69px, 12vw, 124px)',
                fontWeight: 500,
                fontStyle: w.italic ? 'italic' : 'normal',
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
                color: '#1a1520',
                filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.1))',
                display: 'inline-block',
              }}
            >
              {w.text}
            </motion.span>
          ))}
        </div>
        {/* 둘째 줄: One Connection. */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.15em' }}>
          {words.slice(2, 4).map((w, i) => (
            <motion.span
              key={w.text}
              custom={i + 2}
              initial="hidden"
              animate="show"
              variants={wordVariants}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(69px, 12vw, 124px)',
                fontWeight: 500,
                fontStyle: w.italic ? 'italic' : 'normal',
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
                color: '#1a1520',
                filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.1))',
                display: 'inline-block',
              }}
            >
              {w.text}
            </motion.span>
          ))}
        </div>
      </div>

      {/* ② 오브 — 가장 먼저 등장 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 50, damping: 18, duration: 1.2, delay: 0.1 }}
        style={{ position: 'relative', zIndex: 10, marginBottom: 32 }}
      >
        <motion.div
          whileHover={{ scale: 1.03, filter: 'drop-shadow(0 16px 48px rgba(160,120,220,0.4))' }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <TranslatorOrb isActive={false} size={280} />
        </motion.div>
      </motion.div>


      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <motion.a
          href="/service"
          whileHover={{ scale: 1.04, boxShadow: '0 12px 40px rgba(160,120,200,0.25)' }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          style={{
            display: 'inline-block', padding: '14px 44px', fontSize: 15, fontWeight: 400,
            color: '#fff', background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '0.5px solid rgba(255,255,255,0.25)', borderRadius: 999,
            textDecoration: 'none',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.25), 0 8px 32px rgba(160,120,200,0.12)',
            letterSpacing: '0.02em',
          }}
        >
          체험하기 →
        </motion.a>
      </motion.div>

      {/* 스크롤 인디케이터 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 2.5 }}
        style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)' }}
      >
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>
          <svg width="20" height="28" viewBox="0 0 20 28" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
            <rect x="1" y="1" width="18" height="26" rx="9" />
            <circle cx="10" cy="8" r="2" fill="var(--text-muted)">
              <animate attributeName="cy" values="8;18;8" dur="2s" repeatCount="indefinite" />
            </circle>
          </svg>
        </motion.div>
      </motion.div>
    </section>
  )
}
