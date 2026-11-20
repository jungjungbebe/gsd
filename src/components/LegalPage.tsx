import Link from 'next/link'

export type LegalSection = { title: string; body: React.ReactNode }

export default function LegalPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: string; sections: LegalSection[] }) {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '56px 20px 24px' }}>
      <div
        style={{
          borderRadius: 24,
          border: '0.5px solid rgba(255,255,255,0.5)',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          padding: '28px 24px',
          color: 'var(--text-primary)',
          lineHeight: 1.7,
          fontSize: 14,
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-purple)', marginBottom: 8 }}>{eyebrow}</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>{title}</h1>
        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)' }}>{intro}</p>
        {sections.map((s) => (
          <section key={s.title} style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>{s.title}</h2>
            <div className="legal-body" style={{ color: 'var(--text-secondary)' }}>{s.body}</div>
          </section>
        ))}
        <div style={{ marginTop: 28 }}>
          <Link href="/tone-check" style={{ color: 'var(--text-purple)', fontWeight: 600, textDecoration: 'none' }}>
            ← 홈으로
          </Link>
        </div>
      </div>
      <style>{`.legal-body ul{margin:0;padding-left:18px;list-style:disc}.legal-body li{margin:2px 0}.legal-body p{margin:0 0 6px}.legal-body a{color:var(--text-purple);text-decoration:underline}`}</style>
    </main>
  )
}
