import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { MISSION_SETS, getTodaySet } from '@/lib/missionSets'

export const maxDuration = 30

const MAX_IMAGE_CHARS = 3_000_000
const MODEL = process.env.HUNT_MODEL || 'gpt-4o-mini'

interface Box {
  x: number
  y: number
  w: number
  h: number
}

function clamp01(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!isFinite(v)) return 0
  return Math.min(1, Math.max(0, v))
}

function normBox(b: any): Box | null {
  if (!b || typeof b !== 'object') return null
  const x = clamp01(b.x)
  const y = clamp01(b.y)
  const w = Math.min(clamp01(b.w), 1 - x)
  const h = Math.min(clamp01(b.h), 1 - y)
  if (w < 0.04 || h < 0.02) return null
  return { x, y, w, h }
}

const compact = (t: string) => t.replace(/\s+/g, '')

export async function POST(req: Request) {
  if (!rateLimit('hunt:' + clientIp(req), 6)) {
    return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' }, { status: 429 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 })
  }

  const image = typeof body?.image === 'string' ? body.image : ''
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: '사진을 읽을 수 없어요. 다시 찍어 주세요.' }, { status: 400 })
  }
  // 미션 설정은 서버에서 id로 찾는다 (서버 시간대와 사용자 시간대가 달라도 어긋나지 않게, 클라이언트가 오늘의 세트 id를 보낸다)
  // 이전 버전 화면이 setId 없이 호출해도 동작하도록, 못 찾으면 서버 기준 오늘의 세트를 쓴다
  const set = MISSION_SETS.find((s) => s.id === body?.setId) ?? getTodaySet()
  const h = set.hunt

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.startsWith('placeholder')) {
    return NextResponse.json({ error: '지금은 해독 기능을 쓸 수 없어요.', fallbackReason: 'no_key' }, { status: 503 })
  }

  const system = [
    '당신은 길거리 사진 속 한국어 글자를 읽고, 오늘의 미션과 맞는지 엄격하게 판정한 뒤 쉬운 말로 풀어주는 도우미입니다.',
    '',
    `오늘의 미션: ${h.label}을(를) 알려주는 표현 찾기`,
    `성공 판정 기준: ${h.matchRule}`,
    `제외 기준: ${h.exclude}`,
    '',
    '진행 순서:',
    '1. 사진 속 한국어 문장을 읽습니다. (read)',
    '2. 단어가 들어 있는지가 아니라 문장의 의사소통 기능으로 오늘의 미션과 맞는지 판정합니다. (mission_match)',
    '3. 맞지 않으면 즉시 중단합니다. expression, plain_meaning, answers는 null로 두고 reason에 한국어 한 문장으로 이유를 씁니다. (예: "이 문장은 콘텐츠 제목으로 보여요.")',
    '4. 맞을 때만 expression(문장 안에 실제로 있는, 뜻이 완결된 구절. 일반 명사 하나만 뽑지 않음)과 plain_meaning, answers를 작성합니다.',
    '',
    '규칙:',
    '- 실물 안내문·간판·공지·표지판·메뉴판·게시물만 대상입니다. 휴대폰·TV·컴퓨터 화면, 영상·SNS·유튜브 화면, 콘텐츠·영상 제목, 사람 이름, 상품명, 연예·광고 포스터, 일반 명사, 문맥 없는 단어는 모두 미션 불일치입니다.',
    '- 확신이 낮으면 미션 불일치로 처리합니다.',
    '- 읽을 수 있는 한국어 글자가 없거나 흐려서 읽을 수 없으면 read를 빈 문자열로 두고 mission_match는 false입니다.',
    '- read와 expression은 사진에 보이는 글자를 그대로 옮깁니다. 없는 글자를 지어내지 마세요. read는 80자 이내.',
    '- 질문을 사실로 바꾸거나, 원문에 없는 상황·행동·기한·조건·의도를 추측하지 마세요.',
    '- plain_meaning은 원문 의미를 바꾸지 않고 쉬운 말로 풀어쓴 한 문장입니다.',
    `- answers는 다음 질문 각각에 대해 {"q": 질문 그대로, "a": 답} 형태로 작성합니다: ${h.questions.map((q) => `"${q}"`).join(', ')}. 원문에 답이 직접 나와 있지 않으면 a는 null입니다. 지어내지 마세요.`,
    '- box는 read에 해당하는 글자가 있는 영역으로, 이미지 전체 대비 0~1 비율의 {x,y,w,h}(좌상단 기준)입니다.',
    '- 사람 얼굴, 이름, 전화번호 등 개인정보는 옮기지 마세요.',
    '',
    '반드시 JSON만 반환: {"read":"","mission_match":false,"reason":"","expression":null,"plain_meaning":null,"answers":[{"q":"","a":null}],"box":{"x":0,"y":0,"w":0,"h":0}}',
  ].join('\n')

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 500,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: [
              { type: 'text', text: '이 사진 속 글자를 판정하고 해독해 주세요.' },
              { type: 'image_url', image_url: { url: image, detail: 'high' } },
            ],
          },
        ],
      }),
    })
    if (!res.ok) {
      console.error('hunt-decode openai status', res.status)
      return NextResponse.json({ error: '해독에 실패했어요. 잠시 후 다시 시도해 주세요.', fallbackReason: `openai_http_${res.status}` }, { status: 502 })
    }
    const data = await res.json()
    let content: string = data?.choices?.[0]?.message?.content ?? ''
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const p = JSON.parse(content)

    const read = typeof p?.read === 'string' ? p.read.trim().slice(0, 120) : ''
    if (!read) return NextResponse.json({ kind: 'unreadable' })

    const expression = typeof p.expression === 'string' ? p.expression.trim().slice(0, 24) : ''
    // 미션 일치로 인정하려면 모델 판정 + 표현이 읽은 문장 안에 실제로 있어야 한다
    if (p.mission_match !== true || !expression || !compact(read).includes(compact(expression))) {
      const reason = typeof p?.reason === 'string' && p.reason.trim() ? p.reason.trim().slice(0, 80) : '확인하거나 행동해야 할 내용을 알려주는 표현은 아니에요.'
      return NextResponse.json({ kind: 'mismatch', read, reason })
    }

    const answers = (Array.isArray(p.answers) ? p.answers : [])
      .filter((a: any) => a && typeof a.q === 'string' && typeof a.a === 'string' && a.a.trim() && h.questions.includes(a.q))
      .map((a: any) => ({ q: a.q as string, a: (a.a as string).trim().slice(0, 80) }))

    return NextResponse.json({
      kind: 'matched',
      read,
      expression,
      plainMeaning: typeof p.plain_meaning === 'string' ? p.plain_meaning.trim().slice(0, 120) : '',
      answers,
      category: h.type,
      box: normBox(p.box),
    })
  } catch (e) {
    console.error('hunt-decode exception', e)
    return NextResponse.json({ error: '해독에 실패했어요. 잠시 후 다시 시도해 주세요.', fallbackReason: 'exception' }, { status: 500 })
  }
}
