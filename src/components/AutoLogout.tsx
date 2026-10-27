'use client'

import { useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { resolveScope } from '@/lib/tutone-scope'
import { signOutAndGo } from '@/lib/tutone-session'

const IDLE_LIMIT_MS = 30 * 60 * 1000 // 이 숫자만 바꾸면 자동 로그아웃 시간이 바뀝니다 (현재 30분)
const CHECK_EVERY_MS = 30 * 1000
const ACTIVE_KEY = 'tutone_last_active'
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const

export default function AutoLogout() {
  useEffect(() => {
    resolveScope()
    const supabase = createClient()
    let loggedIn = false
    let signedInAt = 0
    let lastWrite = 0

    function applySession(session: Session | null) {
      loggedIn = !!session
      signedInAt = session?.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at).getTime() : 0
    }

    function lastActive(): number {
      let stored = 0
      try {
        stored = Number(localStorage.getItem(ACTIVE_KEY)) || 0
      } catch {}
      const base = Math.max(stored, signedInAt)
      return base > 0 ? base : Date.now()
    }

    function touch() {
      const now = Date.now()
      if (now - lastWrite < 5000) return
      lastWrite = now
      try {
        localStorage.setItem(ACTIVE_KEY, String(now))
      } catch {}
    }

    function check() {
      if (!loggedIn) return
      if (Date.now() - lastActive() > IDLE_LIMIT_MS) {
        loggedIn = false
        signOutAndGo('/login?reason=idle')
      }
    }

    function onActivity() {
      if (loggedIn) touch()
    }

    function onVisible() {
      if (document.visibilityState === 'visible') check()
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        applySession(data.session)
        if (loggedIn) {
          check()
          if (loggedIn) touch()
        }
      })
      .catch(() => {})

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })

    const interval = setInterval(check, CHECK_EVERY_MS)
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, true))
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(interval)
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity, true))
      document.removeEventListener('visibilitychange', onVisible)
      sub.subscription.unsubscribe()
    }
  }, [])

  return null
}
