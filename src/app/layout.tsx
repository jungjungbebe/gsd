import type { Metadata, Viewport } from 'next'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import PageTransition from '@/components/PageTransition'
import AutoLogout from '@/components/AutoLogout'
import { Analytics } from '@vercel/analytics/next'
import SiteFooter from '@/components/SiteFooter'
import DesktopNav from '@/components/DesktopNav'
import AiConsentModal from '@/components/AiConsentModal'
import PwaInstall from '@/components/PwaInstall'
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
  applicationName: '투톤',
  appleWebApp: { capable: true, title: '투톤', statusBarStyle: 'default' },
  icons: { icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }], apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#a8a0b8',
}

// 최소 1초 보여주고, 페이지 로드(톤체크는 구 첫 프레임까지) 끝난 뒤 한 프레임 쉬고 사라진다. 최대 3초.
const SPLASH_SCRIPT = `(function(){var d=document.documentElement;try{if(sessionStorage.getItem('tt-splash')){d.classList.add('tt-nosplash');return}sessionStorage.setItem('tt-splash','1')}catch(e){}
var t0=Date.now(),gone=false;function hide(){if(gone)return;gone=true;requestAnimationFrame(function(){requestAnimationFrame(function(){d.classList.add('tt-splash-out')})})}
function ready(){var wait=Math.max(0,1000-(Date.now()-t0));setTimeout(hide,wait)}
var loaded=false,orb=location.pathname.indexOf('/tone-check')!==0;function check(){if(loaded&&orb)ready()}
window.addEventListener('tt-orb-ready',function(){orb=true;check()});
function onLoad(){loaded=true;check();setTimeout(function(){orb=true;check()},900)}
if(document.readyState==='complete')onLoad();else window.addEventListener('load',onLoad);
setTimeout(hide,3000)})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/tutone-logo-white.svg" as="image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet" />
      </head>
      <body className="no-scrollbar" style={{ fontFamily: "'Pretendard Variable', 'DM Sans', -apple-system, sans-serif", color: 'var(--text-primary)' }}>
        {/* 앱을 켤 때 보이는 시작 화면 (같은 세션에서는 한 번만). 화면 준비가 끝난 뒤 사라진다 */}
        <div id="tt-splash" aria-hidden="true"><img src="/tutone-logo-white.svg" alt="" /></div>
        <script
          dangerouslySetInnerHTML={{
            __html: SPLASH_SCRIPT,
          }}
        />
        <DesktopNav />
        <div className="ds-zoom">
          <PageTransition>{children}</PageTransition>
          <SiteFooter />
        </div>
        <BottomNav />
        <PwaInstall />
        <AiConsentModal />
        <AutoLogout />
        <Analytics />
      </body>
    </html>
  )
}
