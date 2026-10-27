import type { Metadata, Viewport } from 'next'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import PageTransition from '@/components/PageTransition'
import AutoLogout from '@/components/AutoLogout'
import { Analytics } from '@vercel/analytics/next'
import SiteFooter from '@/components/SiteFooter'
export const metadata: Metadata = {
  metadataBase: new URL('https://gsd-mauve.vercel.app'),
  title: '투톤 — 비즈니스 한국어 톤 체크',
  description: '받은 메시지의 뉘앙스를 읽고, 상황에 맞는 답장까지 한 번에. 비즈니스 한국어 톤 체크 투톤.',
  openGraph: {
    title: '투톤 — 비즈니스 한국어 톤 체크',
    description: '받은 메시지의 뉘앙스를 읽고, 상황에 맞는 답장까지 한 번에.',
    siteName: '투톤',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '투톤 — 비즈니스 한국어 톤 체크' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet" />
      </head>
      <body className="no-scrollbar" style={{ fontFamily: "'Pretendard Variable', 'DM Sans', -apple-system, sans-serif", color: 'var(--text-primary)' }}>
        <PageTransition>{children}</PageTransition>
        <SiteFooter />
        <BottomNav />
        <AutoLogout />
        <Analytics />
      </body>
    </html>
  )
}
