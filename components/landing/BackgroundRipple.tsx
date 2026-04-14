'use client'

import { motion } from 'framer-motion'

const RINGS = [
  { size: 300, delay: 0, duration: 6 },
  { size: 500, delay: 1.5, duration: 7 },
  { size: 700, delay: 3, duration: 8 },
  { size: 900, delay: 4.5, duration: 9 },
  { size: 1100, delay: 6, duration: 10 },
]

export default function BackgroundRipple() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {/* 중앙 글로우 */}
      <div style={{
        position: 'absolute',
        top: '35%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,160,240,0.12) 0%, rgba(170,240,209,0.06) 50%, transparent 70%)',
        filter: 'blur(40px)',
      }} />

      {/* 동심원 물결 */}
      {RINGS.map((ring, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{
            scale: [0.3, 1, 1.2],
            opacity: [0, 0.15, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: ring.duration,
            delay: ring.delay,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            top: '35%',
            left: '50%',
            width: ring.size,
            height: ring.size,
            marginLeft: -ring.size / 2,
            marginTop: -ring.size / 2,
            borderRadius: '50%',
            border: `1px solid`,
            borderImage: `linear-gradient(135deg, rgba(224,176,255,0.2), rgba(170,240,209,0.15)) 1`,
            borderImageSlice: 1,
          }}
        />
      ))}

      {/* 추가 라벤더 글로우 레이어 */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.14, 0.08] }}
        transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '30%',
          left: '45%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224,176,255,0.1) 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />

      {/* 민트 글로우 레이어 */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.1, 0.06] }}
        transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'absolute',
          top: '45%',
          left: '55%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(170,240,209,0.08) 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  )
}
