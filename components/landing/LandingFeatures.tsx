'use client'

import { motion, useMotionValue, useTransform, useSpring, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

const features = [
  { icon: '🔄', title: '실시간 비즈니스 번역', desc: '일상어를 입력하면 관계·용도·격식도에 맞는 비즈니스 표현으로 즉시 변환합니다.', stat: 180, suffix: '+', label: '변환 패턴' },
  { icon: '🎯', title: '함정 어휘 감지', desc: '"금일"이 금요일이 아닌 것처럼, 혼동하기 쉬운 비즈니스 한자어를 자동으로 짚어줍니다.', stat: 7, suffix: '개', label: '감지 어휘' },
  { icon: '📊', title: '프로페셔널 스코어', desc: '격식도·정중함·명확성을 분석해 당신의 비즈니스 커뮤니케이션 수준을 점수화합니다.', stat: 100, suffix: '점', label: '만점 기준' },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.2 } },
}

const cardVariant = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 80, damping: 20 } },
}

const innerStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}

const innerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 18 } },
}

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 1500
    const step = Math.ceil(target / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= target) { start = target; clearInterval(timer) }
      setCount(start)
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target])

  return <span ref={ref}>{count}{suffix}</span>
}

function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-150, 150], [6, -6]), { stiffness: 200, damping: 20 })
  const ry = useSpring(useTransform(mx, [-150, 150], [-6, 6]), { stiffness: 200, damping: 20 })

  function onMove(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    mx.set(e.clientX - r.left - r.width / 2)
    my.set(e.clientY - r.top - r.height / 2)
  }

  return (
    <motion.div
      ref={ref}
      variants={cardVariant}
      onMouseMove={onMove}
      onMouseLeave={() => { mx.set(0); my.set(0) }}
      whileHover={{ y: -6, boxShadow: '0 12px 40px rgba(160,120,200,0.18)' }}
      style={{
        rotateX: rx, rotateY: ry, perspective: 600,
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '0.5px solid rgba(255,255,255,0.25)',
        borderRadius: 20, padding: '36px 28px',
        boxShadow: '0 4px 24px rgba(160,120,200,0.08), inset 0 1px 0 rgba(255,255,255,0.3)',
        cursor: 'default',
      }}
    >
      {children}
    </motion.div>
  )
}

export default function LandingFeatures() {
  return (
    <motion.section
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      style={{ padding: '20px 24px 80px', maxWidth: 1000, margin: '-60px auto 0' }}
    >

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {features.map((f) => (
          <TiltCard key={f.title}>
            <motion.div variants={innerStagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <motion.div variants={innerItem} style={{ fontSize: 32, marginBottom: 16 }}>
                {f.icon}
              </motion.div>
              <motion.h3 variants={innerItem} style={{
                fontSize: 18, fontWeight: 400, color: 'var(--text-primary)',
                letterSpacing: '-0.01em', marginBottom: 10,
              }}>
                {f.title}
              </motion.h3>
              <motion.p variants={innerItem} style={{
                fontSize: 14, fontWeight: 300, color: 'var(--text-secondary)',
                lineHeight: 1.7, marginBottom: 20,
              }}>
                {f.desc}
              </motion.p>
              <motion.div variants={innerItem} style={{
                display: 'flex', alignItems: 'baseline', gap: 6,
                paddingTop: 16, borderTop: '0.5px solid rgba(255,255,255,0.15)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 400,
                  color: 'var(--text-primary)', letterSpacing: '-0.02em',
                }}>
                  <CountUp target={f.stat} suffix={f.suffix} />
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                }}>
                  {f.label}
                </span>
              </motion.div>
            </motion.div>
          </TiltCard>
        ))}
      </div>
    </motion.section>
  )
}
