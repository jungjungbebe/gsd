'use client'

import { motion } from 'framer-motion'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 20 } },
}

export default function LandingCTA() {
  return (
    <motion.section
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      style={{
        padding: '100px 24px 120px',
        textAlign: 'center',
        maxWidth: 700,
        margin: '0 auto',
      }}
    >
      <motion.div
        variants={item}
        style={{
          width: 32,
          height: 1,
          background: 'rgba(160,120,220,0.4)',
          margin: '0 auto 32px',
        }}
      />

      <motion.h2
        variants={item}
        style={{
          fontSize: 'clamp(26px, 4vw, 40px)',
          fontWeight: 300,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          lineHeight: 1.3,
          marginBottom: 16,
        }}
      >
        &ldquo;오늘까지 해주세요&rdquo;를<br />
        격식 있게 바꿔보세요
      </motion.h2>

      <motion.p
        variants={item}
        style={{
          fontSize: 16,
          fontWeight: 300,
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
          marginBottom: 40,
        }}
      >
        Link가 당신의 비즈니스 커뮤니케이션을 한 단계 높여드립니다.
      </motion.p>

      <motion.a
        variants={item}
        href="/service"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        style={{
          display: 'inline-block',
          padding: '18px 56px',
          fontSize: 16,
          fontWeight: 400,
          color: '#fff',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '0.5px solid rgba(255,255,255,0.35)',
          borderRadius: 999,
          textDecoration: 'none',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.1), 0 8px 32px rgba(160,120,200,0.15)',
          letterSpacing: '0.02em',
        }}
      >
        무료로 시작하기
      </motion.a>

      <motion.p
        variants={item}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 20,
          letterSpacing: '0.05em',
        }}
      >
        가입 없이 바로 사용 가능
      </motion.p>
    </motion.section>
  )
}
