'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface FeedPost {
  id: string; body: string; nickname: string | null; created_at: string; isPremiumUser: boolean
}

const DEMO_FEED: FeedPost[] = [
  { id: '1', body: '금일 중으로 처리 부탁드립니다. 번거로우시겠지만 확인 후 회신 주시면 감사하겠습니다.', nickname: '김민준', created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), isPremiumUser: false },
  { id: '2', body: '심심한 사과의 말씀을 드리며, 향후 이런 일이 재발하지 않도록 각별히 유의하겠습니다.', nickname: '이서연', created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), isPremiumUser: true },
  { id: '3', body: '조심스럽지만, 이 방향으로 진행하면 일정이 촉박할 수 있을 것 같습니다.', nickname: '박지호', created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), isPremiumUser: false },
]

function timeStamp(d: string) { const t = new Date(d); return `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}` }
function dateStamp(d: string) { const t = new Date(d); return `${t.getMonth()+1}.${t.getDate()}` }

export default function PilsaFeed({ isPremium }: { isPremium: boolean }) {
  const [posts, setPosts] = useState<FeedPost[]>(DEMO_FEED)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('posts').select('id, body, user_id, created_at').order('created_at', { ascending: false }).limit(6)
        if (!data || data.length === 0) return
        const userIds = Array.from(new Set(data.map((p) => p.user_id)))
        const { data: profiles } = await supabase.from('users').select('id, nickname, subscription_status').in('id', userIds)
        const map = new Map((profiles ?? []).map((p) => [p.id, { nickname: p.nickname, isPremium: p.subscription_status === 'subscriber' }]))
        setPosts(data.map((p) => ({ id: p.id, body: p.body, nickname: map.get(p.user_id)?.nickname ?? null, created_at: p.created_at, isPremiumUser: map.get(p.user_id)?.isPremium ?? false })))
      } catch {}
    }
    load()
  }, [])

  return (
    <div className="py-8 px-5">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="label-mono mb-1" style={{ color: 'var(--text-secondary)' }}>pilsa feed</p>
          <h2 className="font-serif text-xl tracking-[-0.03em] leading-tight" style={{ color: 'var(--text-primary)' }}>
            함께 쓰는 사람들
          </h2>
        </div>
        <Link href="/community" className="text-[11px] tracking-[0.02em] active:opacity-60 transition-opacity" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          more →
        </Link>
      </div>

      <div>
        {posts.map((post, i) => (
          <article
            key={post.id}
            className="py-4"
            style={i !== posts.length - 1 ? { borderBottom: '1px solid var(--border-subtle)' } : undefined}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium"
                style={{
                  background: post.isPremiumUser ? 'var(--purple-500)' : 'var(--bg-elevated)',
                  color: post.isPremiumUser ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {post.nickname ? post.nickname[0] : '?'}
              </div>
              <span className="text-[13px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
                {post.nickname ?? '익명'}
              </span>
              {post.isPremiumUser && (
                <span className="text-[8px] tracking-[0.1em] uppercase px-1.5 py-0.5" style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple-300)', background: 'var(--glass-purple)', borderRadius: '4px' }}>
                  pro
                </span>
              )}
              <span className="text-[10px] tracking-[0.02em] ml-auto" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {dateStamp(post.created_at)} {timeStamp(post.created_at)}
              </span>
            </div>

            <p className="font-serif text-[14px] tracking-[-0.02em] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {post.body}
            </p>

            {post.isPremiumUser && !isPremium && (
              <div className="mt-3 flex items-center gap-1.5 text-[10px] tracking-[0.02em]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple-300)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span>분석 리포트 보기</span>
                <button onClick={() => alert('준비 중입니다')} className="underline underline-offset-2">구독</button>
              </div>
            )}

            {post.isPremiumUser && isPremium && (
              <div className="mt-3 flex items-center gap-2 text-[10px] tracking-[0.02em]" style={{ fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--purple-300)', background: 'var(--glass-purple)', padding: '2px 8px', borderRadius: '4px' }}>3등급 인증</span>
                <span style={{ color: 'var(--text-muted)' }}>상위 12%</span>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
