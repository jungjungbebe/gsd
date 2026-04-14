'use client'

import { useState } from 'react'

const EXAMPLES = [
  '오늘까지 해주세요',
  '그건 좀 아닌 것 같은데요',
  '다시 보내주세요',
  '제가 한번 해볼게요',
  '그거 언제 됩니까?',
]

const FREE_DAILY_LIMIT = 3

function getTodayKey() {
  const d = new Date()
  return `translate_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}
function getUsageCount(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(getTodayKey()) || '0', 10)
}
function incrementUsage() {
  if (typeof window === 'undefined') return
  const key = getTodayKey()
  localStorage.setItem(key, String(parseInt(localStorage.getItem(key) || '0', 10) + 1))
}

interface LiveTranslatorProps { isPremium: boolean }

export default function LiveTranslator({ isPremium }: LiveTranslatorProps) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [usageCount, setUsageCount] = useState(getUsageCount)

  const remaining = FREE_DAILY_LIMIT - usageCount
  const isLimited = !isPremium && remaining <= 0

  async function handleTranslate() {
    const text = input.trim()
    if (!text) return
    if (!isPremium && remaining <= 0) { setError('오늘의 무료 변환 횟수를 모두 사용했습니다'); return }
    setLoading(true); setError(''); setResult('')
    try {
      const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '변환에 실패했습니다.'); return }
      setResult(data.result)
      if (!isPremium) { incrementUsage(); setUsageCount(getUsageCount()) }
    } catch { setError('네트워크 오류가 발생했습니다.') }
    finally { setLoading(false) }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTranslate() }
  }

  return (
    <div className="py-8 px-5">
      <p className="label-mono text-center mb-2" style={{ color: 'var(--text-secondary)' }}>business translator</p>
      <h2 className="font-serif text-xl text-center tracking-[-0.03em] leading-tight mb-2" style={{ color: 'var(--text-primary)' }}>
        일상어를 비즈니스어로
      </h2>
      <p className="text-[12px] text-center tracking-[-0.01em] mb-6" style={{ color: 'var(--text-secondary)' }}>
        평소 쓰던 말, 격식 있게 바꿔 드립니다
      </p>

      {!isPremium && (
        <div className="flex justify-center mb-5">
          <div
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.02em] px-3 py-1.5"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)' }}
          >
            <span>{remaining > 0 ? `${remaining}회 남음` : '소진'}</span>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <button onClick={() => alert('준비 중입니다')} style={{ color: 'var(--purple-500)' }} className="font-medium">무제한</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-6">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => { setInput(ex); setResult(''); setError('') }}
            className="text-[11px] tracking-[-0.01em] px-3 py-1.5 active:scale-95 transition-transform"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xl)' }}
          >
            {ex}
          </button>
        ))}
      </div>

      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
        <div className={`p-4 ${isLimited ? 'opacity-40' : ''}`} style={{ background: 'var(--bg-surface)' }}>
          <p className="label-mono mb-2" style={{ color: 'var(--text-muted)' }}>일상 표현</p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLimited ? '무료 횟수 소진' : '변환할 문장을 입력하세요'}
            maxLength={200} rows={2} disabled={isLimited}
            className="w-full text-[15px] tracking-[-0.02em] leading-relaxed bg-transparent outline-none resize-none disabled:cursor-not-allowed"
            style={{ color: 'var(--text-primary)', caretColor: 'var(--purple-500)' }}
          />
          <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <span className="text-[10px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{input.length}/200</span>
            <button
              onClick={handleTranslate}
              disabled={loading || !input.trim() || isLimited}
              className="text-white text-[12px] font-medium tracking-[-0.01em] px-5 py-2 disabled:opacity-30 active:scale-95 transition-transform"
              style={{ background: 'var(--purple-500)', borderRadius: 'var(--radius-xl)' }}
            >
              {loading ? '변환 중...' : '변환'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-center py-3">
        <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
          <path d="M7 0v16m0 0l-5-5m5 5l5-5" stroke="var(--text-muted)" strokeWidth="1.2" />
        </svg>
      </div>

      <div
        className="p-4"
        style={{
          background: 'var(--bg-surface)',
          border: result ? '1px solid var(--purple-500)' : '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <p className="label-mono mb-2" style={{ color: result ? 'var(--purple-500)' : 'var(--text-muted)' }}>비즈니스 표현</p>
        {error ? (
          <p className="text-[13px] tracking-[-0.01em]" style={{ color: '#ef4444' }}>{error}</p>
        ) : result ? (
          <div>
            <p className="font-serif text-[17px] tracking-[-0.02em] leading-relaxed" style={{ color: 'var(--text-primary)' }}>{result}</p>
            <div className="flex justify-end mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={async () => { await navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="flex items-center gap-1 text-[11px] tracking-[0.02em] px-2.5 py-1 active:scale-95 transition-transform"
                style={{ fontFamily: 'var(--font-mono)', color: copied ? 'var(--purple-500)' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)' }}
              >
                {copied ? (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--purple-500)" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>copied</>
                ) : (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>copy</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[14px] tracking-[-0.02em]" style={{ color: 'var(--text-muted)' }}>변환된 표현이 여기에 표시됩니다</p>
        )}
      </div>
    </div>
  )
}
