'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

// TUTONE 전역 공통 Fade Out -> Fade In 라우트 전환.
// background(mauve gradient + grid)는 layout에서 절대 건드리지 않고, 이 안의 content만 opacity로 교체한다.
const FADE_OUT_MS = 140
const FADE_IN_MS = 200

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [displayedPath, setDisplayedPath] = useState(pathname)
  const [displayedChildren, setDisplayedChildren] = useState(children)
  const [visible, setVisible] = useState(true)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    try {
      reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {}
  }, [])

  useEffect(() => {
    if (pathname === displayedPath) {
      // 같은 라우트 내 리렌더는 fade 없이 즉시 최신 content로
      setDisplayedChildren(children)
      return
    }
    if (reducedMotionRef.current) {
      setDisplayedPath(pathname)
      setDisplayedChildren(children)
      setVisible(true)
      return
    }
    setVisible(false)
    const t = setTimeout(() => {
      setDisplayedPath(pathname)
      setDisplayedChildren(children)
      requestAnimationFrame(() => setVisible(true))
    }, FADE_OUT_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: reducedMotionRef.current
          ? 'none'
          : `opacity ${visible ? FADE_IN_MS : FADE_OUT_MS}ms ease-out`,
      }}
    >
      {displayedChildren}
    </div>
  )
}
