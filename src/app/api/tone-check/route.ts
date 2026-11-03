import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/rate-limit'

const MAX_TEXT = 1000

export const maxDuration = 30

interface Term {
  term: string
  meaning: string
}

interface ReplyOption {
  id: string
  label: string
  available: boolean
  needsInput: boolean
  inputPrompt: string
  placeholder: string
  note: string
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
  messageType: string
  options: ReplyOption[]
  counterpart?: string
}

interface OptDef {
  id: string
  label: string
  guide: string
  input?: { prompt: string; placeholder: string }
}

// 메시지 유형별 대응 방향 (id·라벨은 서버가 정하고, 문장만 AI가 만든다)
const TYPES: Record<string, { desc: string; options: OptDef[] }> = {
  action_request: {
    desc: '업무 수행 요청',
    options: [
      { id: 'proceed', label: '진행 확인', guide: '요청받은 행동·결과물·마감을 간결히 재구성해 실행 의사를 전한다. 원문의 어순과 조사만 바꿔 반복하지 않는다.' },
      { id: 'clarify', label: '정보 확인', guide: '업무 진행에 꼭 필요한데 원문에 빠진 정보(담당자·형식·기준·공유 대상·마감 모호)가 있을 때만 한 가지를 질문한다. 없으면 available=false.' },
      { id: 'schedule', label: '일정 조율', guide: '원문에 마감이 있을 때만 available=true. 문장은 사용자가 가능한 일정을 입력한 뒤 만들므로 text는 비운다.', input: { prompt: '언제까지 가능하신가요?', placeholder: '예: 내일 오전' } },
    ],
  },
  question: {
    desc: '정보나 판단을 묻는 질문',
    options: [
      { id: 'answer', label: '바로 답변', guide: '답변에 쓸 실제 내용은 사용자만 안다. text는 비운다.', input: { prompt: '답변에 쓸 실제 내용을 입력해 주세요', placeholder: '예: A, B 상품은 리오더 필요' } },
      { id: 'check', label: '확인 후 회신', guide: '확인한 뒤 회신하겠다는 답장. 확인할 기준(무엇을 근거로 볼지)은 말하되 구체적 사실·수치를 지어내지 않는다.' },
      { id: 'criteria', label: '기준 되묻기', guide: '질문의 기준·범위가 모호할 때만 기준 한 가지를 되묻는다. 모호하지 않으면 available=false.' },
    ],
  },
  approval_request: {
    desc: '승인 또는 결정 요청',
    options: [
      { id: 'approve', label: '승인', guide: '승인한다는 답장. 조건·금액 등 없는 내용을 지어내지 않는다.' },
      { id: 'revise', label: '수정 요청', guide: '수정할 내용은 사용자가 입력한다. text는 비운다.', input: { prompt: '어떤 수정이 필요한가요?', placeholder: '예: 예산 항목 보완' } },
      { id: 'hold', label: '판단 보류', guide: '검토 후 판단해 회신하겠다는 보류 답장.' },
    ],
  },
  status_check: {
    desc: '진행 상황 확인',
    options: [
      { id: 'share', label: '현재 상황 공유', guide: '현재 진행 상황은 사용자만 안다. text는 비운다.', input: { prompt: '현재 진행 상황을 알려주세요', placeholder: '예: 초안 작성 완료' } },
      { id: 'eta', label: '완료 일정 안내', guide: '완료 시점은 사용자만 안다. text는 비운다.', input: { prompt: '완료 가능한 시점은 언제인가요?', placeholder: '예: 내일 오전' } },
      { id: 'delay', label: '지연 사유 설명', guide: '지연 사유는 사용자만 안다. text는 비운다.', input: { prompt: '지연 사유는 무엇인가요?', placeholder: '예: 자료 수급 지연' } },
    ],
  },
  feedback: {
    desc: '평가·수정 의견·불만 전달',
    options: [
      { id: 'accept', label: '수용 후 반영', guide: '피드백을 받아들여 반영하겠다는 답장. 없는 수정 내용을 지어내지 않는다.' },
      { id: 'criteria', label: '구체적인 기준 질문', guide: '수정 방향·기준이 불명확할 때만 한 가지를 질문한다. 명확하면 available=false.' },
      { id: 'explain', label: '다른 의견 설명', guide: '사용자의 의견은 사용자만 안다. text는 비운다.', input: { prompt: '전하고 싶은 의견을 입력해 주세요', placeholder: '예: 일정상 일부만 반영 가능' } },
    ],
  },
  schedule_coordination: {
    desc: '일정 제안 또는 조율',
    options: [
      { id: 'accept', label: '일정 수락', guide: '제안된 일정을 수락하는 답장.' },
      { id: 'counter', label: '다른 일정 제안', guide: '가능한 일정은 사용자가 입력한다. text는 비운다.', input: { prompt: '가능한 일정은 언제인가요?', placeholder: '예: 수요일 오후' } },
      { id: 'attend', label: '참석 여부 확인', guide: '참석자·장소·안건 등 원문에 불명확한 점이 있을 때만 한 가지를 확인한다. 없으면 available=false.' },
    ],
  },
  information_notice: {
    desc: '단순 정보 전달',
    options: [
      { id: 'ack', label: '확인', guide: '잘 받았다는 짧은 확인 답장.' },
      { id: 'followup', label: '후속 질문', guide: '원문에서 실제로 더 확인할 점이 있을 때만 한 가지를 질문한다. 없으면 available=false.' },
    ],
  },
  issue_report: {
    desc: '문제나 오류 제기',
    options: [
      { id: 'acknowledge', label: '상황 인정', guide: '문제 제기를 인정하고 살펴보겠다는 답장. 원인·잘못을 단정하지 않는다.' },
      { id: 'investigate', label: '원인 확인', guide: '원인 파악을 위해 확인하겠다는 답장 또는 원인 확인에 필요한 정보 한 가지를 묻는 질문.' },
      { id: 'resolve', label: '해결 방향 제안', guide: '해결 방향은 사용자가 입력한다. text는 비운다.', input: { prompt: '해결 방향은 무엇인가요?', placeholder: '예: 오늘 중 재발행' } },
    ],
  },
}

