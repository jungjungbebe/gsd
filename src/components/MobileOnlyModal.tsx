'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'

// PC에서 카메라·위치가 필요한 미션을 누르면 보여주는 안내. 현재 미션 주소를 QR로 만들어 휴대폰에서 이어서 하게 한다.
export default function MobileOnlyModal({ missionId, onClose }: { missionId: string; onClose: () => void }) {
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => {
    const u = `${window.location.origin}/missions?mission=${encodeURIComponent(missionId)}`
    setUrl(u)
    QRCode.toDataURL(u, { margin: 1, width: 260, color: { dark: '#2a2035', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [missionId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(42,32,53,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', width: 'min(760px, 100%)', padding: '40px 40px 32px', borderRadius: 28, background: 'rgba(255,252,246,0.94)', border: '0.5px solid rgba(255,255,255,0.8)', boxShadow: '0 16px 60px rgba(42,32,53,0.3)', textAlign: 'center', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}
      >
        <button aria-label="닫기" onClick={onClose} style={{ position: 'absolute', top: 18, right: 20, background: 'none', border: 'none', fontSize: 22, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          ✕
        </button>
        <span style={{ display: 'inline-block', padding: '7px 20px', borderRadius: 999, background: '#dff77e', color: '#2a2035', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em' }}>
          MOBILE ONLY
        </span>
        <h2 style={{ margin: '16px 0 8px', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>휴대폰에서 이어서 참여해 주세요</h2>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          단어사냥과 필사 스팟은 카메라와 위치 기능을 사용해요.
          <br />
          QR 코드를 촬영하면 지금 보고 있는 미션으로 바로 이동합니다.
        </p>

        <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, flexWrap: 'wrap' }}>
          <div>
            <div style={{ width: 184, height: 184, padding: 8, borderRadius: 18, background: '#fff', boxShadow: '0 2px 12px rgba(42,32,53,0.12)' }}>
              {qr ? <img src={qr} alt="미션으로 이동하는 QR 코드" style={{ width: '100%', height: '100%', display: 'block' }} /> : null}
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>카메라로 QR 스캔</div>
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border-default)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 300, maxWidth: '100%' }}>
            <button onClick={copy} className="ttPress" style={{ padding: 16, borderRadius: 16, background: 'var(--purple-500)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              {copied ? '복사됨 ✓' : '링크 복사'}
            </button>
            <Link href="/my" style={{ padding: 15, borderRadius: 16, background: '#fff', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
              PC에서 기록 둘러보기 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
