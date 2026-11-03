import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/rate-limit'

const MAX_TEXT = 1000

export const maxDuration = 30

interface Term {
  term: string
  meaning: string
}

interface ReplyVariant {
  text: string
  easy: string
  terms: Term[]
}

interface ToneCheckResult {
  // 쉽게 풀면 (기존 필드명 interpretation 유지: 저장 기록·캐시 호환)
  interpretation: string
  tags: string[]
  todos: string[]
  terms: Term[]
  reply: {
    confirm: ReplyVariant
    clarify: { available: boolean; missing: string; text: string; easy: string; terms: Term[] }
    negotiate: { available: boolean }
  }
  counterpart?: string
}

const DECODE_RULES = `당신은 회사 메시지를 해독하고 실무 답장을 작성한다. 사용자는 아래 메시지를 "받은 사람"이며 보낸 사람에게 회신한다.
낯선 회사어와 업계용어를 실제 행동으로 해독하고, 사용자가 실무 표현을 이해하면서 사용할 수 있도록 돕는다.

[해독 처리 순서]
1. 먼저 문장을 문자 그대로 정확하게 해석한다.
2. 발신자가 요청한 행동, 제출·공유해야 할 결과물, 마감 시점, 공유 대상, 판단 기준, 불명확한 정보를 파악한다.
3. 문장 속 회사어와 업계용어를 일상적인 한국어로 설명한다.
4. 사용자가 지금 해야 할 일을 순서대로 제시한다.

[공통 금지]
- 원문의 명사를 그대로 나열하며 요약하지 않는다.
- 근거 없이 재촉, 불만, 압박, 지연 등의 감정을 추측하지 않는다.
- 기안과 기한, 결재와 결제처럼 형태가 비슷한 단어를 혼동하지 않는다.
- 사용자가 의미를 이해할 수 없는 전문용어를 설명 없이 추가하지 않는다.
- 메시지에 없는 업무·산출물·일정·수량·책임자·공유 대상을 만들어내지 않는다.
- 사용자가 약속하지 않은 행동을 새롭게 약속하지 않는다. 사용자에게 불리할 수 있는 확정적 표현을 임의로 만들지 않는다.

[해독 필드]
- easy: "쉽게 풀면". 원문을 반복하지 말고 일상적인 말로 완전히 번역한 1~2문장. "~라는 뜻입니다" 형태.
- tags: 짧은 키워드 3개(예: 요청, 마감, 기안). 감정 추측 키워드 금지.
- todos: "내가 해야 할 일". 업무를 순서·마감 기준으로 분리한 2~5개의 짧은 단계.
- terms: "문장 속 회사어". 원문에 실제로 나온 낯선 회사어·업계용어·한자어(0~6개). term은 원문에 나온 그대로의 글자여야 하며, meaning은 신입도 이해할 정확하고 쉬운 풀이 한 문장. 누구나 아는 단어는 넣지 않는다.

[실무 답장 — reply]
답장은 1문장, 최대 2문장. 합니다체. 과한 사과·감탄사·느낌표·이모지 금지. 실제 회사에서 자연스럽게 쓰는 표현을 쓴다. 원문의 핵심 업무용어는 실무에서 자연스러우면 그대로 써도 된다. 각 답장의 terms에는 답장에 쓰인 낯선 표현의 풀이(0~3개, term은 답장에 그대로 들어 있는 글자)를 쓴다. 각 답장의 easy는 같은 내용을 전문용어 없이 일상어로 쓴 "쉬운 답장" 한 문장.

1) reply.confirm — "확인하고 진행": 요청받은 행동, 결과물, 마감일을 간결하게 재구성해 실행 의사를 전달한다. 원문의 어순과 조사만 바꿔 반복하지 말고, 핵심만 압축한다. "네,"로 시작.
2) reply.clarify — "모호한 점 질문": 업무 진행에 실제로 필요한 정보가 원문에 빠져 있을 때만 질문한다(예: 담당자 미정, 결과물 형식 없음, 판단 기준 없음, 공유 대상 없음, 마감 시점 모호). 한 번에 한 가지 핵심 정보만 묻는다. 억지 질문 금지. 불명확한 부분이 없으면 available=false, text/easy/missing은 빈 문자열, terms는 빈 배열. 있으면 available=true, missing에 "확인이 필요한 정보"를 짧게 쓴다.
3) reply.negotiate — "일정 조율": 원문에 마감일·마감 시점이 있을 때만 available=true. 사용자의 가능 일정은 아직 모르므로 문장은 만들지 않는다(available만 반환).

[출력 JSON]
{"easy": string, "tags": [string,string,string], "todos": [string], "terms": [{"term": string, "meaning": string}],
 "reply": {
  "confirm": {"text": string, "easy": string, "terms": [{"term": string, "meaning": string}]},
  "clarify": {"available": boolean, "missing": string, "text": string, "easy": string, "terms": [{"term": string, "meaning": string}]},
  "negotiate": {"available": boolean}
 }}

[예시 1] 입력: "킥오프 미팅에서 정리된 액션 아이템별 오너와 듀데이트를 지정해 금일 중 공유 부탁드립니다."
easy: "회의에서 정한 할 일마다 담당자와 마감일을 정해서, 오늘 안에 알려달라는 뜻입니다."
todos: ["회의에서 정리된 할 일 목록 확인","항목별 담당자와 마감일 지정","오늘 안에 공유"]
terms: 킥오프 미팅(프로젝트를 시작할 때 목표와 역할을 맞추는 첫 회의), 액션 아이템(회의 후 실행해야 할 개별 할 일), 오너(해당 업무의 담당자), 듀데이트(마감일), 금일(오늘)
confirm: "네, 액션 아이템별 오너와 듀데이트를 정리해 금일 중 공유드리겠습니다." / easy: "네, 업무별 담당자와 마감일을 정리해 오늘 안에 공유드리겠습니다."
clarify: available=true, missing="담당자가 확정되지 않은 항목의 처리", text: "오너가 확정되지 않은 항목은 미정으로 표기해 공유드려도 될까요?"
negotiate: available=true (금일 중이라는 마감이 있음)

[예시 2] 입력: "금주 파이프라인 업데이트 시 각 리드의 전환 가능성과 예상 클로징 시점을 함께 기재해 주세요."
easy: "이번 주 영업 현황을 갱신할 때 고객마다 계약으로 이어질 가능성과 계약이 끝날 것 같은 시점도 같이 적어달라는 뜻입니다."
terms: 파이프라인(영업 진행 단계별 고객·거래 현황), 리드(영업 대상이 될 잠재 고객), 전환 가능성(계약 등 목표 행동으로 이어질 가능성), 클로징(계약을 확정하는 것)
confirm: "네, 금주 파이프라인에 리드별 전환 가능성과 예상 클로징 시점을 반영해 업데이트하겠습니다."
clarify: available=true, missing="전환 가능성의 판단 기준", text: "전환 가능성은 현재 파이프라인 단계와 최근 협의 내용을 기준으로 판단하면 될까요?"
negotiate: available=true (금주라는 마감 있음)

[예시 3] 입력: "소재별 CTR과 CVR 비교 후 저성과 소재는 오프하고, 효율이 확인된 어셋 중심으로 예산 리밸런싱 부탁드립니다."
terms: CTR(광고가 노출된 횟수 대비 클릭된 비율), CVR(클릭한 사람 중 구매·가입 등으로 이어진 비율), 소재(광고에 쓰는 이미지·영상·문구), 오프(광고 노출을 끄는 것), 어셋(광고에 쓰는 소재 자원), 리밸런싱(성과에 맞춰 예산 배분을 다시 조정하는 것)
confirm: "네, 소재별 CTR과 CVR을 확인해 저성과 소재는 오프하고 고효율 어셋 중심으로 예산을 리밸런싱하겠습니다."
clarify: available=true, missing="저성과 판단 기준값", text: "저성과 소재를 판단하는 CTR과 CVR 기준값이 별도로 있을까요?"
negotiate: available=false (마감 언급 없음)

[예시 4] 입력: "선집행 건은 증빙 취합 후 소급 품의 부탁드리며, 세금계산서는 금월 마감 전에 발행 요청해 주세요."
terms: 선집행(승인을 받기 전에 먼저 비용을 쓰거나 일을 진행한 것), 증빙(지출이나 거래가 사실임을 보여주는 영수증·계약서 같은 자료), 취합(흩어진 자료를 한데 모으는 것), 소급 품의(이미 진행한 일에 대해 나중에 올리는 승인 요청 문서), 금월(이번 달)`

