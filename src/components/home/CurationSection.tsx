'use client'

/**
 * 하단 큐레이션 섹션
 * - 에디터 픽, 레벨별 추천 콘텐츠, 오늘의 미션
 * - 29CM 매거진 그리드 + 닷슬래시대시의 위트있는 카피
 */
export default function CurationSection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="editorial-label mb-3">curation</p>
            <h2 className="editorial-heading text-2xl md:text-3xl">
              오늘, 당신을 위한 글
            </h2>
          </div>
          <span className="text-sm text-neutral-300 border-b border-neutral-100 pb-0.5">
            전체 보기
          </span>
        </div>

        {/* TODO: 큐레이션 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="editorial-card p-6">
              <div className="flex items-center justify-between mb-8">
                <span className="font-serif text-3xl text-neutral-100">
                  {String(i).padStart(2, '0')}
                </span>
                <span className="editorial-label">카테고리</span>
              </div>
              <div className="h-px bg-neutral-100 mb-6" />
              <h3 className="font-serif text-lg text-neutral-300 leading-snug mb-2">
                콘텐츠 제목
              </h3>
              <p className="text-sm text-neutral-200 leading-relaxed">
                콘텐츠 설명이 들어갈 자리입니다
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
