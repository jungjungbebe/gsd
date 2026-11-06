'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AI_CONSENT_KEY } from '@/lib/aiConsent'

// 메시지·사진을 처음 AI로 보내기 전에 한 번 보여주는 동의 창
export default function AiConsentModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onRequest = () => setOpen(true)
    window.addEventListener('tt-ai-consent-request', onRequest)
    return () => window.removeEventListener('tt-ai-consent-request', onRequest)
  }, [])

  function answer(ok: boolean) {
    if (ok) {
      try {
        localStorage.setItem(AI_CONSENT_KEY, new Date().toISOString())
      } catch {}
    }
    setOpen(false)
    window.dispatchEvent(new CustomEvent('tt-ai-consent-result', { detail: ok }))
  }

  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(20,14,30,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '16px 16px calc(16px + env(safe-area-inset-bottom))',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 24,
          background: '#f7f3fa',
          color: 'var(--text-primary)',
          padding: '24px 20px 18px',
          boxShadow: '0 12px 40px rgba(20,14,30,0.25)',
          lineHeight: 1.6,
        }}
      >
        <h2 id="ai-consent-title" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 10px' }}>
          AI 분석 안내
        </h2>
        <ul style={{ margin: '0 0 14px', paddingLeft: 18, fontSize: 14.5 }}>
          <li>입력한 메시지와 단어사냥 사진은 해석을 위해 <b>OpenAI(미국)</b>의 AI로 전송돼요.</li>
          <li>전송된 내용은 해석 결과를 만드는 데만 쓰여요.</li>
          <li>이름·회사명·연락처 같은 개인정보는 지우고 입력해 주세요.</li>
        </ul>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
          자세한 내용은{' '}
          <Link href="/privacy" style={{ textDecoration: 'underline' }} onClick={() => answer(false)}>
            개인정보처리방침
          </Link>
          에서 볼 수 있어요.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => answer(false)}
            style={{ flex: 1, minHeight: 48, borderRadius: 14, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => answer(true)}
            style={{ flex: 2, minHeight: 48, borderRadius: 14, border: 0, background: '#6040a0', color: '#fff', fontSize: 15, fontWeight: 700 }}
          >
            동의하고 계속
          </button>
        </div>
      </div>
    </div>
  )
}
