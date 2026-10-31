import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/rate-limit'

const MAX_TEXT = 1000

export const maxDuration = 30

interface ToneCheckResult {
  interpretation: string
  tags: string[]
  evidenceCount: number
  evidenceDistribution: { label: string; pct: number }[]
  response: { reasoning: string; reply: string }
  alternatives: { id: string; label: string; reasoning: string; reply: string }[]
  isSample: boolean
  counterpart?: string
  fallbackReason?: string
}

const FALLBACK_PROFILES: Omit<ToneCheckResult, 'isSample' | 'counterpart'>[] = [
  {
    interpretation: '오늘 안에 처리를 기대하지만, 정확한 마감은 열어둔 요청으로 읽힐 수 있어요.',
    tags: ['당일 처리 기대 ↑', '협의 여지 있음', '마감 불명확'],
    evidenceCount: 42,
    evidenceDistribution: [
      { label: '당일 처리', pct: 58 },
      { label: '가능하면 오늘', pct: 29 },
      { label: '일정 협의', pct: 13 },
    ],
    response: {
      reasoning: '마감 시간을 먼저 확인하면서 수락 여부는 열어두는 방법이에요.',
      reply: '확인했습니다. 혹시 몇 시까지 필요하신지 알려주시면 현재 업무와 조율해 진행하겠습니다.',
    },
    alternatives: [
      { id: 'accept', label: '바로 수락', reasoning: '지금 바로 처리 가능하다는 확답이 필요한 상황이에요.', reply: '네, 바로 처리하겠습니다.' },
      { id: 'schedule', label: '일정 조율', reasoning: '바로 처리하기보다, 필요한 일정을 먼저 협의하는 방법이에요.', reply: '확인했습니다. 지금 진행 중인 업무가 있어 내일 오전까지 시간 주시면 정리해서 전달드리겠습니다. 괜찮으실까요?' },
      { id: 'alt', label: '대안 제시', reasoning: '요청 그대로보다 다른 방식을 먼저 제안하는 방법이에요.', reply: '전체를 오늘 중 완료하기는 어려울 것 같아, 핵심 부분만 우선 정리해서 오늘 드리고 나머지는 내일 이어가도 될까요?' },
    ],
  },
  {
    interpretation: '단순히 "아쉽다"는 평가라기보다, 수정이나 보완을 기대하는 피드백으로 받아들여질 수 있어요.',
    tags: ['수정 기대 ↑', '구체성 낮음', '추가 확인 필요'],
    evidenceCount: 37,
    evidenceDistribution: [
      { label: '수정 범위 확인', pct: 51 },
      { label: '우선순위 확인', pct: 32 },
      { label: '일단 반영', pct: 17 },
    ],
    response: {
      reasoning: '어느 부분을 보완하면 될지 구체적으로 되묻는 방법이에요.',
      reply: '확인했습니다. 구체적으로 어느 부분을 보완하면 좋을지 조금만 더 말씀해 주시면 반영해서 다시 전달드리겠습니다.',
    },
    alternatives: [
      { id: 'scope', label: '수정 범위 확인', reasoning: '전체 수정인지 일부 수정인지부터 확인하는 방법이에요.', reply: '네, 확인했습니다. 전체적으로 다시 정리할지, 일부만 보완하면 될지 여쭤봐도 될까요?' },
      { id: 'priority', label: '우선순위 확인', reasoning: '지금 바로 반영해야 하는지 시급성을 먼저 확인하는 방법이에요.', reply: '확인했습니다. 혹시 언제까지 반영하면 좋을지 알려주시면 우선순위 조정해서 진행하겠습니다.' },
      { id: 'proceed', label: '일단 반영', reasoning: '되묻지 않고 먼저 개선안을 만들어 다시 공유하는 방법이에요.', reply: '확인했습니다. 제가 판단해서 한 차례 보완한 뒤 다시 공유드리겠습니다.' },
    ],
  },
  {
    interpretation: '단순 확인 요청이지만, 회신이 늦어지고 있다는 가벼운 재촉의 뉘앙스가 담겨 있을 수 있어요.',
    tags: ['재촉 뉘앙스 있음', '완곡한 표현', '회신 지연 인지'],
    evidenceCount: 29,
    evidenceDistribution: [
      { label: '즉시 회신', pct: 46 },
      { label: '일정 안내', pct: 38 },
      { label: '단순 확인만', pct: 16 },
    ],
    response: {
      reasoning: '늦어진 점을 짧게 인정하고, 예상 일정을 함께 안내하는 방법이에요.',
      reply: '확인이 늦어져 죄송합니다. 오늘 중으로 진행 상황 정리해서 다시 안내드리겠습니다.',
    },
    alternatives: [
      { id: 'now', label: '즉시 회신', reasoning: '바로 결론부터 전달하는 방법이에요.', reply: '확인했습니다. 지금 바로 진행 상황 공유드리겠습니다.' },
      { id: 'timeline', label: '일정 안내', reasoning: '정확한 회신 시점을 먼저 못박아 안심시키는 방법이에요.', reply: '확인했습니다. 오늘 오후까지 정리해서 회신드리겠습니다.' },
      { id: 'ack', label: '단순 확인만', reasoning: '가볍게 확인했다는 사실만 짧게 전달하는 방법이에요.', reply: '네, 확인했습니다. 곧 안내드리겠습니다.' },
    ],
  },
]

function pickFallback(text: string): Omit<ToneCheckResult, 'isSample' | 'counterpart'> {
  if (/오늘|급히|빨리|당장|asap/i.test(text)) return FALLBACK_PROFILES[0]
  if (/아쉽|부족|다시|보완|수정/.test(text)) return FALLBACK_PROFILES[1]
  return FALLBACK_PROFILES[2]
}

