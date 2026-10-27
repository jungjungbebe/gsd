import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://gsd-mauve.vercel.app'
  const now = new Date()
  return ['/tone-check', '/diagnosis', '/privacy'].map((path) => ({
    url: base + path,
    lastModified: now,
  }))
}
