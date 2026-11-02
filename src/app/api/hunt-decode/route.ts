import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const maxDuration = 30

const MAX_IMAGE_CHARS = 3_000_000
const CATEGORIES = ['기한', '조건', '금지', '요청', '책임', '변경', '안내']

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
  const targets: string[] = Array.isArray(body?.targets)
    ? body.targets.filter((t: unknown) => typeof t === 'string' && t.length <= 12).slice(0, 8)
    : []

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.startsWith('placeholder')) {
    return NextResponse.json({ error: '지금은 해독 기능을 쓸 수 없어요.', fallbackReason: 'no_key' }, { status: 503 })
  }

  const system = [
    '당신은 길거리 사진 속 한국어 글자를 읽고, 직장인이 이해하기 쉬운 말로 풀어주는 도우미입니다.',
    '이 앱은 실제 거리의 안내문·간판·공지·표지판·메뉴판·게시물에서 "해야 할 일, 조건, 기한, 금지, 변경" 같은 실용적인 안내 표현을 찾는 미션입니다.',
    '먼저 사진이 그런 실물 안내 글자를 담고 있는지 판단하세요. 휴대폰·TV·컴퓨터 화면을 찍은 사진, 영상 썸네일, SNS·유튜브 화면, 연예·광고 포스터, 단순 이름·상호만 있는 사진이면 found를 false로 하고 reason을 "not_notice"로 하세요. 글자가 흐리거나 읽을 수 없으면 reason을 "unreadable"로 하세요.',
    targets.length ? `오늘의 표현군: ${targets.join(', ')}. 이 중 하나가 들어간 문구가 있으면 반드시 그 문구를 고르세요. 없으면 다른 실용적 안내 표현을 고르세요.` : '',
    '규칙:',
    '- expression은 사람 이름·명사·상호가 아니라, 무엇을 해야 하는지/조건/기한/금지/변경을 알려주는 표현(예: 사전 예약, 접수 마감, 출입 금지)이어야 합니다. 그런 표현이 없으면 found를 false로 하세요.',
    '- sentence는 사진에 보이는 글자를 그대로 옮기세요. 없는 글자를 지어내지 마세요. 80자 이내.',
    '- expression은 sentence 안에 실제로 있는 핵심 표현 1~2개 단어입니다.',
    '- matchesTarget은 expression이 오늘의 표현군과 같거나 거의 같은 뜻이면 true.',
    '- easy는 sentence를 쉬운 말로 풀어쓴 한 문장 (예: "방문 전에 예약해야 합니다").',
    '- action은 읽은 사람이 해야 할 행동을 짧은 구절로 (예: "예약 여부 확인하기"). 해야 할 일이 없으면 "내용 기억해두기".',
    `- category는 ${CATEGORIES.join(', ')} 중 하나.`,
    '- box는 고른 문구가 있는 영역으로, 이미지 전체 대비 0~1 비율의 {x,y,w,h} (좌상단 기준)입니다.',
    '- 사람 얼굴, 이름, 전화번호 등 개인정보는 옮기지 마세요. 읽을 수 있는 한국어 글자가 없으면 found를 false로 하세요.',
    '- 한국어가 아닌 글자만 있어도 found는 false입니다.',
    '반드시 JSON만 반환: {"found":boolean,"reason":"","sentence":"","expression":"","matchesTarget":boolean,"easy":"","action":"","category":"","box":{"x":0,"y":0,"w":0,"h":0}}',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: [
              { type: 'text', text: '이 사진 속 글자를 해독해 주세요.' },
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

    if (!p?.found || typeof p.sentence !== 'string' || !p.sentence.trim()) {
      return NextResponse.json({ found: false, reason: p?.reason === 'unreadable' ? 'unreadable' : 'not_notice' })
    }
    const sentence = p.sentence.trim().slice(0, 120)
    const compact = (t: string) => t.replace(/\s+/g, '')
    const targetHit = targets.find((t) => compact(sentence).includes(compact(t)))
    let expression = typeof p.expression === 'string' ? p.expression.trim().slice(0, 20) : ''
    // 표현은 반드시 문장 안에 실제로 있어야 한다. 없으면 오늘의 표현군 단어, 그것도 없으면 거절
    if (!expression || !compact(sentence).includes(compact(expression))) {
      if (targetHit) expression = targetHit
      else return NextResponse.json({ found: false, reason: 'not_notice' })
    }
    return NextResponse.json({
      found: true,
      sentence,
      expression,
      matchesTarget: !!targetHit,
      easy: typeof p.easy === 'string' ? p.easy.trim().slice(0, 120) : '',
      action: typeof p.action === 'string' ? p.action.trim().slice(0, 60) : '',
      category: CATEGORIES.includes(p.category) ? p.category : '안내',
      box: normBox(p.box),
    })
  } catch (e) {
    console.error('hunt-decode exception', e)
    return NextResponse.json({ error: '해독에 실패했어요. 잠시 후 다시 시도해 주세요.', fallbackReason: 'exception' }, { status: 500 })
  }
}
