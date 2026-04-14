'use client'

import { useRef, useEffect, useState } from 'react'
import styles from './TutonLogo.module.css'

interface TutonLogoProps {
  size?: number
  color?: string
  curveColor?: string
}

export default function TutonLogo({
  size = 32,
  color = 'var(--text-primary)',
  curveColor = 'var(--purple-500)',
}: TutonLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tuRef = useRef<HTMLSpanElement>(null)
  const tonRef = useRef<HTMLSpanElement>(null)
  const [path, setPath] = useState('')
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    function measure() {
      if (!containerRef.current || !tuRef.current || !tonRef.current) return

      const container = containerRef.current.getBoundingClientRect()
      const tu = tuRef.current.getBoundingClientRect()
      const ton = tonRef.current.getBoundingClientRect()

      // 투의 ㅜ 가로획 오른쪽 끝: 투 글자의 오른쪽 하단 부근
      // 한글 '투'에서 ㅜ의 가로획은 글자 높이의 약 55% 위치, 오른쪽 끝
      const startX = tu.right - container.left
      const startY = tu.top - container.top + tu.height * 0.55

      // 톤의 ㅌ 첫 번째 가로획 왼쪽: 톤 글자의 왼쪽 상단 부근
      // 한글 '톤'에서 ㅌ의 첫 가로획은 글자 높이의 약 22% 위치, 왼쪽
      const endX = ton.left - container.left
      const endY = ton.top - container.top + ton.height * 0.22

      // 두 글자 사이 간격의 중점에서 아래로 살짝 처지는 완만한 곡선
      const midX = (startX + endX) / 2
      const sag = Math.abs(endY - startY) * 0.5 + size * 0.15
      const ctrlY = Math.max(startY, endY) + sag

      const d = `M ${startX} ${startY} Q ${midX} ${ctrlY} ${endX} ${endY}`
      setPath(d)
      setSvgSize({
        w: container.width,
        h: container.height,
      })
    }

    measure()
    window.addEventListener('resize', measure)
    // 폰트 로드 후 재측정
    if (document.fonts?.ready) {
      document.fonts.ready.then(measure)
    }
    return () => window.removeEventListener('resize', measure)
  }, [size])

  const strokeWidth = Math.max(1, size * 0.04)

  return (
    <div ref={containerRef} className={styles.container} style={{ fontSize: size }}>
      <span ref={tuRef} className={styles.text} style={{ color }}>투</span>
      <span ref={tonRef} className={styles.text} style={{ color }}>톤</span>
      {path && (
        <svg
          className={styles.svg}
          width={svgSize.w}
          height={svgSize.h}
          viewBox={`0 0 ${svgSize.w} ${svgSize.h}`}
          fill="none"
        >
          <path
            d={path}
            stroke={curveColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )}
    </div>
  )
}
