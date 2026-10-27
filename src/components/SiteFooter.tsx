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
        <a href="mailto:anattametta653@gmail.com" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
          문의하기
        </a>
      </div>
      <div style={{ marginTop: 4 }}>© 2026 투톤 (Tutone)</div>
    </footer>
  )
}
