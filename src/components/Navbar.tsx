'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const [user, setUser] = useState<{ email?: string } | null>(null)

  useEffect(() => {
    try {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => setUser(data.user))
    } catch {}
  }, [])

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setUser(null)
      window.location.href = '/'
    } catch {}
  }

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl text-neutral-900 tracking-tight">
          문해력UP
        </Link>
        <div className="flex items-center gap-6 text-[13px]">
          <Link href="/diagnosis" className="text-neutral-400 hover:text-neutral-900 transition-colors">
            진단
          </Link>
          <Link href="/contents" className="text-neutral-400 hover:text-neutral-900 transition-colors">
            콘텐츠
          </Link>
          <Link href="/missions" className="text-neutral-400 hover:text-neutral-900 transition-colors">
            미션
          </Link>
          <Link href="/community" className="text-neutral-400 hover:text-neutral-900 transition-colors">
            커뮤니티
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-neutral-400 hover:text-neutral-900 transition-colors">
                대시보드
              </Link>
              <button
                onClick={handleSignOut}
                className="text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-neutral-400 hover:text-neutral-900 transition-colors">
                로그인
              </Link>
              <Link
                href="/signup"
                className="bg-neutral-900 text-white px-4 py-1.5 text-[13px] font-medium hover:bg-neutral-800 transition-colors"
              >
                시작하기
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