const decodeRules = () => `당신은 회사 메시지를 해독하고 실무 답장을 작성한다. 사용자는 아래 메시지를 "받은 사람"이며 보낸 사람에게 회신한다.
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

[1단계: 메시지 유형 분류 — message_type]
답장을 쓰기 전에 입력 메시지의 주된 목적을 먼저 분류한다. 문장 형태가 아니라 실제 의도를 기준으로 한다. 물음표가 없어도 답변을 요구하면 question 또는 status_check일 수 있다. 여러 의도가 섞이면 가장 중요한 하나로 분류한다.
가능한 유형:
${TYPE_TABLE}

[2단계: 대응 방향별 답장 — options]
선택한 유형의 대응 방향 각각에 대해 reply_options 항목을 만든다. 각 항목의 id는 위 표의 id를 그대로 쓴다.
공통: 답장은 1문장, 최대 2문장. 합니다체. 과한 사과·감탄사·느낌표·이모지 금지. 실제 회사에서 자연스럽게 쓰는 표현. 원문의 핵심 업무용어는 자연스러우면 그대로 써도 된다.
핵심 원칙: 답을 모르는 질문에 그럴듯한 사실·수치·상품명·일정을 지어내지 않는다. 사용자만 아는 정보가 필요한 방향은 text를 빈 문자열로 둔다(available=true). 원문에 근거가 없어 억지로 만들어야 하는 질문·방향은 available=false로 하고 note에 이유를 한 줄로 쓴다(예: "추가로 확인할 내용이 명확하게 보이지 않습니다.").
- text: 답장 본문. easy: 같은 내용을 전문용어 없이 쓴 "쉬운 답장" 한 문장. terms: text에 쓰인 낯선 표현의 풀이(0~3개, term은 text에 그대로 들어 있는 글자). text가 비어 있으면 easy와 terms도 비운다.

[출력 JSON]
{"easy": string, "tags": [string,string,string], "todos": [string], "terms": [{"term": string, "meaning": string}],
 "message_type": string,
 "reply_options": [{"id": string, "available": boolean, "note": string, "text": string, "easy": string, "terms": [{"term": string, "meaning": string}]}]}

[예시 1] 입력: "킥오프 미팅에서 정리된 액션 아이템별 오너와 듀데이트를 지정해 금일 중 공유 부탁드립니다."
easy: "회의에서 정한 할 일마다 담당자와 마감일을 정해서, 오늘 안에 알려달라는 뜻입니다."
todos: ["회의에서 정리된 할 일 목록 확인","항목별 담당자와 마감일 지정","오늘 안에 공유"]
terms: 킥오프 미팅(프로젝트를 시작할 때 목표와 역할을 맞추는 첫 회의), 액션 아이템(회의 후 실행해야 할 개별 할 일), 오너(해당 업무의 담당자), 듀데이트(마감일), 금일(오늘)
message_type: action_request
proceed: "네, 액션 아이템별 오너와 듀데이트를 정리해 금일 중 공유드리겠습니다." / easy: "네, 업무별 담당자와 마감일을 정리해 오늘 안에 공유드리겠습니다."
clarify: available=true, "오너가 확정되지 않은 항목은 미정으로 표기해 공유드려도 될까요?"
schedule: available=true(금일 중이라는 마감이 있음), text 빈 문자열

[예시 2] 입력: "현재 재고 커버리지 기준으로 추가 리오더가 필요한 SKU가 있을까요?"
easy: "지금 남은 재고로 판매를 얼마나 이어갈 수 있는지 계산했을 때, 추가 주문이 필요한 상품이 있는지 묻는 말입니다."
terms: 재고 커버리지(현재 재고로 예상 판매량을 몇 주 또는 몇 달 동안 감당할 수 있는지 나타내는 수치), 리오더(이미 주문했던 상품을 추가로 주문하는 것), SKU(색상·사이즈 등 옵션별로 구분한 개별 상품 단위)
message_type: question
answer: available=true, text 빈 문자열(실제 상품 정보를 사용자가 입력해야 함)
check: "현재고와 최근 판매 추이를 기준으로 SKU별 재고 커버리지를 확인한 후 리오더 필요 여부를 공유드리겠습니다."
criteria: available=true, "재고 커버리지는 기존과 동일하게 4주 기준으로 검토하면 될까요?"

[예시 3] 입력: "소재별 CTR과 CVR 비교 후 저성과 소재는 오프하고, 효율이 확인된 어셋 중심으로 예산 리밸런싱 부탁드립니다."
terms: CTR(광고가 노출된 횟수 대비 클릭된 비율), CVR(클릭한 사람 중 구매·가입 등으로 이어진 비율), 소재(광고에 쓰는 이미지·영상·문구), 오프(광고 노출을 끄는 것), 어셋(광고에 쓰는 소재 자원), 리밸런싱(성과에 맞춰 예산 배분을 다시 조정하는 것)
message_type: action_request
proceed: "네, 소재별 CTR과 CVR을 확인해 저성과 소재는 오프하고 고효율 어셋 중심으로 예산을 리밸런싱하겠습니다."
clarify: available=true, "저성과 소재를 판단하는 CTR과 CVR 기준값이 별도로 있을까요?"
schedule: available=false, note "원문에 마감이 없어 일정 조율이 필요해 보이지 않습니다."

[예시 4] 입력: "선집행 건은 증빙 취합 후 소급 품의 부탁드리며, 세금계산서는 금월 마감 전에 발행 요청해 주세요."
terms: 선집행(승인을 받기 전에 먼저 비용을 쓰거나 일을 진행한 것), 증빙(지출이나 거래가 사실임을 보여주는 영수증·계약서 같은 자료), 취합(흩어진 자료를 한데 모으는 것), 소급 품의(이미 진행한 일에 대해 나중에 올리는 승인 요청 문서), 금월(이번 달)`

