'use client'

interface StreakCalendarProps {
  currentStreak: number
  lastCompletedAt: string | null
}

export default function StreakCalendar({ currentStreak, lastCompletedAt }: StreakCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return d
  })

  const lastCompleted = lastCompletedAt ? new Date(lastCompletedAt) : null
  if (lastCompleted) lastCompleted.setHours(0, 0, 0, 0)

  function isDayCompleted(day: Date): boolean {
    if (!lastCompleted || currentStreak === 0) return false
    const diffDays = Math.floor((lastCompleted.getTime() - day.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays < currentStreak
  }

  const dayLabels = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">학습 현황</h3>
        {currentStreak > 0 ? (
          <span className="text-2xl font-bold text-indigo-600">
            🔥 {currentStreak}일 연속
          </span>
        ) : (
          <span className="text-sm text-gray-400">아직 시작 전이에요</span>
        )}
      </div>
      <div className="flex justify-between gap-1">
        {last7Days.map((day, i) => {
          const completed = isDayCompleted(day)
          const isToday = day.getTime() === today.getTime()
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-xs text-gray-400">{dayLabels[day.getDay()]}</span>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all
                  ${completed
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : isToday
                      ? 'border-2 border-indigo-300 text-indigo-400'
                      : 'border-2 border-gray-200 text-gray-300'
                  }`}
              >
                {completed ? '✓' : day.getDate()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
