'use client'

import Link from 'next/link'
import type { UserProfile } from '@/hooks/useUser'

const LEVEL_NAMES: Record<number, string> = {
  0: '미진단', 1: '입문', 2: '초급', 3: '중급', 4: '고급', 5: '마스터',
}

interface GradeBadgeProps {
  user: UserProfile | null
  isPremium: boolean
}

export default function GradeBadge({ user, isPremium }: GradeBadgeProps) {
  if (!user) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>안녕하세요</p>
          <p className="text-[12px] tracking-[-0.01em] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            <Link href="/login" style={{ color: 'var(--purple-500)' }}>로그인</Link>하고 시작하세요
          </p>
        </div>
        <Link
          href="/diagnosis"
          className="text-[11px] tracking-[0.05em] px-3 py-1.5"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple-500)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)' }}
        >
          Lv.—
        </Link>
      </div>
    )
  }

  const levelName = LEVEL_NAMES[user.level] ?? '미진단'
  const displayName = user.nickname || user.email.split('@')[0]

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-medium tracking-[-0.02em]"
          style={{
            background: isPremium ? 'var(--purple-500)' : 'var(--bg-elevated)',
            color: isPremium ? '#fff' : 'var(--text-primary)',
            boxShadow: isPremium ? '0 0 0 2px var(--bg-card), 0 0 0 4px var(--purple-500)' : 'none',
          }}
        >
          {displayName[0]}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
              {displayName}
            </span>
            {isPremium && (
              <span
                className="text-[9px] tracking-[0.1em] uppercase px-1.5 py-0.5"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple-300)', background: 'var(--glass-purple)', borderRadius: '4px' }}
              >
                pro
              </span>
            )}
          </div>
          <p className="text-[11px] tracking-[-0.01em] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {levelName} 등급
          </p>
        </div>
      </div>
      <div
        className="text-[12px] tracking-[0.05em] px-3.5 py-1.5"
        style={{
          fontFamily: 'var(--font-mono)',
          color: isPremium ? '#fff' : 'var(--purple-500)',
          background: isPremium ? 'var(--purple-500)' : 'transparent',
          border: isPremium ? 'none' : '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        Lv.{user.level}
      </div>
    </div>
  )
}
