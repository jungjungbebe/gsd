'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPatternRecords, type ToneCheckPatternRecord } from '@/lib/tutone-records'
import { useScopeReady } from '@/lib/tutone-scope'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}. ${m}. ${day}`
}

function tally(records: ToneCheckPatternRecord[], field: 'situationCategory' | 'direction') {
  const map = new Map<string, number>()
  records.forEach((r) => {
    const key = (r[field] || '').trim() || '기타'
    map.set(key, (map.get(key) || 0) + 1)
  })
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
}

export default function MyPatternPage() {
  const router = useRouter()
  const [records, setRecords] = useState<ToneCheckPatternRecord[]>([])

  const scopeReady = useScopeReady()
  useEffect(() => {
    if (scopeReady) setRecords(getPatternRecords())
  }, [scopeReady])

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/tone-check')
    }
  }

  const count = records.length
  const situationTally = tally(records, 'situationCategory')
  const directionTally = tally(records, 'direction')
  const recent = records.slice(0, 5)

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
              MY PATTERN
            </span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 44, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {String(count).padStart(2, '0')}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', color: 'var(--text-muted)', marginTop: 4 }}>
              TONE CHECKS
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 14 }}>
              체크할수록 나의 업무 패턴과
              <br />
              대응 경향을 더 잘 확인할 수 있어요.
            </p>
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 32px 0' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            아직 체크한 상황이 없어요.
            <br />
            TONE CHECK를 사용할수록 상황과 대응 기록이 이곳에 쌓여요.
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
        <div style={{ padding: '28px 20px 0', display: 'flex', flexDirection: 'column', gap: 30 }}>
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>자주 마주친 상황</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>총 {count}회</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {situationTally.map(([label, n]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {String(n).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div style={{ height: '0.5px', background: 'rgba(255, 255, 255, 0.2)' }} />

          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>자주 선택한 대응</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>총 {count}회</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {directionTally.map(([label, n]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {String(n).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div style={{ height: '0.5px', background: 'rgba(255, 255, 255, 0.2)' }} />

          <section style={{ paddingBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>최근 체크</span>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
              {recent.map((r, i) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '14px 0',
                    borderBottom: i < recent.length - 1 ? '0.5px solid rgba(255, 255, 255, 0.15)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{formatDate(r.date)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        &ldquo;{r.originalText}&rdquo;
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9.5,
                          fontWeight: 500,
                          color: 'var(--text-secondary)',
                          background: 'rgba(160, 120, 220, 0.12)',
                          borderRadius: 4,
                          padding: '2px 6px',
                          flexShrink: 0,
                        }}
                      >
                        {r.direction}
                      </span>
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, flexShrink: 0 }}>→</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