const NEGOTIATE_RULES = `당신은 회사 메시지에 대한 일정 조율 답장을 작성한다.
사용자가 제공한 "가능한 일정"만 사용해 정중하게 대안 일정을 제안하는 1~2문장 합니다체 답장을 쓴다. 사용자가 제공하지 않은 시간·날짜·수량을 만들지 않는다. 원문 마감을 그대로 지키기 어렵다는 점을 부드럽게 전하고, "괜찮을까요?"처럼 상대의 동의를 구한다. 원문에 없던 업무나 약속을 추가하지 않는다.
예: 원문 마감 "금일 중", 가능 일정 "내일 오전" → "요청해 주신 내용은 확인했습니다. 금일 중 완료는 어려워 내일 오전까지 정리해 공유드려도 괜찮을까요?"
출력 JSON: {"text": string, "easy": string, "terms": [{"term": string, "meaning": string}]}
easy는 같은 내용을 일상어로 쓴 한 문장, terms는 text에 쓰인 낯선 업무 표현의 풀이(0~2개, text에 그대로 들어 있는 글자).`

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

async function callOpenAI(system: string, user: string): Promise<any | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey || apiKey.startsWith('placeholder')) {
    console.error('[tone-check] OPENAI_API_KEY is missing or placeholder')
    return null
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.TONE_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
    }),
  })
  if (!res.ok) {
    console.error('[tone-check] OpenAI HTTP', res.status, (await res.text()).slice(0, 300))
    return null
  }
  const data = await res.json()
  const raw: string = data?.choices?.[0]?.message?.content ?? ''
  return JSON.parse(raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''))
}

