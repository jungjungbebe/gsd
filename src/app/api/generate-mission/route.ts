import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clientIp, rateLimit } from '@/lib/rate-limit'

const FALLBACK_MISSIONS = [
  { sentence: '번거로우시겠지만, 한 번만 더 검토해 주시면 감사하겠습니다.', category: '쿠션어' as const },
  { sentence: '금일 중으로 처리 부탁드립니다.', category: '업무메일' as const },
  { sentence: '수고가 많으십니다. 다름이 아니오라, 지난번에 말씀하신 건에 대해 여쭤보고 싶습니다.', category: '업무메일' as const },
  { sentence: '일리가 있습니다만, 저는 조금 다른 관점을 말씀드려도 될까요?', category: '쿠션어' as const },
  { sentence: '붙임 서류를 참조하시어 검토 후 회신 부탁드립니다.', category: '공문서' as const },
  { sentence: '해당 사안에 대해 심심한 사과의 말씀을 드립니다.', category: '쿠션어' as const },
  { sentence: '차주 월요일까지 검토 의견을 회신해 주시면 감사하겠습니다.', category: '업무메일' as const },
  { sentence: '아래 안건에 대하여 귀 부서의 협조를 요청드립니다.', category: '공문서' as const },
]

export async function POST(req: Request) {
  if (!rateLimit('mission:' + clientIp(req), 3)) {
    return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' }, { status: 429 })
  }
  try {
    let sentence: string
    let category: '쿠션어' | '업무메일' | '공문서' | '일반'

    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey && !apiKey.startsWith('placeholder')) {
      // Call OpenAI API to generate a new business Korean sentence
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: '당신은 한국어 비즈니스 문장 생성기입니다. 사회초년생이 필사를 통해 배울 만한 격식있는 한국어 문장 하나를 생성해주세요. 카테고리는 쿠션어, 업무메일, 공문서 중 하나입니다.',
            },
            {
              role: 'user',
              content: '오늘의 필사 미션 문장을 하나 생성해주세요. JSON 형식으로 { "sentence": "...", "category": "쿠션어|업무메일|공문서" } 반환.',
            },
          ],
          temperature: 0.8,
        }),
      })
      const data = await res.json()
      const parsed = JSON.parse(data.choices[0].message.content)
      sentence = parsed.sentence
      category = parsed.category
    } else {
      // Fallback: random from hardcoded list
      const pick = FALLBACK_MISSIONS[Math.floor(Math.random() * FALLBACK_MISSIONS.length)]
      sentence = pick.sentence
      category = pick.category
    }

    // Insert into DB
    try {
      const supabase = await createClient()
      await supabase.from('transcription_missions').insert({
        target_sentence: sentence,
        category,
        mission_date: new Date().toISOString().split('T')[0],
      })
    } catch {}

    return NextResponse.json({ sentence, category })
  } catch {
    const pick = FALLBACK_MISSIONS[Math.floor(Math.random() * FALLBACK_MISSIONS.length)]
    return NextResponse.json({ sentence: pick.sentence, category: pick.category })
  }
}