const INPUT_RULES = `당신은 회사 메시지에 대한 답장을 작성한다.
사용자가 제공한 "사용자 입력 정보"만 근거로, 지정된 대응 방향의 1~2문장 합니다체 답장을 쓴다. 사용자가 제공하지 않은 사실·시간·날짜·수량·상품명을 만들지 않는다. 원문에 없던 업무나 약속을 추가하지 않는다. 과한 사과·감탄사·느낌표·이모지 금지.
예: 원문 마감 "금일 중", 방향 "일정 조율", 입력 "내일 오전" → "요청해 주신 내용은 확인했습니다. 금일 중 완료는 어려워 내일 오전까지 정리해 공유드려도 괜찮을까요?"
출력 JSON: {"text": string, "easy": string, "terms": [{"term": string, "meaning": string}]}
easy는 같은 내용을 일상어로 쓴 한 문장, terms는 text에 쓰인 낯선 업무 표현의 풀이(0~2개, text에 그대로 들어 있는 글자).`

const TYPE_TABLE = Object.entries(TYPES)
  .map(([k, v]) => `- ${k} (${v.desc}): ` + v.options.map((o) => `${o.id}=${o.label}${o.input ? '[사용자 입력 필요]' : ''} → ${o.guide}`).join(' | '))
  .join('\n')

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

    // 사용자가 입력한 정보로 만드는 답장(일정·답변 내용·사유 등): 입력한 정보만 근거로 생성
    if (body.mode === 'option') {
      const type = TYPES[String(body.messageType)]
      const def = type?.options.find((o) => o.id === body.optionId)
      const info = typeof body.info === 'string' ? body.info.trim() : ''
      if (!def || !def.input) return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 })
      if (!info || info.length > 80) {
        return NextResponse.json({ error: '내용을 80자 이내로 입력해 주세요.' }, { status: 400 })
      }
      const parsed = await callOpenAI(
        INPUT_RULES,
        `받은 메시지: ${text}\n대응 방향: ${def.label} (${def.guide})\n사용자 입력 정보: ${info}`,
      )
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
    const parsed = await callOpenAI(decodeRules() + contextLine, text)
    if (!parsed) return NextResponse.json(FAIL, { status: 502 })
    const messageType: string = typeof parsed.message_type === 'string' && TYPES[parsed.message_type] ? parsed.message_type : 'action_request'
    if (typeof parsed?.easy !== 'string' || !Array.isArray(parsed?.reply_options)) {
      console.error('[tone-check] OpenAI response shape invalid', JSON.stringify(parsed).slice(0, 300))
      return NextResponse.json(FAIL, { status: 502 })
    }
    const options: ReplyOption[] = TYPES[messageType].options.map((def) => {
      const o = parsed.reply_options.find((x: any) => x?.id === def.id) ?? {}
      const needsInput = !!def.input
      const textRaw = typeof o.text === 'string' ? o.text.trim() : ''
      // 입력이 필요한 방향은 본문을 비우고, 그 외 방향은 본문이 있어야 사용 가능
      const available = needsInput ? o.available !== false : o.available !== false && textRaw.length > 0
      const text = needsInput ? '' : available ? textRaw : ''
      return {
        id: def.id,
        label: def.label,
        available,
        needsInput,
        inputPrompt: def.input?.prompt ?? '',
        placeholder: def.input?.placeholder ?? '',
        note: available ? '' : String(o.note || '추가로 확인할 내용이 명확하게 보이지 않습니다.'),
        text,
        easy: text ? String(o.easy ?? '') : '',
        terms: text ? cleanTerms(o.terms, [text]) : [],
      }
    })
    if (!options.some((o) => o.available)) {
      return NextResponse.json(FAIL, { status: 502 })
    }
    const result: ToneCheckResult = {
      interpretation: parsed.easy,
      tags: strs(parsed.tags, 3),
      todos: strs(parsed.todos, 5),
      terms: cleanTerms(parsed.terms, [text]),
      messageType,
      options,
      counterpart: counterpartLabel,
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[tone-check] failed', err)
    return NextResponse.json({ error: '분석에 실패했습니다. 다시 시도해 주세요.' }, { status: 500 })
  }
}
