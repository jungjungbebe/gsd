'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'tutone_pwa_dismissed'

function isStandalone(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    )
  } catch {
    return false
  }
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  // 앱 내 브라우저(카카오톡·인스타 등)와 iOS 크롬/파이어폭스는 홈 화면 추가 안내가 달라 Safari만 안내
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|KAKAOTALK|Instagram|FBAN|FBAV|NAVER|Line/i.test(ua)
  return ios && safari
}

// 서비스 워커 등록 + 안드로이드 '앱 설치하기' 버튼 + iPhone '홈 화면에 추가' 안내
export default function PwaInstall() {
  const pathname = usePathname()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [ios, setIos] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
    }
    setInstalled(isStandalone())
    setIos(isIosSafari())
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // 이미 설치(독립 실행)된 경우, 또는 설치 안내를 보여줄 페이지가 아니면 표시하지 않음
  const onHome = pathname === '/tone-check' || pathname === '/home'
  if (installed || dismissed || !onHome) return null
  if (!deferred && !ios) return null

  function dismiss() {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {}
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    if (outcome === 'dismissed') dismiss()
  }

  return (
    <div
      className="pwa-install"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(84px + env(safe-area-inset-bottom))',
        zIndex: 90,
        maxWidth: 406,
        margin: '0 auto',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderRadius: 16,
        background: 'rgba(42,32,53,0.92)',
        color: '#fff',
        boxShadow: '0 6px 24px rgba(42,32,53,0.3)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {deferred ? (
        <>
          <span style={{ flex: 1, fontSize: 13, lineHeight: 1.45 }}>홈 화면에 추가하면 앱처럼 바로 열 수 있어요</span>
          <button
            onClick={install}
            style={{ padding: '9px 14px', borderRadius: 11, background: '#dff77e', color: '#2a2035', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            투톤 앱 설치하기
          </button>
        </>
      ) : (
        <span style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>
          앱처럼 쓰려면 Safari 하단의 <b>공유(⬆︎)</b> → <b>홈 화면에 추가</b>를 눌러 주세요
        </span>
      )}
      <button onClick={dismiss} aria-label="닫기" style={{ padding: 4, fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>
        ✕
      </button>
    </div>
  )
}
