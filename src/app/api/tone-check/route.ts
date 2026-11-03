import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/rate-limit'

const MAX_TEXT = 1000

export const maxDuration = 30

interface Term {
  term: string
  meaning: string
}

interface ToneCheckAlternative {
  id: string
  label: string
  reasoning: string
  reply: string
  easy: string
  replyTerms: Term[]
}

interface ToneCheckResult {
  // 쉽게 풀면 (기존 필드명 interpretation 유지: 저장 기록·캐시 호환)
  interpretation: string
  tags: string[]
  todos: string[]
  terms: Term[]
  response: { reasoning: string; reply: string; easy: string; replyTerms: Term[] }
  alternatives: ToneCheckAlternative[]
  counterpart?: string
}

const SYSTEM_PROMPT = `당신은 문장을 단순 요약하거나 원문을 반복하는 답장 생성기가 아니다.
낯선 회사어와 업계용어를 실제 행동으로 해독하고, 사용자가 실무 표현을 이해하면서 사용할 수 있도록 돕는다.
사용자는 아래 메시지를 "받은 사람"이며, 보낸 사람에게 회신할 답장을 만든다.

처리 순서:
1. 먼저 문장을 문자 그대로 정확하게 해석한다.
2. 발신자, 요청 행동, 결과물, 마감, 업무 순서를 추출한다.
3. 문장 속 회사어와 업계용어를 일상적인 한국어로 설명한다.
4. 사용자가 지금 해야 할 일을 순서대로 제시한다.
5. 해당 업계에서 자연스럽게 쓰는 표현 1~3개를 활용해 답장을 작성한다.
6. 답장에 사용한 낯선 실무 표현도 별도로 풀이한다.

금지 사항:
- 원문의 명사를 그대로 나열하며 요약하지 않는다.
- 입력문을 거의 그대로 복사해 답장하지 않는다.
- 근거 없이 재촉, 불만, 압박, 지연 등의 감정을 추측하지 않는다.
- 기안과 기한, 결재와 결제처럼 형태가 비슷한 단어를 혼동하지 않는다.
- 사용자가 의미를 이해할 수 없는 전문용어를 설명 없이 추가하지 않는다.
- 메시지에 없는 일정, 수량, 책임자를 임의로 만들어내지 않는다.
- 답장에서 원문의 문장을 어미만 바꿔 그대로 되풀이하지 않는다. 요청받은 행동을 "내가 하겠다"는 약속과 다음 공유 시점(원문에 있는 기준만)으로 압축해 쓴다.
- 상대가 지시·요청한 일에 대해 상대에게 의견이나 추가 요청을 되묻는 답장은 만들지 않는다(예: "추가 의견 있으시면 말씀해 주세요" 금지). 확인이 꼭 필요한 부분이 있을 때만 그 부분을 짧게 되묻는다.
- 답장에 원문의 회사어(예: EOD, 컨펌)를 그대로 쓰면 그 표현도 replyTerms에 풀이한다.

필드 규칙:
- easy: "쉽게 풀면". 원문을 반복하지 말고 일상적인 말로 완전히 번역한 1~2문장. 해요체가 아닌 "~라는 뜻입니다" 형태.
- tags: 짧은 키워드 3개(예: 요청, 마감, 기안). 감정 추측 키워드 금지.
- todos: "내가 해야 할 일". 업무를 순서·마감 기준으로 분리한 2~5개의 짧은 단계. 메시지에 없는 일정을 만들지 말 것.
- terms: "문장 속 회사어". 원문에 실제로 나온 낯선 회사어·업계용어·한자어(0~6개). term은 원문에 나온 그대로의 글자(부분 문자열)여야 하며, meaning은 일상어 풀이 한 문장. 누구나 아는 단어는 넣지 않는다. 낯선 표현이 없으면 빈 배열.
- response.reply: "회사어로 답장". 받았다는 말로 시작하는 합니다체 1~2문장. 과한 사과·감탄사·느낌표·이모지 금지. 해당 업계에서 자연스러운 실무 표현을 1~3개만 쓰고 도배하지 않는다. 원문 문장을 그대로 따라 말하지 않는다. 사용자가 정하지 않은 약속(구체적 시간·수량)은 지어내지 말고 필요하면 "확인 후 공유드리겠습니다"처럼 안전하게 쓴다.
- response.replyTerms: 답장에 사용한, 사용자가 모를 수 있는 실무 표현의 풀이(1~3개). term은 reply에 그대로 들어 있는 글자여야 한다.
- response.easy: 그 답장을 일상적인 말로 풀어 쓴 한 문장("쉬운 답장").
- response.reasoning: 이 답장이 어떤 방식인지 한 문장.
- alternatives: 서로 다른 대응 전략 정확히 3개. 지시·요청형 메시지라면 (1) 바로 수락하며 완료 시점 약속 (2) 진행 중간 공유를 덧붙임 (3) 범위·기준 중 모호한 한 가지만 확인 같은 방향으로 나눈다. 메시지에 없는 요청을 지어내지 않는다. 각각 id, label(짧은 명사구), reasoning(한 문장), reply, easy, replyTerms 포함.

반드시 아래 JSON만 출력한다.
{"easy": string, "tags": [string,string,string], "todos": [string], "terms": [{"term": string, "meaning": string}], "response": {"reasoning": string, "reply": string, "easy": string, "replyTerms": [{"term": string, "meaning": string}]}, "alternatives": [{"id": string, "label": string, "reasoning": string, "reply": string, "easy": string, "replyTerms": [{"term": string, "meaning": string}]}]}

[예시 1] 받은 메시지: "클라이언트 피드백 반영해서 베리에이션 디벨롭 후 EOD까지 컨펌 요청 부탁드립니다."
easy: "고객이 준 의견을 반영해 여러 가지 버전의 시안을 만들고, 오늘 업무가 끝나기 전까지 검토와 승인을 요청해 달라는 뜻입니다."
todos: ["클라이언트 피드백 확인","피드백을 반영한 여러 시안 제작","오늘 퇴근 전 검토 요청"]
terms: 클라이언트(업무를 의뢰한 고객사), 베리에이션(하나의 시안을 바탕으로 만든 여러 버전), 디벨롭(아이디어나 시안을 구체적으로 발전시키는 것), EOD(오늘 업무 종료 시점), 컨펌(검토 후 승인 또는 확정하는 것)
reply: "네, 피드백 반영해 옵션별 시안을 디벨롭하고 금일 EOD 전 컨펌 요청드리겠습니다."

[예시 2] 받은 메시지: "해당 건 금일 중 기안 후 팀장님 재가를 받아 총무팀에 전달 바랍니다."
easy: "오늘 안에 내부 승인 문서를 작성해 올리고, 팀장님의 승인을 받은 다음 총무팀에 전달하라는 뜻입니다."
todos: ["기안 작성","팀장님 승인(결재) 받기","총무팀에 전달"]
terms: 금일(오늘), 기안(업무를 진행하기 위해 승인 문서를 처음 작성하는 것), 재가(상급자가 검토하고 승인하는 것)
reply: "네, 금일 중 기안 상신 후 팀장님 결재가 완료되는 대로 총무팀에 전달하겠습니다."
replyTerms: 상신(작성한 문서를 상급자에게 올리는 것), 결재(책임자가 문서를 검토하고 승인하는 절차)

[예시 3] 받은 메시지: "현재 재고 소진율 확인 후 리오더 여부 검토 부탁드립니다. 발주 시 리드타임도 함께 공유해 주세요."
easy: "남은 재고와 판매 속도를 확인해서 추가 주문이 필요한지 판단하고, 주문한다면 상품이 들어오기까지 얼마나 걸리는지 알려달라는 뜻입니다."
todos: ["현재 남아 있는 재고 확인","판매 속도를 기준으로 재고 소진 시점 예상","추가 주문 필요 여부와 수량 검토","주문 후 예상 입고일 확인","위 내용을 정리해 공유"]
terms: 재고 소진율(확보한 재고 중 지금까지 판매되거나 사용된 비율), 리오더(이미 주문했던 상품을 추가로 주문하는 것), 발주(공급업체에 상품이나 자재를 공식적으로 주문하는 것), 리드타임(주문한 시점부터 실제 입고될 때까지 걸리는 기간)
reply: "네, 현재고와 판매 추이를 기준으로 소진 예상 시점을 확인한 뒤 리오더 필요 수량을 검토하겠습니다. 발주 진행 시 예상 입고일도 함께 정리해 공유드리겠습니다."
replyTerms: 현재고(지금 실제로 남아 있는 재고 수량), 판매 추이(일정 기간 동안 판매량이 어떻게 변하고 있는지), 예상 입고일(주문한 상품이 창고나 매장에 들어올 것으로 예상되는 날짜)`

