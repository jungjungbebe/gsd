'use client'

import { useRef, useEffect, useState } from 'react'
import styles from './TutoneLogo.module.css'

interface TutoneLogoProps {
  size?: number
  color?: string
  curveColor?: string
}

export default function TutoneLogo({
  size = 48,
  color = '#f0f0ee',
  curveColor = '#b5a78f',
}: TutoneLogoProps) {
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

      // 투의 ㅜ 가로획 오른쪽 끝
      const startX = tu.right - container.left - size * 0.02
      const startY = tu.top - container.top + tu.height * 0.55

      // 톤의 ㅌ 첫 가로획 왼쪽
      const endX = ton.left - container.left + size * 0.02
      const endY = ton.top - container.top + ton.height * 0.22

      // 완만한 곡선 — 중점에서 아래로 처짐
      const midX = (startX + endX) / 2
      const sag = Math.abs(endY - startY) * 0.5 + size * 0.18
      const ctrlY = Math.max(startY, endY) + sag

      setPath(`M ${startX} ${startY} Q ${midX} ${ctrlY} ${endX} ${endY}`)
      setSvgSize({ w: container.width, h: container.height })
    }

    measure()
    window.addEventListener('resize', measure)
    document.fonts?.ready?.then(measure)
    return () => window.removeEventListener('resize', measure)
  }, [size])

  return (
    <div ref={containerRef} className={styles.container} style={{ fontSize: size }}>
      <span ref={tuRef} className={styles.char} style={{ color }}>투</span>
      <span ref={tonRef} className={styles.char} style={{ color }}>톤</span>
      {path && (
        <svg
          className={styles.curve}
          width={svgSize.w}
          height={svgSize.h}
          viewBox={`0 0 ${svgSize.w} ${svgSize.h}`}
          fill="none"
        >
          <path
            d={path}
            stroke={curveColor}
            strokeWidth={Math.max(1.2, size * 0.035)}
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  )
}
