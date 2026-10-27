'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface HanjaWord {
  hanja: string
  korean: string
  meaning: string
}

const HANJA_WORDS: HanjaWord[] = [
  { hanja: '錄音', korean: '녹음', meaning: '소리를 기록함' },
  { hanja: '金日', korean: '금일', meaning: '오늘' },
  { hanja: '中食', korean: '중식', meaning: '점심 식사' },
  { hanja: '深甚', korean: '심심', meaning: '매우 깊음' },
  { hanja: '貴社', korean: '귀사', meaning: '상대 회사를 높여 부르는 말' },
  { hanja: '受信', korean: '수신', meaning: '문서나 연락을 받음' },
  { hanja: '發信', korean: '발신', meaning: '문서나 연락을 보냄' },
  { hanja: '添附', korean: '첨부', meaning: '서류를 덧붙여 보냄' },
  { hanja: '決裁', korean: '결재', meaning: '결정할 권한이 있는 사람이 허가함' },
  { hanja: '稟議', korean: '품의', meaning: '윗사람에게 의견을 여쭘' },
  { hanja: '施行', korean: '시행', meaning: '실제로 실행함' },
  { hanja: '早期', korean: '조기', meaning: '이른 시기' },
  { hanja: '有線', korean: '유선', meaning: '전화(통신선)를 통하여' },
  { hanja: '不可避', korean: '불가피', meaning: '피할 수 없음' },
  { hanja: '浮上', korean: '부상', meaning: '떠오름, 중요해짐' },
]

const BG_THEMES = [
  { name: '인디고', bg: '#4338ca', text: '#ffffff', accent: '#a5b4fc', sub: '#c7d2fe' },
  { name: '슬레이트', bg: '#1e293b', text: '#f8fafc', accent: '#94a3b8', sub: '#cbd5e1' },
  { name: '로즈', bg: '#9f1239', text: '#ffffff', accent: '#fda4af', sub: '#fecdd3' },
  { name: '에메랄드', bg: '#065f46', text: '#ffffff', accent: '#6ee7b7', sub: '#a7f3d0' },
  { name: '바이올렛', bg: '#5b21b6', text: '#ffffff', accent: '#c4b5fd', sub: '#ddd6fe' },
  { name: '앰버', bg: '#92400e', text: '#ffffff', accent: '#fcd34d', sub: '#fde68a' },
]

const CANVAS_W = 1080
const CANVAS_H = 1080

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function getTodayWord(): HanjaWord {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  return HANJA_WORDS[seed % HANJA_WORDS.length]
}

