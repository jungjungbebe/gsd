import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEMO_MISSION = {
  id: 'demo-mission-1',
  content_id: null,
  target_sentence: '번거로우시겠지만, 한 번만 더 검토해 주시면 감사하겠습니다.',
  category: '쿠션어' as const,
  mission_date: new Date().toISOString().split('T')[0],
  created_at: new Date().toISOString(),
}

export async function GET() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('transcription_missions')
      .select('*')
      .eq('mission_date', today)
      .single()

    if (error || !data) {
      return NextResponse.json({ mission: DEMO_MISSION, isDemo: true })
    }

    return NextResponse.json({ mission: data, isDemo: false })
  } catch {
    return NextResponse.json({ mission: DEMO_MISSION, isDemo: true })
  }
}
