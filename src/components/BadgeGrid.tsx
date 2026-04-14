'use client'

interface Badge {
  badge_type: string
  earned_at: string
}

interface BadgeGridProps {
  badges: Badge[]
}

const BADGE_DEFS: Record<string, { icon: string; label: string }> = {
  first_mission: { icon: '🎯', label: '첫 미션 완료' },
  '7day_streak': { icon: '🔥', label: '7일 연속 달성' },
  '30day_streak': { icon: '⭐', label: '30일 마스터' },
  level_up: { icon: '📈', label: '레벨 업' },
}

const ALL_BADGE_TYPES = ['first_mission', '7day_streak', '30day_streak', 'level_up']

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function BadgeGrid({ badges }: BadgeGridProps) {
  const earnedMap = new Map(badges.map((b) => [b.badge_type, b.earned_at]))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-800 mb-4">획득한 배지</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ALL_BADGE_TYPES.map((type) => {
          const def = BADGE_DEFS[type]
          const earnedAt = earnedMap.get(type)
          const earned = Boolean(earnedAt)

          return (
            <div
              key={type}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all
                ${earned
                  ? 'border-indigo-200 bg-indigo-50 shadow-md shadow-indigo-100'
                  : 'border-gray-100 bg-gray-50'
                }`}
            >
              <div
                className={`text-4xl transition-all
                  ${earned ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'grayscale opacity-30'}`}
              >
                {earned ? def.icon : '🔒'}
              </div>
              <span
                className={`text-xs font-medium text-center leading-tight
                  ${earned ? 'text-indigo-700' : 'text-gray-400'}`}
              >
                {def.label}
              </span>
              {earned && earnedAt ? (
                <span className="text-[10px] text-gray-400">{formatDate(earnedAt)}</span>
              ) : (
                <span className="text-[10px] text-gray-300">미획득</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
