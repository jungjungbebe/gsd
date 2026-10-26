'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StreakCalendar from '@/components/StreakCalendar'
import BadgeGrid from '@/components/BadgeGrid'

interface UserData {
  nickname: string | null
  email: string
  level: number
}

interface StreakData {
  current_streak: number
  longest_streak: number
  last_completed_at: string | null
}

interface BadgeData {
  badge_type: string
  earned_at: string
}

const EMPTY_USER: UserData = { nickname: null, email: '', level: 0 }
const EMPTY_STREAK: StreakData = { current_streak: 0, longest_streak: 0, last_completed_at: null }

const CARD = 'rounded-3xl border border-white/50 bg-white/15 backdrop-blur-xl'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData>(EMPTY_USER)
  const [streak, setStreak] = useState<StreakData>(EMPTY_STREAK)
  const [badges, setBadges] = useState<BadgeData[]>([])
  const [totalMissions, setTotalMissions] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const supabase = createClient()
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
          setLoading(false)
          return
        }

        setUser({ nickname: null, email: authUser.email ?? '', level: 0 })

        try {
          const { data: profile } = await supabase
            .from('users')
            .select('nickname, email, level')
            .eq('id', authUser.id)
            .single()

          if (profile) setUser(profile)
        } catch {
          // keep auth email
        }

        try {
          const { data: streakData } = await supabase
            .from('streaks')
            .select('current_streak, longest_streak, last_completed_at')
            .eq('user_id', authUser.id)
            .single()

          if (streakData) setStreak(streakData)
        } catch {
          // keep empty streak
        }

        try {
          const { data: badgeData } = await supabase
            .from('badges')
            .select('badge_type, earned_at')
            .eq('user_id', authUser.id)

          if (badgeData) setBadges(badgeData)
        } catch {
          // keep empty badges
        }

        try {
          const { count } = await supabase
            .from('submissions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', authUser.id)

          if (count !== null) setTotalMissions(count)
        } catch {
          // keep zero
        }
      } catch {
        // keep empty state
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-sm text-[#2a2035]/60">불러오는 중...</div>
      </div>
    )
  }

  const displayName = user.nickname || user.email.split('@')[0] || '게스트'

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 pt-6 pb-28">
      {/* Greeting */}
      <div className={`${CARD} p-6 flex items-center justify-between`}>
        <div>
          <p className="text-[#2a2035]/60 text-sm mb-1">반갑습니다!</p>
          <h1 className="text-2xl font-bold text-[#2a2035]">안녕하세요, {displayName}님!</h1>
        </div>
        <div className="bg-white/40 border border-white/50 text-[#6040a0] font-bold text-lg px-4 py-2 rounded-full">
          Lv.{user.level}
        </div>
      </div>

      {/* Streak Calendar */}
      <StreakCalendar
        currentStreak={streak.current_streak}
        lastCompletedAt={streak.last_completed_at}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`${CARD} p-5 text-center`}>
          <div className="text-3xl font-bold text-[#6040a0]">{totalMissions}</div>
          <div className="text-xs text-[#2a2035]/60 mt-1">완료한 미션</div>
        </div>
        <div className={`${CARD} p-5 text-center`}>
          <div className="text-3xl font-bold text-[#6040a0]">{streak.current_streak}</div>
          <div className="text-xs text-[#2a2035]/60 mt-1">현재 연속</div>
        </div>
        <div className={`${CARD} p-5 text-center`}>
          <div className="text-3xl font-bold text-[#6040a0]">{streak.longest_streak}</div>
          <div className="text-xs text-[#2a2035]/60 mt-1">최장 연속</div>
        </div>
      </div>

      {/* Badge Grid */}
      <BadgeGrid badges={badges} />

      {/* Quick Actions */}
      <div>
        <h2 className="font-semibold text-[#2a2035]/70 mb-3 px-1">빠른 이동</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            href="/missions"
            className="rounded-3xl bg-[#6040a0] text-white p-5 hover:bg-[#503590] transition"
          >
            <div className="text-2xl mb-2">🎯</div>
            <div className="font-semibold text-sm">오늘의 미션 하러 가기 →</div>
          </Link>
          <Link
            href="/contents"
            className={`${CARD} p-5 hover:bg-white/25 transition`}
          >
            <div className="text-2xl mb-2">📰</div>
            <div className="font-semibold text-sm text-[#2a2035]">내 레벨 콘텐츠 보기 →</div>
          </Link>
          <Link
            href="/diagnosis"
            className={`${CARD} p-5 hover:bg-white/25 transition`}
          >
            <div className="text-2xl mb-2">🔍</div>
            <div className="font-semibold text-sm text-[#2a2035]">문해력 재진단 →</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
