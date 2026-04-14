'use client'

import SubscriptionGate from '@/components/SubscriptionGate'

const FREE_SPOTS = [
  { number: '01', name: '을지로 충무빌딩 2층 카페', vibe: '조용한 오피스 감성', desc: '넓은 테이블과 콘센트가 넉넉한 을지로 카페. 점심 이후 한적한 시간대에 필사하기 좋습니다.', tag: '집중형' },
  { number: '02', name: '성수 대림창고 독서 라운지', vibe: '인더스트리얼 무드', desc: '리노베이션된 창고 공간의 독서 라운지. 높은 천장 아래 긴 테이블에서 몰입감 있게 필사할 수 있어요.', tag: '감성형' },
]

const PREMIUM_SPOTS = [
  { number: '03', name: '여의도 IFC 라이브러리 라운지', vibe: '비즈니스 엘리트 감성', desc: '금융가 한복판의 프라이빗 독서 공간.', tag: 'Premium', tip: '이 장소에 숨겨진 비즈니스 고수의 한자 어원 팁이 있어요' },
  { number: '04', name: '삼청동 수요서점 2층', vibe: '에디토리얼 큐레이션', desc: '매주 수요일 큐레이션이 바뀌는 독립서점.', tag: 'Premium', tip: '서점 주인장이 추천하는 문해력 향상 필독서 리스트를 확인하세요' },
]

function SpotItem({ spot, premium }: { spot: { number: string; name: string; vibe: string; desc: string; tag: string; tip?: string }; premium?: boolean }) {
  return (
    <div className="py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-start gap-4">
        <span className="text-2xl shrink-0 leading-none" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {spot.number}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[14px] font-medium tracking-[-0.02em] truncate" style={{ color: 'var(--text-primary)' }}>
              {spot.name}
            </h3>
            <span
              className="shrink-0 text-[9px] tracking-[0.1em] uppercase px-2 py-0.5"
              style={{
                fontFamily: 'var(--font-mono)',
                color: premium ? 'var(--purple-300)' : 'var(--text-secondary)',
                background: premium ? 'var(--glass-purple)' : 'var(--bg-elevated)',
                borderRadius: 'var(--radius-xl)',
              }}
            >
              {spot.tag}
            </span>
          </div>
          <p className="text-[10px] tracking-[0.02em] mb-1.5" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{spot.vibe}</p>
          <p className="text-[12px] tracking-[-0.01em] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{spot.desc}</p>
          {spot.tip && (
            <p className="text-[11px] tracking-[-0.01em] px-3 py-2 mt-2" style={{ color: 'var(--purple-300)', background: 'var(--glass-purple)', borderRadius: 'var(--radius-sm)' }}>
              {spot.tip}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WhereToPilsa({ isPremium }: { isPremium: boolean }) {
  return (
    <div className="py-8 px-5">
      <p className="label-mono text-center mb-2" style={{ color: 'var(--text-secondary)' }}>where to pilsa</p>
      <h2 className="font-serif text-xl text-center tracking-[-0.03em] leading-tight mb-2" style={{ color: 'var(--text-primary)' }}>
        필사하기 좋은 곳
      </h2>
      <p className="text-[12px] text-center tracking-[-0.01em] mb-6" style={{ color: 'var(--text-secondary)' }}>
        집중과 영감을 동시에 얻는 공간
      </p>

      {FREE_SPOTS.map((s) => <SpotItem key={s.number} spot={s} />)}

      <SubscriptionGate isSubscriber={isPremium} message="구독하고 비즈니스 고수의 한자 어원 팁을 읽어보세요">
        {PREMIUM_SPOTS.map((s) => <SpotItem key={s.number} spot={s} premium />)}
      </SubscriptionGate>
    </div>
  )
}
