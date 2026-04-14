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

const DEMO_USER: UserData = { nickname: '데모 사용자', email: 'demo@example.com', level: 3 }
const DEMO_STREAK: StreakData = { current_streak: 5, longest_streak: 12, last_completed_at: new Date().toISOString() }
const DEMO_BADGES: BadgeData[] = [
  { badge_type: 'first_mission', earned_at: '2024-12-01T09:00:00Z' },
  { badge_type: '7day_streak', earned_at: '2024-12-08T09:00:00Z' },
]
const DEMO_MISSIONS_TOTAL = 23

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData>(DEMO_USER)
  const [streak, setStreak] = useState<StreakData>(DEMO_STREAK)
  const [badges, setBadges] = useState<BadgeData[]>(DEMO_BADGES)
  const [totalMissions, setTotalMissions] = useState(DEMO_MISSIONS_TOTAL)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const supabase = createClient()
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
          // In demo mode (Supabase unreachable), show demo data instead of redirecting
          setLoading(false)
          return
        }

        // Fetch user profile
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('nickname, email, level')
            .eq('id', authUser.id)
            .single()

          if (profile) setUser(profile)
        } catch {
          setUser({ nickname: null, email: authUser.email ?? '', level: 3 })
        }

        // Fetch streak
        try {
          const { data: streakData } = await supabase
            .from('streaks')
            .select('current_streak, longest_streak, last_completed_at')
            .eq('user_id', authUser.id)
            .single()

          if (streakData) setStreak(streakData)
        } catch {
          // keep demo streak
        }

        // Fetch badges
        try {
          const { data: badgeData } = await supabase
            .from('badges')
            .select('badge_type, earned_at')
            .eq('user_id', authUser.id)

          if (badgeData) setBadges(badgeData)
        } catch {
          // keep demo badges
        }

        // Fetch total missions completed
        try {
          const { count } = await supabase
            .from('submissions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', authUser.id)

          if (count !== null) setTotalMissions(count)
        } catch {
          // keep demo total
        }
      } catch {
        // All Supabase calls failed — demo data already set
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-gray-400 text-sm">불러오는 중...</div>
      </div>
    )
  }

  const displayName = user.nickname || user.email

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Greeting */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm mb-1">반갑습니다!</p>
          <h1 className="text-2xl font-bold text-gray-900">안녕하세요, {displayName}님!</h1>
        </div>
        <div className="bg-indigo-100 text-indigo-700 font-bold text-lg px-4 py-2 rounded-full">
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
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <div className="text-3xl font-bold text-indigo-600">{totalMissions}</div>
          <div className="text-xs text-gray-500 mt-1">완료한 미션</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <div className="text-3xl font-bold text-orange-500">{streak.current_streak}</div>
          <div className="text-xs text-gray-500 mt-1">현재 연속</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <div className="text-3xl font-bold text-green-600">{streak.longest_streak}</div>
          <div className="text-xs text-gray-500 mt-1">최장 연속</div>
        </div>
      </div>

      {/* Badge Grid */}
      <BadgeGrid badges={badges} />

      {/* Quick Actions */}
      <div>
        <h2 className="font-semibold text-gray-700 mb-3 px-1">빠른 이동</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            href="/missions"
            className="bg-indigo-600 text-white rounded-2xl p-5 hover:bg-indigo-700 transition group"
          >
            <div className="text-2xl mb-2">🎯</div>
            <div className="font-semibold text-sm">오늘의 미션 하러 가기 →</div>
          </Link>
          <Link
            href="/contents"
            className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-sm transition"
          >
            <div className="text-2xl mb-2">📰</div>
            <div className="font-semibold text-sm text-gray-800">내 레벨 콘텐츠 보기 →</div>
          </Link>
          <Link
            href="/diagnosis"
            className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-sm transition"
          >
            <div className="text-2xl mb-2">🔍</div>
            <div className="font-semibold text-sm text-gray-800">문해력 재진단 →</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
