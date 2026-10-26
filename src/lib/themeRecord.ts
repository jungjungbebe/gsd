export const THEME_STORAGE_KEY = 'tutone_theme_collection'
const ARCHIVE_COUNT_KEY = 'tutone_hunt_archive_count'

export interface ThemeRecord {
  hunt: boolean
  write: boolean
  huntPhoto?: string
  writePhoto?: string
  date?: string
}

export function loadThemeRecord(): ThemeRecord {
  if (typeof window === 'undefined') return { hunt: false, write: false }
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (!raw) return { hunt: false, write: false }
    return JSON.parse(raw)
  } catch {
    return { hunt: false, write: false }
  }
}

export function saveThemeRecord(record: ThemeRecord): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(record))
}

export function loadArchiveCount(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(ARCHIVE_COUNT_KEY)
  return raw ? parseInt(raw, 10) || 0 : 0
}

export function incrementArchiveCount(): number {
  const next = loadArchiveCount() + 1
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ARCHIVE_COUNT_KEY, String(next))
  }
  return next
}
