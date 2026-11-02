import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 비밀번호 재설정처럼 이동할 곳이 정해진 경우만 허용 (사이트 안의 경로만)
  const nextParam = searchParams.get('next') ?? ''
  const next = /^\/(?!\/)[A-Za-z0-9\-_/]*$/.test(nextParam) ? nextParam : '/tone-check'

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch {
      // Fall through to error redirect
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
