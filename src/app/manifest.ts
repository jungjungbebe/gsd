import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/tone-check',
    name: '투톤 — 비즈니스 한국어 톤 체크',
    short_name: '투톤',
    description: '낯선 회사어를 쉬운 말로 풀고, 실무 답장까지 도와주는 투톤',
    lang: 'ko',
    dir: 'ltr',
    start_url: '/tone-check?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#a8a0b8',
    theme_color: '#a8a0b8',
    categories: ['productivity', 'business'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [{ name: '톤체크', short_name: '톤체크', url: '/tone-check?source=shortcut' }],
  }
}