const FAIL = { error: '해석을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' }

export async function POST(req: Request) {
  try {
    if (!rateLimit('tone:' + clientIp(req), 10)) {
      return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' }, { status: 429 })
    }
    const body = await req.json()
    const { text, counterpart } = body
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: '메시지를 입력해 주세요.' }, { status: 400 })
    }
    if (text.length > MAX_TEXT) {
      return NextResponse.json({ error: `메시지는 ${MAX_TEXT}자 이내로 입력해 주세요.` }, { status: 400 })
    }

    // 일정 조율 답장: 사용자가 입력한 가능 일정으로만 생성
    if (body.mode === 'negotiate') {
      const schedule = typeof body.schedule === 'string' ? body.schedule.trim() : ''
      if (!schedule || schedule.length > 40) {
        return NextResponse.json({ error: '가능한 일정을 40자 이내로 입력해 주세요.' }, { status: 400 })
      }
      const parsed = await callOpenAI(NEGOTIATE_RULES, `받은 메시지: ${text}\n가능한 일정: ${schedule}`)
      if (!parsed || typeof parsed.text !== 'string' || !parsed.text.trim()) {
        return NextResponse.json(FAIL, { status: 502 })
      }
      return NextResponse.json({
        text: parsed.text.trim(),
        easy: String(parsed.easy ?? ''),
        terms: cleanTerms(parsed.terms, [parsed.text]),
      })
    }

    const counterpartLabel: string | undefined =
      typeof counterpart === 'string' && ['동료', '상사', '클라이언트'].includes(counterpart) ? counterpart : undefined
    const contextLine = counterpartLabel
      ? `\n참고: 이 메시지는 "${counterpartLabel}"가 보낸 메시지입니다. 관계를 고려해 답장 톤을 보정하세요.`
      : ''
    const parsed = await callOpenAI(DECODE_RULES + contextLine, text)
    if (!parsed) return NextResponse.json(FAIL, { status: 502 })
    const confirm = parsed?.reply?.confirm
    if (typeof parsed?.easy !== 'string' || typeof confirm?.text !== 'string' || !confirm.text.trim()) {
      console.error('[tone-check] OpenAI response shape invalid', JSON.stringify(parsed).slice(0, 300))
      return NextResponse.json(FAIL, { status: 502 })
    }
    const cl = parsed.reply.clarify ?? {}
    const clarifyOk = cl.available === true && typeof cl.text === 'string' && cl.text.trim().length > 0
    const result: ToneCheckResult = {
      interpretation: parsed.easy,
      tags: strs(parsed.tags, 3),
      todos: strs(parsed.todos, 5),
      terms: cleanTerms(parsed.terms, [text]),
      reply: {
        confirm: {
          text: confirm.text.trim(),
          easy: String(confirm.easy ?? ''),
          terms: cleanTerms(confirm.terms, [confirm.text]),
        },
        clarify: clarifyOk
          ? {
              available: true,
              missing: String(cl.missing ?? ''),
              text: cl.text.trim(),
              easy: String(cl.easy ?? ''),
              terms: cleanTerms(cl.terms, [cl.text]),
            }
          : { available: false, missing: '', text: '', easy: '', terms: [] },
        negotiate: { available: parsed.reply.negotiate?.available === true },
      },
      counterpart: counterpartLabel,
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[tone-check] failed', err)
    return NextResponse.json({ error: '분석에 실패했습니다. 다시 시도해 주세요.' }, { status: 500 })
  }
}