function cleanTerms(raw: unknown, within: string[]): Term[] {
  if (!Array.isArray(raw)) return []
  const out: Term[] = []
  for (const t of raw) {
    const term = typeof t?.term === 'string' ? t.term.trim() : ''
    const meaning = typeof t?.meaning === 'string' ? t.meaning.trim() : ''
    if (!term || !meaning) continue
    // 본문에 실제로 있는 표현만 (밑줄 표시가 가능해야 함)
    if (!within.some((w) => w.includes(term))) continue
    if (out.some((o) => o.term === term)) continue
    out.push({ term, meaning })
    if (out.length >= 6) break
  }
  return out
}

function strs(raw: unknown, max: number): string[] {
  return Array.isArray(raw)
    ? raw.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim()).slice(0, max)
    : []
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
      typeof counterpart === 'string' && ['동료', '상사', '클라이언트'].includes(counterpart) ? counterpart : undefined

    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey || apiKey.startsWith('placeholder')) {
      console.error('[tone-check] OPENAI_API_KEY is missing or placeholder')
      return NextResponse.json({ error: '지금은 해석을 불러올 수 없어요. 잠시 후 다시 시도해 주세요.' }, { status: 503 })
    }

    const contextLine = counterpartLabel
      ? `\n참고: 이 메시지는 "${counterpartLabel}"가 보낸 메시지입니다. 관계를 고려해 답장 톤을 보정하세요.`
      : ''
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.TONE_MODEL || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + contextLine },
          { role: 'user', content: text },
        ],
        temperature: 0.2,
      }),
    })
    if (!res.ok) {
      console.error('[tone-check] OpenAI HTTP', res.status, (await res.text()).slice(0, 300))
      return NextResponse.json({ error: '해석을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' }, { status: 502 })
    }
    const data = await res.json()
    const raw: string = data?.choices?.[0]?.message?.content ?? ''
    const parsed = JSON.parse(raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''))
    if (
      typeof parsed?.easy !== 'string' ||
      typeof parsed?.response?.reply !== 'string' ||
      !Array.isArray(parsed?.alternatives)
    ) {
      console.error('[tone-check] OpenAI response shape invalid', raw.slice(0, 300))
      return NextResponse.json({ error: '해석을 불러오지 못했어요. 다시 시도해 주세요.' }, { status: 502 })
    }

    const mainReply: string = parsed.response.reply
    const result: ToneCheckResult = {
      interpretation: parsed.easy,
      tags: strs(parsed.tags, 3),
      todos: strs(parsed.todos, 5),
      terms: cleanTerms(parsed.terms, [text]),
      response: {
        reasoning: String(parsed.response.reasoning ?? ''),
        reply: mainReply,
        easy: String(parsed.response.easy ?? ''),
        replyTerms: cleanTerms(parsed.response.replyTerms, [mainReply]),
      },
      alternatives: parsed.alternatives.slice(0, 3).map((a: any, i: number) => {
        const reply = String(a?.reply ?? '')
        return {
          id: String(a?.id ?? `alt${i}`),
          label: String(a?.label ?? '다른 방향'),
          reasoning: String(a?.reasoning ?? ''),
          reply,
          easy: String(a?.easy ?? ''),
          replyTerms: cleanTerms(a?.replyTerms, [reply]),
        }
      }),
      counterpart: counterpartLabel,
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[tone-check] failed', err)
    return NextResponse.json({ error: '분석에 실패했습니다. 다시 시도해 주세요.' }, { status: 500 })
  }
}