export default function SharePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [themeIndex, setThemeIndex] = useState(0)
  const [customSentence, setCustomSentence] = useState('')
  const [downloaded, setDownloaded] = useState(false)

  const word = getTodayWord()
  const theme = BG_THEMES[themeIndex]
  const todayStr = getTodayStr()

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = CANVAS_W
    const H = CANVAS_H

    // Background
    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, W, H)

    // Subtle pattern - diagonal lines
    ctx.strokeStyle = `${theme.accent}15`
    ctx.lineWidth = 1
    for (let i = -H; i < W + H; i += 40) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i + H, H)
      ctx.stroke()
    }

    // Top badge
    ctx.fillStyle = `${theme.accent}30`
    const badgeW = 280
    const badgeH = 44
    const badgeX = (W - badgeW) / 2
    const badgeY = 120
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 22)
    ctx.fill()

    ctx.fillStyle = theme.accent
    ctx.font = '500 22px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`오늘의 한자어  ·  ${todayStr}`, W / 2, badgeY + 30)

    // Hanja characters - large
    ctx.fillStyle = theme.text
    ctx.font = 'bold 160px "Apple SD Gothic Neo", "Noto Sans KR", serif'
    ctx.textAlign = 'center'
    ctx.fillText(word.hanja, W / 2, 360)

    // Korean reading
    ctx.fillStyle = theme.accent
    ctx.font = 'bold 56px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
    ctx.fillText(word.korean, W / 2, 440)

    // Divider
    ctx.strokeStyle = `${theme.accent}40`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(W / 2 - 60, 480)
    ctx.lineTo(W / 2 + 60, 480)
    ctx.stroke()

    // Meaning
    ctx.fillStyle = theme.sub
    ctx.font = '400 32px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
    ctx.fillText(word.meaning, W / 2, 530)

    // Custom sentence (if provided)
    if (customSentence.trim()) {
      ctx.fillStyle = `${theme.accent}20`
      const boxW = W - 160
      const boxH = 120
      const boxX = 80
      const boxY = 590
      ctx.beginPath()
      ctx.roundRect(boxX, boxY, boxW, boxH, 20)
      ctx.fill()

      ctx.fillStyle = theme.sub
      ctx.font = '400 26px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
      ctx.textAlign = 'center'

      // Word wrap
      const maxWidth = boxW - 60
      const words = customSentence.trim().split('')
      let line = ''
      let y = boxY + 48
      const lineHeight = 36

      for (const char of words) {
        const testLine = line + char
        if (ctx.measureText(testLine).width > maxWidth) {
          ctx.fillText(line, W / 2, y)
          line = char
          y += lineHeight
          if (y > boxY + boxH - 10) break
        } else {
          line = testLine
        }
      }
      if (line) ctx.fillText(line, W / 2, y)
    }

    // Bottom branding
    ctx.fillStyle = `${theme.accent}60`
    ctx.font = '500 24px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('투톤  ·  오늘도 한 뼘 성장 📚', W / 2, H - 80)

    // Watermark line
    ctx.fillStyle = `${theme.accent}30`
    ctx.font = '400 18px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
    ctx.fillText('munhaeryeok.vercel.app', W / 2, H - 45)
  }, [theme, word, todayStr, customSentence])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `투톤_${todayStr.replace(/\./g, '')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
  }

  async function handleShare() {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      )
      if (!blob) return

      if (navigator.share) {
        const file = new File([blob], `투톤_${todayStr.replace(/\./g, '')}.png`, {
          type: 'image/png',
        })
        await navigator.share({
          title: '오늘의 한자어 인증샷',
          text: `오늘 배운 한자어: ${word.hanja} (${word.korean}) - ${word.meaning}`,
          files: [file],
        })
      } else {
        handleDownload()
      }
    } catch {
      handleDownload()
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">인증샷 생성기</h1>
        <p className="text-gray-500 text-sm mt-1">
          오늘 배운 한자어를 예쁜 이미지로 만들어 공유하세요
        </p>
      </div>

      {/* Canvas preview */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full rounded-xl"
        />
      </div>

      {/* Custom sentence input */}
      <div className="space-y-2">
        <label htmlFor="custom-sentence" className="block text-sm font-medium text-gray-700">
          오늘 필사한 문장 (선택)
        </label>
        <input
          id="custom-sentence"
          type="text"
          value={customSentence}
          onChange={(e) => setCustomSentence(e.target.value)}
          placeholder="예: 번거로우시겠지만, 한 번만 더 확인 부탁드려도 될까요?"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
          maxLength={80}
        />
        <p className="text-xs text-gray-400">이미지 하단에 함께 표시됩니다</p>
      </div>

      {/* Color theme selector */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">배경 테마</p>
        <div className="flex gap-3 flex-wrap">
          {BG_THEMES.map((t, i) => (
            <button
              key={t.name}
              onClick={() => setThemeIndex(i)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                i === themeIndex
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div
                className="w-5 h-5 rounded-full shadow-inner"
                style={{ backgroundColor: t.bg }}
              />
              <span className="text-sm font-medium text-gray-700">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors text-sm"
        >
          {downloaded ? '✓ 저장 완료!' : '이미지 저장하기'}
        </button>
        <button
          onClick={handleShare}
          className="flex-1 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold py-3.5 px-6 rounded-xl transition-colors text-sm"
        >
          SNS 공유하기
        </button>
      </div>

      {/* Back link */}
      <div className="text-center pb-4">
        <Link href="/missions" className="text-sm text-gray-400 hover:text-indigo-500 transition">
          ← 미션 페이지로 돌아가기
        </Link>
      </div>
    </div>
  )
}
