import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// 로그인한 사용자의 계정을 삭제한다.
// auth.users를 지우면 public.users와 연결된 기록(submissions, posts, translations, missions 등)은 on delete cascade로 함께 삭제된다.
export async function POST() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) {
    return NextResponse.json({ error: '로그인한 뒤에 계정을 삭제할 수 있어요.' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('[account/delete] SUPABASE_SERVICE_ROLE_KEY is missing')
    return NextResponse.json(
      { error: '지금은 계정을 삭제할 수 없어요. tutone.kr@gmail.com으로 삭제를 요청해 주세요.' },
      { status: 500 },
    )
  }

  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('[account/delete] deleteUser failed', error.message)
    return NextResponse.json(
      { error: '계정을 삭제하지 못했어요. 잠시 후 다시 시도하거나 tutone.kr@gmail.com으로 요청해 주세요.' },
      { status: 500 },
    )
  }

  // 남은 로그인 쿠키 정리
  try {
    await supabase.auth.signOut()
  } catch {}
  return NextResponse.json({ ok: true })
}
