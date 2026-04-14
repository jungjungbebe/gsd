'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Mission { id: string; target_sentence: string; category: string }

const DEMO_MISSION: Mission = {
  id: 'demo',
  target_sentence: '번거로우시겠지만, 한 번만 더 검토해 주시면 감사하겠습니다.',
  category: '쿠션어',
}

export default function TodayMission() {
  const [mission, setMission] = useState<Mission>(DEMO_MISSION)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('transcription_missions')
          .select('id, target_sentence, category')
          .eq('mission_date', today)
          .limit(1)
          .single()
        if (data) setMission(data)
      } catch {}
    }
    load()
  }, [])

  return (
    <div className="py-8 px-5">
      <p className="label-mono text-center mb-2" style={{ color: 'var(--text-secondary)' }}>today&apos;s mission</p>
      <h2 className="font-serif text-xl text-center tracking-[-0.03em] leading-tight mb-8" style={{ color: 'var(--text-primary)' }}>
        오늘의 필사
      </h2>

      <div className="p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
        <span className="label-mono block mb-4" style={{ color: 'var(--purple-500)' }}>{mission.category}</span>

        <blockquote className="font-serif text-[17px] tracking-[-0.02em] leading-relaxed mb-6" style={{ color: 'var(--text-primary)' }}>
          &ldquo;{mission.target_sentence}&rdquo;
        </blockquote>

        <div className="pt-4 flex items-center gap-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <Link
            href="/missions"
            className="flex-1 text-white text-center text-[13px] font-medium tracking-[-0.01em] py-3 active:scale-95 transition-transform"
            style={{ background: 'var(--purple-500)', borderRadius: 'var(--radius-xl)' }}
          >
            필사 시작
          </Link>
          <button
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment'
              input.onchange = () => { if (input.files?.[0]) alert('인증 사진 업로드 (준비 중)') }
              input.click()
            }}
            className="flex items-center justify-center w-12 h-12 active:scale-95 transition-transform"
            style={{ border: '1px solid var(--border-default)', borderRadius: '50%' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="12" cy="13" r="4" /><path d="M17 8h.01" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
