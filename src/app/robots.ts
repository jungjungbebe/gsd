import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/auth/', '/my', '/login', '/signup'] },
    sitemap: 'https://gsd-mauve.vercel.app/sitemap.xml',
  }
}
