import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer
      style={{
        textAlign: 'center',
        padding: '8px 16px 120px',
        fontSize: 12,
        lineHeight: 1.8,
        color: 'var(--text-muted)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Link href="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
          개인정보처리방침
        </Link>
        <Link href="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
          이용약관
        </Link>
        <Link href="/support" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
          고객지원
        </Link>
      </div>
      <div style={{ marginTop: 4 }}>© 2026 투톤 (Tutone)</div>
    </footer>
  )
}