export async function POST(req: Request) {
  try {
    if (!rateLimit('tone:' + clientIp(req), 10)) {
      return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' }, { status: 429 })
    }
    const { text, counterpart } = await req.json()
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: '메시지를 입력해 주세요.' }, { status: 400 })
    }
    if (text.length > MAX_TEXT) {
      return NextResponse.json({ error: `메시지는 ${MAX_TEXT}자 이내로 입력해 주세요.` }, { status: 400 })
    }
    const counterpartLabel: string | undefined =
      typeof counterpart === 'string' && ['동료', '상사', '클라이언트'].includes(counterpart)
        ? counterpart
        : undefined

    let fallbackReason = 'no_key'
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (apiKey && !apiKey.startsWith('placeholder')) {
      try {
        const contextLine = counterpartLabel
          ? `\n참고: 이 메시지는 "${counterpartLabel}"가 보낸 메시지입니다. 관계를 고려해서 해석과 답장 톤을 보정하세요.`
          : ''
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  '당신은 한국 직장인이 받은 메시지의 톤을 해석하고 답장을 제안하는 어시스턴트입니다. 사용자는 아래 메시지를 "받은 사람"이고, 상대에게 보낼 답장을 제안해야 합니다. 아래 JSON 스키마로만 응답하고 다른 텍스트는 포함하지 마세요.\n' +
                  '{"interpretation": string, "tags": [string,string,string], "response": {"reasoning": string, "reply": string}, "alternatives": [{"id": string, "label": string, "reasoning": string, "reply": string}] (정확히 3개)}\n' +
                  '[해석 규칙] interpretation은 2문장 이내로, 보낸 사람이 실제로 원하는 것(요청/확인/재촉 등)과 뉘앙스를 짚으세요. 예: "리마인드"는 이전 요청에 아직 회신이 없다는 뜻, "금일 중"은 오늘 안에 답이 필요하다는 마감입니다. 메시지를 그대로 되풀이하지 마세요. tags는 짧은 키워드 3개입니다.\n' +
                  '[답장 규칙] 모든 reply는 사용자가 그대로 보내도 어색하지 않은 자연스러운 답장이어야 합니다. 보통 "네, 확인했습니다."처럼 받았다는 말로 시작하세요. 담백한 업무 말투(합니다체)로 1~2문장만 쓰고, 과한 사과, 감탄사, 느낌표, 이모지는 쓰지 마세요. 보낸 사람의 문장을 그대로 따라 말하지 마세요(예: "발주서 송부를 확인하겠습니다"처럼 어색하게 되풀이하는 것은 금지). 메시지에 없는 사실이나 사용자가 정하지 않은 약속(구체적 시간, 처리 완료 등)을 지어내지 말고, 필요하면 "확인 후 회신드리겠습니다"처럼 안전한 표현이나 [시간] 같은 빈칸을 쓰세요. alternatives 3개는 서로 다른 대응 전략이어야 하고(예: 즉시 확인 / 진행상황 공유 / 일정 조율), label은 짧은 명사구, reasoning은 한 문장으로 쓰세요.\n' +
                  '[예시] 받은 메시지: "발주서 송부건 관련하여 리마인드 드립니다. 금일 중으로 확인 부탁드립니다." → interpretation: "이전에 요청한 발주서 송부 건에 아직 회신이 없어 다시 챙기는 메시지예요. 오늘 안에 확인 답변이 필요해요." / reply: "네, 확인했습니다. 오늘 중으로 회신드리겠습니다."' +
                  contextLine,
              },
              { role: 'user', content: text },
            ],
            temperature: 0.4,
          }),
        })
        if (!res.ok) {
          const body = (await res.text()).slice(0, 300)
          console.error('[tone-check] OpenAI HTTP', res.status, body)
          fallbackReason = `openai_http_${res.status}`
        } else {
          const data = await res.json()
          const raw: string = data?.choices?.[0]?.message?.content ?? ''
          const cleaned = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
          const parsed = JSON.parse(cleaned)
          const ok =
            typeof parsed?.interpretation === 'string' &&
            Array.isArray(parsed?.tags) &&
            typeof parsed?.response?.reply === 'string' &&
            Array.isArray(parsed?.alternatives)
          if (!ok) {
            console.error('[tone-check] OpenAI response shape invalid', cleaned.slice(0, 300))
            fallbackReason = 'bad_shape'
          } else {
            const result: ToneCheckResult = {
              interpretation: parsed.interpretation,
              tags: parsed.tags.slice(0, 3),
              response: {
                reasoning: String(parsed.response.reasoning ?? ''),
                reply: parsed.response.reply,
              },
              alternatives: parsed.alternatives.slice(0, 3).map((a: any, i: number) => ({
                id: String(a?.id ?? `alt${i}`),
                label: String(a?.label ?? '다른 방향'),
                reasoning: String(a?.reasoning ?? ''),
                reply: String(a?.reply ?? ''),
              })),
              evidenceCount: 0,
              evidenceDistribution: [],
              isSample: false,
              counterpart: counterpartLabel,
            }
            return NextResponse.json(result)
          }
        }
      } catch (err) {
        console.error('[tone-check] OpenAI call failed', err)
        fallbackReason = 'exception'
      }
    } else {
      console.error('[tone-check] OPENAI_API_KEY is missing or placeholder')
    }

    const fallback = pickFallback(text)
    const result: ToneCheckResult = { ...fallback, isSample: true, counterpart: counterpartLabel, fallbackReason }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: '분석에 실패했습니다.' }, { status: 500 })
  }
}
