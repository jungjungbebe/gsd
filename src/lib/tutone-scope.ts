import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// 기록 저장 칸: 로그인 전 = 'guest', 로그인 후 = 계정 id
const SCOPE_KEY = 'tutone_scope'

let resolved = false
let pending: Promise<void> | null = null

export function getScope(): string {
  try {
    return localStorage.getItem(SCOPE_KEY) || 'guest'
  } catch {
    return 'guest'
  }
}

function storeScope(userId: string | null) {
  try {
    if (userId) localStorage.setItem(SCOPE_KEY, userId)
    else localStorage.removeItem(SCOPE_KEY)
  } catch {}
}

export function scopedKey(base: string): string {
  return `${base}:${getScope()}`
}

export function resolveScope(): Promise<void> {
  if (resolved) return Promise.resolve()
  if (!pending) {
    pending = (async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()
        storeScope(data.session?.user.id ?? null)
        supabase.auth.onAuthStateChange((_event, session) => {
          storeScope(session?.user.id ?? null)
        })
        if (data.session) {
          // 로그인 상태면 서버 기록과 이 기기의 기록을 합친 뒤에 화면이 읽도록 함
          const { syncRecords } = await import('@/lib/tutone-records')
          await syncRecords()
        }
      } catch {}
      resolved = true
    })()
  }
  return pending
}

export function useScopeReady(): boolean {
  const [ready, setReady] = useState(resolved)
  useEffect(() => {
    let alive = true
    resolveScope().then(() => {
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])
  return ready
}
