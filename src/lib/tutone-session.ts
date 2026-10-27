import { createClient } from '@/lib/supabase/client'

// 로그아웃 후 지정한 주소로 이동 (전체 새로고침으로 상태를 깨끗하게 비움)
export async function signOutAndGo(to: string = '/tone-check') {
  try {
    await createClient().auth.signOut()
  } catch {}
  try {
    localStorage.removeItem('tutone_scope')
    localStorage.removeItem('tutone_last_active')
  } catch {}
  window.location.href = to
}
