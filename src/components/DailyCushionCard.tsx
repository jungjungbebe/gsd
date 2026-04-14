'use client'

import { useMemo } from 'react'

const CUSHION_PHRASES = [
  {
    phrase: '번거로우시겠지만, 한 번만 더 확인 부탁드려도 될까요?',
    situation: '상사에게 재검토 요청할 때',
    tip: '"확인 부탁드립니다"보다 부드러운 표현이에요.',
  },
  {
    phrase: '혹시 괜찮으시다면, 이 부분만 수정해 주실 수 있을까요?',
    situation: '상사의 작업물에 수정이 필요할 때',
    tip: '"괜찮으시다면"은 상대의 선택권을 존중하는 쿠션어예요.',
  },
  {
    phrase: '제가 잘못 이해한 걸 수도 있는데, 이 부분이 조금 다른 것 같아서요.',
    situation: '상사의 실수를 지적해야 할 때',
    tip: '내 탓으로 돌리면서 시작하면 상대가 방어적이지 않아요.',
  },
  {
    phrase: '죄송하지만 해당 일정은 어려울 것 같습니다. 다른 방법을 찾아볼까요?',
    situation: '무리한 요청을 정중히 거절할 때',
    tip: '거절 + 대안 제시는 프로의 화법이에요.',
  },
  {
    phrase: '말씀하신 의도를 정확히 반영하고 싶어서 여쭤보는 건데요.',
    situation: '지시가 불명확해서 다시 물어볼 때',
    tip: '"모르겠어요" 대신 상대의 의도를 존중하는 표현이에요.',
  },
  {
    phrase: '조심스럽지만, 이 방향으로 진행하면 일정이 촉박할 수 있을 것 같습니다.',
    situation: '상사의 방향에 우려를 전달할 때',
    tip: '"조심스럽지만"은 반대 의견을 부드럽게 꺼내는 열쇠예요.',
  },
  {
    phrase: '감사하게도 제안해 주셨는데, 현재 업무량상 수용이 어려울 것 같습니다.',
    situation: '추가 업무를 정중히 거절할 때',
    tip: '감사 표현 후 상황을 설명하면 거절도 부드러워져요.',
  },
  {
    phrase: '실례가 안 된다면, 마감일을 하루만 조정할 수 있을까요?',
    situation: '데드라인 연장을 요청할 때',
    tip: '"실례가 안 된다면"으로 시작하면 부담이 줄어들어요.',
  },
  {
    phrase: '혹시 제가 놓친 부분이 있을까 싶어 한 번 더 여쭤봅니다.',
    situation: '재확인이 필요할 때',
    tip: '내가 부족할 수 있다는 겸손함이 쿠션 역할을 해요.',
  },
  {
    phrase: '의견을 드려도 괜찮을까요? 이렇게 하면 조금 더 효율적일 것 같아서요.',
    situation: '상사에게 대안을 제안할 때',
    tip: '허락을 구하고 시작하면 제안이 훨씬 잘 받아들여져요.',
  },
]

function getTodayIndex(): number {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  return seed % CUSHION_PHRASES.length
}

export default function DailyCushionCard() {
  const todayPhrase = useMemo(() => CUSHION_PHRASES[getTodayIndex()], [])

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 rounded-2xl border border-indigo-100 p-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">🛡️</span>
        <h2 className="text-lg font-bold text-gray-800">오늘의 생존 쿠션어</h2>
        <span className="ml-auto text-xs text-indigo-400 font-medium bg-indigo-50 px-2.5 py-1 rounded-full">
          매일 업데이트
        </span>
      </div>

      {/* Situation tag */}
      <div className="inline-block bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
        {todayPhrase.situation}
      </div>

      {/* Main phrase */}
      <blockquote className="text-xl md:text-2xl font-semibold text-gray-900 leading-relaxed mb-5 pl-4 border-l-4 border-indigo-400">
        &ldquo;{todayPhrase.phrase}&rdquo;
      </blockquote>

      {/* Tip */}
      <div className="flex items-start gap-2 bg-white/70 rounded-xl px-4 py-3">
        <span className="text-sm mt-0.5">💡</span>
        <p className="text-sm text-gray-600 leading-relaxed">
          <span className="font-semibold text-indigo-600">TIP</span>{' '}
          {todayPhrase.tip}
        </p>
      </div>
    </section>
  )
}
