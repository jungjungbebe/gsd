'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <div style={{ width: '100%', maxWidth: 340, padding: 28, borderRadius: 24, border: '0.5px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-purple)', marginBottom: 10 }}>ERROR</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>문제가 발생했어요</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px' }}>잠시 후 다시 시도해 주세요.</p>
        <button onClick={reset} style={{ width: '100%', padding: '14px 0', borderRadius: 14, background: 'var(--purple-500)', color: '#fff', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          다시 시도
        </button>
      </div>
    </main>
  )
}
