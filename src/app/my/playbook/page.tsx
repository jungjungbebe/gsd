'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPlaybookRecords, type ToneCheckPlaybookRecord } from '@/lib/tutone-records'
import { useScopeReady } from '@/lib/tutone-scope'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}. ${m}. ${day}`
}

export default function MyPlaybookPage() {
  const router = useRouter()
  const [records, setRecords] = useState<ToneCheckPlaybookRecord[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const scopeReady = useScopeReady()
  useEffect(() => {
    if (scopeReady) setRecords(getPlaybookRecords())
  }, [scopeReady])

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/tone-check')
    }
  }

  async function handleCopy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1800)
    } catch {}
  }

  const count = records.length

  return (
    <main style={{ minHeight: '100vh', maxWidth: 430, margin: '0 auto', paddingBottom: 100 }}>
      <div
        style={{
          position: 'relative',
          margin: '0 12px',
          borderRadius: '0 0 20px 20px',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '0.5px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 4px 24px rgba(160, 120, 200, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(160deg, rgba(255,255,255,0.1) 0%, rgba(200,170,220,0.08) 50%, rgba(180,150,200,0.05) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, padding: '20px 20px 30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 26 }}>
            <button
              onClick={handleBack}
              className="active:scale-95 transition-transform"
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '0.5px solid rgba(255, 255, 255, 0.3)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
              }}
            >
              ←
            </button>
            <span
              style={{
                flex: 1,
                textAlign: 'center',
                marginRight: 34,
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.04em',
                color: 'var(--text-primary)',
              }}
            >
              MY PLAYBOOK
            </span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 44, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {String(count).padStart(2, '0')}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', color: 'var(--text-muted)', marginTop: 4 }}>
              SAVED RESPONSES
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 14 }}>
              내가 저장한 대응을
              <br />
              필요할 때 다시 꺼내볼 수 있어요.
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '28px 20px 0' }}>
        {records.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 12px' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              아직 저장한 대응이 없어요.
              <br />
              TONE CHECK에서 마음에 드는 대응을 저장하면 이곳에 쌓여요.
            </p>
            <button
              onClick={() => router.push('/tone-check')}
              className="active:scale-95 transition-transform"
              style={{
                marginTop: 22,
                fontSize: 13,
                color: 'var(--text-primary)',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '0.5px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 999,
                padding: '10px 24px',
              }}
            >
              TONE CHECK 해보기
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {records.map((r, i) => (
              <div
                key={r.id}
                style={{
                  padding: '18px 2px',
                  borderBottom: i < records.length - 1 ? '0.5px solid rgba(255, 255, 255, 0.2)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)' }}>
                    {formatDate(r.date)}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9.5,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      background: 'rgba(160, 120, 220, 0.12)',
                      borderRadius: 4,
                      padding: '2px 7px',
                    }}
                  >
                    {r.direction}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>&ldquo;{r.originalText}&rdquo;</p>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>{r.replyText}</p>
                <button
                  onClick={() => handleCopy(r.id, r.replyText)}
                  className="self-start active:scale-95 transition-transform"
                  style={{ marginTop: 2, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--purple-500)' }}
                >
                  {copiedId === r.id ? '복사됨 ✓' : 'COPY ↗'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
