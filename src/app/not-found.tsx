import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <div style={{ width: '100%', maxWidth: 340, padding: 28, borderRadius: 24, border: '0.5px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-purple)', marginBottom: 10 }}>404</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>페이지를 찾을 수 없어요</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px' }}>주소가 바뀌었거나 없는 페이지예요.</p>
        <Link href="/tone-check" style={{ display: 'block', padding: '14px 0', borderRadius: 14, background: 'var(--purple-500)', color: '#fff', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
          홈으로
        </Link>
      </div>
    </main>
  )
}
