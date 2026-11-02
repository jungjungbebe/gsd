'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// 고르기형 아바타: 투톤 구체를 색과 표정으로 구분한다. 계정(user_metadata.avatar)에는 id만 저장한다.
type Face = 'smile' | 'calm' | 'wink' | 'o' | 'sleepy' | 'grin'

export const AVATARS: { id: string; name: string; light: string; dark: string; face: Face }[] = [
  { id: 'orb-purple', name: '보라 구체', light: '#c9a8f5', dark: '#7a4fd0', face: 'smile' },
  { id: 'orb-pink', name: '핑크 구체', light: '#f6b4d2', dark: '#c4559a', face: 'wink' },
  { id: 'orb-lime', name: '라임 구체', light: '#eaff9a', dark: '#9cc93a', face: 'grin' },
  { id: 'orb-mint', name: '민트 구체', light: '#a9ecd6', dark: '#3fae8f', face: 'calm' },
  { id: 'orb-peach', name: '복숭아 구체', light: '#ffd1b3', dark: '#e48a5c', face: 'o' },
  { id: 'orb-sky', name: '하늘 구체', light: '#b4d6ff', dark: '#4f86d8', face: 'sleepy' },
  { id: 'orb-lilac', name: '라일락 구체', light: '#dcc9ff', dark: '#9577d6', face: 'calm' },
  { id: 'orb-butter', name: '버터 구체', light: '#fff0a6', dark: '#e0b73a', face: 'smile' },
  { id: 'orb-coral', name: '코랄 구체', light: '#ffb9b0', dark: '#e0645a', face: 'grin' },
  { id: 'orb-night', name: '밤하늘 구체', light: '#8d86c9', dark: '#3b3475', face: 'sleepy' },
]

export const DEFAULT_AVATAR = AVATARS[0].id

export function isAvatarId(v: unknown): v is string {
  return typeof v === 'string' && AVATARS.some((a) => a.id === v)
}

function FaceMark({ face }: { face: Face }) {
  const ink = '#2a2035'
  const common = { stroke: ink, strokeWidth: 3, strokeLinecap: 'round' as const, fill: 'none' }
  const eyes =
    face === 'sleepy' ? (
      <>
        <path d="M20 29 Q24 33 28 29" {...common} />
        <path d="M36 29 Q40 33 44 29" {...common} />
      </>
    ) : face === 'wink' ? (
      <>
        <circle cx="24" cy="29" r="3" fill={ink} />
        <path d="M36 29 Q40 25 44 29" {...common} />
      </>
    ) : (
      <>
        <circle cx="24" cy="29" r="3" fill={ink} />
        <circle cx="40" cy="29" r="3" fill={ink} />
      </>
    )
  const mouth =
    face === 'o' ? (
      <ellipse cx="32" cy="43" rx="3.2" ry="4" fill={ink} />
    ) : face === 'calm' ? (
      <path d="M26 42 H38" {...common} />
    ) : face === 'grin' ? (
      <path d="M23 39 Q32 50 41 39 Z" fill={ink} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
    ) : (
      <path d="M24 40 Q32 48 40 40" {...common} />
    )
  return (
    <>
      {eyes}
      {mouth}
    </>
  )
}

export function Avatar({ id, size = '100%' }: { id?: string | null; size?: number | string }) {
  const a = AVATARS.find((x) => x.id === id) ?? AVATARS[0]
  const gid = `av-${a.id}`
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={a.name} style={{ display: 'block' }}>
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={a.light} />
          <stop offset="100%" stopColor={a.dark} />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill={`url(#${gid})`} />
      <ellipse cx="22" cy="16" rx="9" ry="5" fill="#fff" opacity="0.35" transform="rotate(-25 22 16)" />
      <FaceMark face={a.face} />
    </svg>
  )
}

export function AvatarPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }} role="radiogroup" aria-label="아바타 선택">
      {AVATARS.map((a) => {
        const on = a.id === value
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={a.name}
            onClick={() => onChange(a.id)}
            style={{
              aspectRatio: '1 / 1',
              borderRadius: '50%',
              padding: 3,
              background: 'transparent',
              border: on ? '2.5px solid var(--purple-500)' : '2.5px solid transparent',
              boxShadow: on ? '0 0 0 3px rgba(223,247,126,0.9)' : 'none',
              cursor: 'pointer',
            }}
          >
            <Avatar id={a.id} />
          </button>
        )
      })}
    </div>
  )
}

// 로그인한 사용자의 아바타. 로그인 전이거나 아직 고르지 않았으면 기존 "U"를 보여준다.
export function UserAvatar({ fallback = 'U' }: { fallback?: string }) {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data } = await createClient().auth.getSession()
        const v = (data.session?.user?.user_metadata as { avatar?: string } | undefined)?.avatar
        if (alive && isAvatarId(v)) setId(v)
      } catch {}
    })()
    return () => {
      alive = false
    }
  }, [])
  if (!id) return <>{fallback}</>
  return <Avatar id={id} />
}
