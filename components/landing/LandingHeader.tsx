'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const NAV_ITEMS = [
  { label: 'About', href: '#features' },
  { label: 'Feature', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' },
]

// 프레넬 유리 — 공통 스타일
const fresnelGlass: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  border: 'none',
  boxShadow: [
    // 프레넬 상단/좌측 밝은 빛
    'inset 1px 1px 0 rgba(255, 255, 255, 0.35)',
    // 프레넬 하단/우측 어두운 그림자
    'inset -1px -1px 0 rgba(0, 0, 0, 0.08)',
    // 외부 글로우
    '0 8px 32px rgba(0, 0, 0, 0.06)',
  ].join(', '),
}

// 글로시 오버레이 — linear-gradient
const glossyOverlay = 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 40%, transparent 60%)'

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      {/* ── 데스크탑: 삼분할 ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
        className="landing-header-desktop"
        style={{
          position: 'fixed',
          top: 24,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
        }}
      >
        {/* 좌측: Log in + Start Now */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/login" style={{
            position: 'relative',
            fontSize: 14,
            fontWeight: 400,
            color: 'var(--text-primary)',
            textDecoration: 'none',
            padding: '10px 26px',
            borderRadius: 999,
            ...fresnelGlass,
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
              e.currentTarget.style.boxShadow = 'inset 1px 1px 0 rgba(255,255,255,0.45), inset -1px -1px 0 rgba(0,0,0,0.1), 0 12px 40px rgba(0,0,0,0.1)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.boxShadow = fresnelGlass.boxShadow as string
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {/* 글로시 오버레이 */}
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 999,
              background: glossyOverlay, pointerEvents: 'none',
            }} />
            <span style={{ position: 'relative', zIndex: 1 }}>Log in</span>
          </Link>

          <Link href="/tone-check" style={{
            position: 'relative',
            fontSize: 14,
            fontWeight: 500,
            color: '#fff',
            textDecoration: 'none',
            padding: '10px 28px',
            borderRadius: 999,
            background: 'rgba(139, 92, 246, 0.15)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            boxShadow: [
              'inset 1px 1px 0 rgba(255,255,255,0.3)',
              'inset -1px -1px 0 rgba(0,0,0,0.1)',
              '0 0 20px rgba(139, 92, 246, 0.3)',
              '0 8px 32px rgba(139, 92, 246, 0.15)',
            ].join(', '),
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)'
              e.currentTarget.style.boxShadow = 'inset 1px 1px 0 rgba(255,255,255,0.4), inset -1px -1px 0 rgba(0,0,0,0.1), 0 0 30px rgba(139,92,246,0.45), 0 12px 40px rgba(139,92,246,0.2)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'
              e.currentTarget.style.boxShadow = 'inset 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 0 rgba(0,0,0,0.1), 0 0 20px rgba(139,92,246,0.3), 0 8px 32px rgba(139,92,246,0.15)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 999,
              background: glossyOverlay, pointerEvents: 'none',
            }} />
            <span style={{ position: 'relative', zIndex: 1 }}>Start Now</span>
          </Link>
        </div>

        {/* 중앙: 알약 메뉴바 */}
        <nav style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 8px',
          borderRadius: 999,
          ...fresnelGlass,
          overflow: 'hidden',
        }}>
          {/* 글로시 오버레이 */}
          <span style={{
            position: 'absolute', inset: 0, borderRadius: 999,
            background: glossyOverlay, pointerEvents: 'none', zIndex: 0,
          }} />
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              style={{
                position: 'relative',
                zIndex: 1,
                fontSize: 14,
                fontWeight: 300,
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                padding: '8px 22px',
                borderRadius: 999,
                transition: 'all 0.25s ease',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* 우측: 로고 */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 22px 8px 14px',
            borderRadius: 999,
            ...fresnelGlass,
            overflow: 'hidden',
            transition: 'all 0.3s ease',
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 999,
              background: glossyOverlay, pointerEvents: 'none',
            }} />
            <img src="/tutone-logo.svg" alt="Link" style={{ height: 22, width: 'auto', opacity: 0.8, position: 'relative', zIndex: 1 }} />
            <span style={{
              fontSize: 17, fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '-0.03em', position: 'relative', zIndex: 1,
            }}>
              Link
            </span>
          </div>
        </Link>
      </motion.div>

      {/* ── 모바일 헤더 ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
        className="landing-header-mobile"
        style={{
          display: 'none',
          position: 'fixed',
          top: 16, left: 16, right: 16,
          zIndex: 100,
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 8px 8px 20px',
          borderRadius: 999,
          ...fresnelGlass,
          overflow: 'hidden',
        }}
      >
        <span style={{
          position: 'absolute', inset: 0, borderRadius: 999,
          background: glossyOverlay, pointerEvents: 'none',
        }} />
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', position: 'relative', zIndex: 1 }}>
          Link
        </span>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            position: 'relative', zIndex: 1,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '0.5px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 12, width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-primary)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {menuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </motion.div>

      {/* 모바일 드로어 */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="landing-mobile-menu"
            style={{
              position: 'fixed', top: 80, left: 16, right: 16, zIndex: 99,
              ...fresnelGlass,
              borderRadius: 24, padding: 16,
              display: 'flex', flexDirection: 'column', gap: 4,
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.12), inset 1px 1px 0 rgba(255,255,255,0.3)',
              overflow: 'hidden',
            }}
          >
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 24,
              background: glossyOverlay, pointerEvents: 'none',
            }} />
            {NAV_ITEMS.map((item) => (
              <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)}
                style={{ position: 'relative', zIndex: 1, fontSize: 16, fontWeight: 300, color: 'var(--text-secondary)', textDecoration: 'none', padding: '14px 20px', borderRadius: 14 }}>
                {item.label}
              </a>
            ))}
            <div style={{ position: 'relative', zIndex: 1, height: 1, background: 'rgba(255,255,255,0.1)', margin: '6px 0' }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 8 }}>
              <Link href="/login" onClick={() => setMenuOpen(false)}
                style={{
                  flex: 1, fontSize: 15, fontWeight: 400, color: 'var(--text-primary)',
                  textDecoration: 'none', padding: '13px 0', borderRadius: 14,
                  background: 'rgba(255,255,255,0.08)', textAlign: 'center',
                  boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.25)',
                }}>
                Log in
              </Link>
              <Link href="/tone-check" onClick={() => setMenuOpen(false)}
                style={{
                  flex: 1, fontSize: 15, fontWeight: 500, color: '#fff',
                  textDecoration: 'none', padding: '13px 0', borderRadius: 14,
                  background: 'rgba(139,92,246,0.15)', textAlign: 'center',
                  boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.25), 0 0 16px rgba(139,92,246,0.25)',
                }}>
                Start Now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media (max-width: 900px) {
          .landing-header-desktop { display: none !important; }
          .landing-header-mobile { display: flex !important; }
        }
        @media (min-width: 901px) {
          .landing-header-mobile { display: none !important; }
          .landing-mobile-menu { display: none !important; }
        }
      `}</style>
    </>
  )
}
