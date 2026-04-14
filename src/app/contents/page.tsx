import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type Content = Database['public']['Tables']['contents']['Row']

const DEMO_CONTENTS: Content[] = [
  {
    id: 'demo-1',
    level: 1,
    type: 'article',
    title: '오늘의 날씨 이야기',
    body: '오늘은 날씨가 맑고 화창합니다. 바람이 살짝 불어 기분이 상쾌합니다. 오늘 하루도 활기차게 시작해 봅시다.',
    vocabulary_hints: [{ word: '화창', hint: '날씨가 맑고 밝음 (晴朗)' }],
    source: 'admin',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    level: 2,
    type: 'article',
    title: '직장 생활의 기본 예절',
    body: '직장에서의 소통은 매우 중요합니다. 상사에게 보고할 때는 핵심 사항을 먼저 말하는 것이 좋습니다. 또한 동료와의 협업 시 배려와 존중이 필수입니다. 금일(今日) 업무를 완료하지 못했다면 조기에 보고하는 것이 예의입니다.',
    vocabulary_hints: [
      { word: '금일', hint: '오늘 (今日: 이제 금, 날 일). 일상에서는 오늘이라고 하면 됩니다.' },
      { word: '조기', hint: '이른 시기에 (早期: 이를 조, 기약할 기)' },
    ],
    source: 'admin',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    level: 3,
    type: 'article',
    title: '공문서 이해하기',
    body: '공문서에는 어려운 한자어가 많이 사용됩니다. 예를 들어 "수신"은 문서를 받는 것, "발신"은 보내는 것을 의미합니다. "첨부"는 서류를 함께 보내는 것이고, "시행"은 실제로 실행함을 뜻합니다. 공문서를 읽을 때는 이러한 기본 용어를 먼저 파악하는 것이 중요합니다.',
    vocabulary_hints: [
      { word: '수신', hint: '받을 수(受) + 알릴 신(信): 문서나 연락을 받는 것' },
      { word: '발신', hint: '보낼 발(發) + 알릴 신(信): 문서나 연락을 보내는 것' },
      { word: '시행', hint: '실시할 시(施) + 행할 행(行): 실제로 실행함' },
    ],
    source: 'admin',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-4',
    level: 4,
    type: 'article',
    title: '비즈니스 커뮤니케이션의 핵심',
    body: '효과적인 비즈니스 커뮤니케이션을 위해서는 명확성과 간결성이 핵심입니다. 장황한 설명보다는 요점을 먼저 제시하고, 근거를 뒷받침하는 방식이 효과적입니다. 또한 상대방의 입장을 고려한 배려 있는 표현은 신뢰를 쌓는 데 큰 역할을 합니다. 이해관계자들과의 원활한 소통은 업무 성과에 직결됩니다.',
    vocabulary_hints: [
      { word: '장황', hint: '말이나 글이 너무 길고 복잡함 (張皇)' },
      { word: '이해관계자', hint: '어떤 일에 직접적인 이익이나 손해가 걸린 사람들' },
    ],
    source: 'admin',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-5',
    level: 5,
    type: 'article',
    title: '조직 내 갈등 해결과 중재',
    body: '조직 내 갈등은 불가피한 현상이나, 이를 건설적으로 해결하는 역량이 구성원의 핵심 역량으로 부상하고 있습니다. 갈등 당사자들의 입장을 경청하고 이해하는 것이 선행되어야 하며, 감정적 대응보다는 이성적 중재가 요구됩니다. 상호 이해를 바탕으로 한 합의점 도출이 지속 가능한 해결책의 근간이 됩니다.',
    vocabulary_hints: [
      { word: '불가피', hint: '피할 수 없음 (不可避: 아닐 불, 옳을 가, 피할 피)' },
      { word: '부상', hint: '떠오름, 중요해짐 (浮上: 뜰 부, 위 상)' },
      { word: '합의', hint: '서로 의견이 일치함 (合意: 합할 합, 뜻 의)' },
    ],
    source: 'admin',
    created_at: new Date().toISOString(),
  },
]

const LEVEL_LABELS: Record<number, string> = {
  1: 'Lv.1',
  2: 'Lv.2',
  3: 'Lv.3',
  4: 'Lv.4',
  5: 'Lv.5',
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-emerald-100 text-emerald-700',
  2: 'bg-sky-100 text-sky-700',
  3: 'bg-indigo-100 text-indigo-700',
  4: 'bg-violet-100 text-violet-700',
  5: 'bg-rose-100 text-rose-700',
}

async function fetchContents(): Promise<{ contents: Content[]; isDemo: boolean }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('contents')
      .select('*')
      .eq('type', 'article')
      .order('level', { ascending: true })
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return { contents: DEMO_CONTENTS, isDemo: true }
    }
    return { contents: data, isDemo: false }
  } catch {
    return { contents: DEMO_CONTENTS, isDemo: true }
  }
}

export default async function ContentsPage() {
  const { contents, isDemo } = await fetchContents()

  const byLevel: Record<number, Content[]> = {}
  for (const c of contents) {
    if (!byLevel[c.level]) byLevel[c.level] = []
    byLevel[c.level].push(c)
  }

  const levels = [1, 2, 3, 4, 5]

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">레벨별 콘텐츠</h1>
          <p className="text-gray-500 mt-1">내 수준에 맞는 글을 읽고 문해력을 키워보세요</p>
        </div>
        {isDemo && (
          <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
            데모 데이터
          </span>
        )}
      </div>

      {levels.map((level) => {
        const items = byLevel[level] ?? []
        if (items.length === 0) return null

        return (
          <section key={level} className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-bold px-3 py-1 rounded-full ${LEVEL_COLORS[level]}`}
              >
                {LEVEL_LABELS[level]}
              </span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((content) => (
                <Link
                  key={content.id}
                  href={`/contents/${content.id}`}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <h3 className="font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors leading-tight">
                      {content.title}
                    </h3>
                    <span
                      className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_COLORS[content.level]}`}
                    >
                      {LEVEL_LABELS[content.level]}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-3">
                    {content.body.slice(0, 100)}
                    {content.body.length > 100 ? '...' : ''}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                      {content.source === 'ai' ? 'AI 생성' : '관리자'}
                    </span>
                    <span className="text-xs text-indigo-500 group-hover:translate-x-0.5 transition-transform">
                      읽기 →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
