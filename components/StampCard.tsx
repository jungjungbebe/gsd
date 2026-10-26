'use client'

import { useRef, useState } from 'react'
import { incrementArchiveCount } from '@/lib/themeRecord'

interface StampCardProps {
  photo: string
  theme: { korean: string; hanja: string; english: string }
  location: string
  onStamped: (count: number) => void
  onFinish: () => void
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  rect: { x: number; y: number; w: number; h: number }
) {
  const ir = img.width / img.height
  const rr = rect.w / rect.h
  let sx = 0
  let sy = 0
  let sw = img.width
  let sh = img.height
  if (ir > rr) {
    sw = img.height * rr
    sx = (img.width - sw) / 2
  } else {
    sh = img.width / rr
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const CARD_W = 1080
const CARD_H = 1920
const PHOTO_RECT = { x: 60, y: 200, w: CARD_W - 120, h: 1120 }
const CARD_BG = '#2a2035' // var(--purple-900)
const ACCENT = '#fac775' // EXPLORE 카드와 동일한 앰버 accent

export default function StampCard({ photo, theme, location, onStamped, onFinish }: StampCardProps) {
  const [stickerPos, setStickerPos] = useState({ x: 0.5, y: 0.72 })
  const [isDragging, setIsDragging] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [stamping, setStamping] = useState(false)
  const [stamped, setStamped] = useState(false)
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)

  const dateLabel = new Date()
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase()

  function handlePointerDown(e: React.PointerEvent) {
    if (stamped) return
    ;(e.target as Element).setPointerCapture(e.pointerId)
    draggingRef.current = true
    setIsDragging(true)
    setHasInteracted(true)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingRef.current || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = Math.min(0.92, Math.max(0.08, (e.clientX - rect.left) / rect.width))
    const y = Math.min(0.92, Math.max(0.08, (e.clientY - rect.top) / rect.height))
    setStickerPos({ x, y })
  }

  function handlePointerUp() {
    draggingRef.current = false
    setIsDragging(false)
  }

  async function handleStamp() {
    if (stamping || stamped) return
    setStamping(true)
    await sleep(160)
    const next = incrementArchiveCount()
    setCount(next)
    setStamped(true)
    setStamping(false)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15)
    }
    onStamped(next)
  }

  async function exportCard(): Promise<Blob | null> {
    try {
      await (document as any).fonts?.ready
    } catch {}
    const canvas = document.createElement('canvas')
    canvas.width = CARD_W
    canvas.height = CARD_H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = CARD_BG
    ctx.fillRect(0, 0, CARD_W, CARD_H)

    const img = await loadImage(photo)
    drawCover(ctx, img, PHOTO_RECT)

    ctx.fillStyle = '#fff'
    ctx.font = '500 30px "DM Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText('TUTONE / WORD HUNT', 60, 110)
    ctx.textAlign = 'right'
    ctx.fillText(count ? String(count).padStart(2, '0') : '--', CARD_W - 60, 110)

    ctx.save()
    ctx.translate(PHOTO_RECT.x + stickerPos.x * PHOTO_RECT.w, PHOTO_RECT.y + stickerPos.y * PHOTO_RECT.h)
    ctx.rotate(-0.07)
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 14
    ctx.fillStyle = '#fff'
    ctx.font = '600 50px "Pretendard Variable", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${theme.hanja} ↗`, 0, 0)
    ctx.restore()

    let y = PHOTO_RECT.y + PHOTO_RECT.h + 100
    ctx.textAlign = 'left'
    ctx.fillStyle = '#fff'
    ctx.font = '700 58px "Pretendard Variable", sans-serif'
    ctx.fillText(theme.korean, 60, y)
    y += 56
    ctx.font = '400 30px "Pretendard Variable", sans-serif'
    ctx.fillText(`${theme.hanja} / ${theme.english}`, 60, y)
    y += 66
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '500 26px "DM Mono", monospace'
    ctx.fillText(`${location} · ${dateLabel}`, 60, y)

    if (stamped) {
      ctx.save()
      ctx.translate(CARD_W - 190, CARD_H - 260)
      ctx.rotate(-0.14)
      ctx.strokeStyle = ACCENT
      ctx.lineWidth = 5
      ctx.strokeRect(-110, -80, 220, 160)
      ctx.fillStyle = ACCENT
      ctx.textAlign = 'center'
      ctx.font = '700 24px "DM Mono", monospace'
      ctx.fillText('TUTONE', 0, -32)
      ctx.fillText('FOUND', 0, -2)
      ctx.font = '700 34px "DM Mono", monospace'
      ctx.fillText(String(count).padStart(3, '0'), 0, 42)
      ctx.restore()
    }

    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  }

  async function handleSave() {
    setBusy(true)
    const blob = await exportCard()
    setBusy(false)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tutone-${theme.korean}-${String(count).padStart(3, '0')}.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleShare() {
    setBusy(true)
    const blob = await exportCard()
    setBusy(false)
    if (!blob) return
    const file = new File([blob], 'tutone-card.png', { type: 'image/png' })
    const nav = navigator as any
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: 'TUTONE', text: `오늘의 발견 · ${theme.korean} ${theme.hanja}` })
      } catch {}
    } else {
      handleSave()
    }
  }

  return (
    <div style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!stamped && (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)' }}>
          발견한 곳에 스티커를 붙여보세요.
        </div>
      )}

      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: `${CARD_W} / ${CARD_H}`,
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          background: CARD_BG,
          touchAction: 'none',
          transform: stamping ? 'scale(0.97)' : 'scale(1)',
          transition: 'transform 160ms ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '5.6%',
            top: '10.4%',
            width: '88.9%',
            height: '58.3%',
            borderRadius: 12,
            backgroundImage: `url(${photo})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 16,
            top: 16,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#fff',
            letterSpacing: '0.05em',
          }}
        >
          TUTONE / WORD HUNT
        </div>
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: 16,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#fff',
          }}
        >
          {count ? String(count).padStart(2, '0') : '--'}
        </div>

        <div
          onPointerDown={handlePointerDown}
          style={{
            position: 'absolute',
            left: `${stickerPos.x * 100}%`,
            top: `${stickerPos.y * 100}%`,
            transform: `translate(-50%, -50%) rotate(-4deg) scale(${isDragging ? 1.12 : 1})`,
            transition: isDragging ? 'none' : 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: stamped ? 'default' : 'grab',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: 20,
              color: '#fff',
              background: 'rgba(255,255,255,0.14)',
              border: '1.5px dashed rgba(255,255,255,0.55)',
              borderRadius: 10,
              padding: '6px 12px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            }}
          >
            {theme.hanja} ↗
          </div>
          {!hasInteracted && !stamped && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: '0.05em',
              }}
            >
              ← drag me
            </span>
          )}
        </div>

        <div style={{ position: 'absolute', left: 16, bottom: stamped ? 90 : 16, right: 16 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 20, color: '#fff' }}>{theme.korean}</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
            {theme.hanja} / {theme.english}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
            {location} · {dateLabel}
          </div>
        </div>

        {stamped && (
          <div
            key={count}
            style={{
              position: 'absolute',
              right: 16,
              bottom: 16,
              width: 84,
              height: 62,
              border: `2px solid ${ACCENT}`,
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: ACCENT,
              fontFamily: 'var(--font-mono)',
              animation: 'stampPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 700 }}>TUTONE</span>
            <span style={{ fontSize: 9, fontWeight: 700 }}>FOUND</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{String(count).padStart(3, '0')}</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes stampPop {
          0% { transform: rotate(-8deg) scale(0.3); opacity: 0; }
          50% { transform: rotate(-8deg) scale(1.4); opacity: 1; }
          75% { transform: rotate(-8deg) scale(0.95); }
          100% { transform: rotate(-8deg) scale(1); }
        }
      `}</style>

      {!stamped ? (
        <button
          onClick={handleStamp}
          disabled={stamping}
          style={{
            width: '100%',
            padding: 16,
            borderRadius: 14,
            background: 'var(--purple-500)',
            border: 'none',
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 500,
            color: '#fff',
            opacity: stamping ? 0.7 : 1,
          }}
        >
          STAMP MY FIND
        </button>
      ) : (
        <>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>
            '{theme.korean}'을 수집했어요.
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-purple)' }}>
            WORD COLLECTION · {String(count).padStart(2, '0')}/10 · +30 XP
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={busy}
              className="glass-card"
              style={{ flex: 1, border: 'none', padding: 14, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-primary)' }}
            >
              이미지 저장
            </button>
            <button
              onClick={handleShare}
              disabled={busy}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                background: 'var(--purple-500)',
                border: 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: '#fff',
              }}
            >
              공유하기
            </button>
          </div>
          <button
            onClick={onFinish}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              padding: 8,
            }}
          >
            완료 · 미션 목록으로
          </button>
        </>
      )}
    </div>
  )
}
