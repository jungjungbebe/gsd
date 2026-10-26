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
    <div className="rounded-3xl border border-white/50 bg-white/15 backdrop-blur-xl p-6">
      <h3 className="font-semibold text-[#2a2035] mb-4">획득한 배지</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ALL_BADGE_TYPES.map((type) => {
          const def = BADGE_DEFS[type]
          const earnedAt = earnedMap.get(type)
          const earned = Boolean(earnedAt)

          return (
            <div
              key={type}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all
                ${earned
                  ? 'border-[#c0a8e0] bg-white/30 shadow-md shadow-[#6040a0]/15'
                  : 'border-white/40 bg-white/10'
                }`}
            >
              <div
                className={`text-4xl transition-all
                  ${earned ? 'drop-shadow-[0_0_8px_rgba(96,64,160,0.5)]' : 'grayscale opacity-30'}`}
              >
                {earned ? def.icon : '🔒'}
              </div>
              <span
                className={`text-xs font-medium text-center leading-tight
                  ${earned ? 'text-[#6040a0]' : 'text-[#2a2035]/50'}`}
              >
                {def.label}
              </span>
              {earned && earnedAt ? (
                <span className="text-[10px] text-[#2a2035]/50">{formatDate(earnedAt)}</span>
              ) : (
                <span className="text-[10px] text-[#2a2035]/40">미획득</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
