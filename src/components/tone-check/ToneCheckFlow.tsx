'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { addPatternRecord, addPlaybookRecord } from '@/lib/tutone-records'
import { scopedKey, useScopeReady } from '@/lib/tutone-scope'

const TranslatorOrb = dynamic(() => import('@/components/TranslatorOrb'), { ssr: false })

interface ToneCheckAlternative {
  id: string
  label: string
  reasoning: string
  reply: string
}

interface ToneCheckResult {
  interpretation: string
  tags: string[]
  evidenceCount: number
  evidenceDistribution: { label: string; pct: number }[]
  response: { reasoning: string; reply: string }
  alternatives: ToneCheckAlternative[]
  isSample: boolean
  counterpart?: string
}

type Stage = 'input' | 'checking' | 'result'

const COUNTERPARTS = ['동료', '상사', '클라이언트'] as const
const MAX_LEN = 2000

const EXAMPLES = [
  '오늘 중으로 가능하실까요?',
  '이 부분은 조금 아쉽네요.',
  '내일 다시 이야기해보죠.',
]

// 하단 2개 카드 아이콘 (id별로 고정, 타이틀/숫자/서브타이틀은 컴포넌트 내부에서 상태 기반으로 구성)
const SHORTCUT_ICONS: Record<'playbook' | 'pattern', React.ReactNode> = {
  playbook: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  ),
  pattern: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
}

const PATTERN_COUNT_KEY = 'tutone_pattern_count'
const PLAYBOOK_COUNT_KEY = 'tutone_playbook_count'

// 함정 어휘 (기존 TranslatorSection과 동일 목록, 독립적으로 재사용)
const TRAP_WORDS: { word: string; desc: string }[] = [
  { word: '심심한 사과', desc: '심심(甚深) = 깊고 간절하다는 뜻이에요. 지루하다는 뜻이 아니에요' },
  { word: '사흘', desc: '사흘 = 3일이에요. 4일로 오해하는 경우가 많아요' },
  { word: '금일', desc: '금일 = 오늘이에요. 금요일이 아니에요' },
  { word: '모레', desc: '모레 = 내일 다음 날(2일 후)이에요' },
  { word: '글피', desc: '글피 = 3일 후예요. 잘 안 쓰이는 표현이에요' },
  { word: '우천시', desc: '우천시 = 비가 올 경우라는 뜻이에요' },
  { word: '익일', desc: '익일 = 다음 날이에요' },
]

function detectTraps(text: string) {
  return TRAP_WORDS.filter((t) => text.includes(t.word))
}

function highlightTraps(text: string): React.ReactNode {
  const traps = detectTraps(text)
  if (traps.length === 0) return text
  const parts: React.ReactNode[] = []
  let remaining = text
  traps.forEach((t) => {
    const idx = remaining.indexOf(t.word)
    if (idx >= 0) {
      if (idx > 0) parts.push(remaining.slice(0, idx))
      parts.push(
        <span
          key={t.word}
          style={{
            color: '#c9891f',
            background: 'rgba(201,137,31,0.14)',
            borderRadius: 3,
            padding: '0 3px',
            textDecoration: 'underline',
            textDecorationColor: 'rgba(201,137,31,0.4)',
            textUnderlineOffset: 2,
          }}
        >
          {t.word}
        </span>
      )
      remaining = remaining.slice(idx + t.word.length)
    }
  })
  if (remaining) parts.push(remaining)
  return parts
}

// /service의 .fadeItem / .fadeIn 과 동일한 스펙 (2s cubic-bezier, 16px 이동)
function FadeIn({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translate3d(0,0,0)' : 'translate3d(0,16px,0)',
        transition: 'opacity 2s cubic-bezier(0.25,0.1,0.25,1), transform 2s cubic-bezier(0.25,0.1,0.25,1)',
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}

export default function ToneCheckFlow() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('input')
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [submittedText, setSubmittedText] = useState('')
  const [result, setResult] = useState<ToneCheckResult | null>(null)
  const [error, setError] = useState('')
  const [evidenceExpanded, setEvidenceExpanded] = useState(false)
  const [selectedAltId, setSelectedAltId] = useState<string | null>(null)
  const [counterpart, setCounterpart] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [likes, setLikes] = useState(0)
  const [dislikes, setDislikes] = useState(0)
  const [myVote, setMyVote] = useState<'like' | 'dislike' | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // 내 패턴 = 체크한 상황 수(TONE CHECK 사용 시 누적) / 내 플레이북 = 실제로 저장한 대응 수(저장 버튼 사용 시 누적)
  // 아직 백엔드 집계가 없어서 브라우저 localStorage에 누적 — 레이아웃/카드 위치는 고정, 숫자만 성장
  const [patternCount, setPatternCount] = useState(0)
  const [playbookCount, setPlaybookCount] = useState(0)
  const scopeReady = useScopeReady()
  useEffect(() => {
    if (!scopeReady) return
    try {
      setPatternCount(Number(localStorage.getItem(scopedKey(PATTERN_COUNT_KEY))) || 0)
      setPlaybookCount(Number(localStorage.getItem(scopedKey(PLAYBOOK_COUNT_KEY))) || 0)
    } catch {}
  }, [scopeReady])

  // /service와 동일한 순차 페이드인 (header -> orb -> content)
  const [show, setShow] = useState({ header: false, orb: false, content: false })
  useEffect(() => {
    const t1 = setTimeout(() => setShow((s) => ({ ...s, header: true })), 150)
    const t2 = setTimeout(() => setShow((s) => ({ ...s, orb: true })), 450)
    const t3 = setTimeout(() => setShow((s) => ({ ...s, content: true })), 750)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  // stage 전환 시 살짝 크로스페이드
  const [stageVisible, setStageVisible] = useState(true)
  useEffect(() => {
    setStageVisible(false)
    const t = setTimeout(() => setStageVisible(true), 30)
    return () => clearTimeout(t)
  }, [stage])

  async function runCheck(text: string, withCounterpart?: string | null, opts?: { recordPattern?: boolean }) {
    setStage('checking')
    setError('')
    try {
      const res = await fetch('/api/tone-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, counterpart: withCounterpart ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '분석에 실패했습니다.')
        setStage('input')
        return
      }
      setResult(data)
      setEvidenceExpanded(false)
      setSelectedAltId(null)
      setStage('result')
      // 내 패턴 record: 새로운 상황을 "완료"했을 때만 기록 (같은 상황에 대한 상대방 재선택 refinement는 기록 안 함)
      if (opts?.recordPattern) {
        addPatternRecord({
          originalText: text,
          situationCategory: data.tags?.[0] || '기타 요청',
          direction: data.tags?.[1] || '검토 필요',
        })
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
      setStage('input')
    }
  }

  function handleSubmit() {
    const text = input.trim()
    if (!text) return
    setSubmittedText(text)
    setCounterpart(null)
    runCheck(text, null, { recordPattern: true })
    // 내 패턴: 새로운 상황을 체크할 때마다 +1 (같은 상황에 대한 상대방 재선택은 카운트하지 않음)
    setPatternCount((n) => {
      const next = n + 1
      try { localStorage.setItem(scopedKey(PATTERN_COUNT_KEY), String(next)) } catch {}
      return next
    })
  }

  function handleEdit() {
    setInput(submittedText)
    setResult(null)
    setStage('input')
  }

  function handleCounterpartSelect(value: string) {
    const next = counterpart === value ? null : value
    setCounterpart(next)
    runCheck(submittedText, next)
  }

  const activeReasoning = selectedAltId
    ? result?.alternatives.find((a) => a.id === selectedAltId)?.reasoning ?? result?.response.reasoning
    : result?.response.reasoning
  const activeReply = selectedAltId
    ? result?.alternatives.find((a) => a.id === selectedAltId)?.reply ?? result?.response.reply
    : result?.response.reply

  async function handleCopy() {
    if (!activeReply) return
    await navigator.clipboard.writeText(activeReply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleVote(vote: 'like' | 'dislike') {
    if (myVote === vote) return
    const prev = myVote
    if (vote === 'like') {
      setLikes((n) => n + 1)
      if (prev === 'dislike') setDislikes((n) => Math.max(0, n - 1))
    } else {
      setDislikes((n) => n + 1)
      if (prev === 'like') setLikes((n) => Math.max(0, n - 1))
    }
    setMyVote(vote)
  }

  async function handleSave() {
    if (saving || saved) return
    setSaving(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('tone_checks').insert({
        user_id: user?.id ?? null,
        input_text: submittedText,
        interpretation: result?.interpretation ?? '',
        counterpart: counterpart,
        selected_alternative: selectedAltId,
        is_sample: result?.isSample ?? true,
      })
      setSaved(true)
      bumpPlaybookCount()
      savePlaybookRecord()
    } catch {
      setSaved(true)
      bumpPlaybookCount()
      savePlaybookRecord()
    } finally {
      setSaving(false)
    }
  }

  // 내 플레이북: 실제로 대응을 저장(다음에 다시 참고할 자산으로 확정)할 때마다 +1
  function bumpPlaybookCount() {
    setPlaybookCount((n) => {
      const next = n + 1
      try { localStorage.setItem(scopedKey(PLAYBOOK_COUNT_KEY), String(next)) } catch {}
      return next
    })
  }

  // MY PLAYBOOK 상세페이지에서 다시 볼 수 있도록 저장한 대응을 record로 함께 보관
  function savePlaybookRecord() {
    const alt = selectedAltId ? result?.alternatives.find((a) => a.id === selectedAltId) : null
    addPlaybookRecord({
      originalText: submittedText,
      situationCategory: result?.tags?.[0] || '기타 요청',
      direction: alt?.label || '추천 대응',
      replyText: activeReply || '',
    })
  }

  function handleReset() {
    setStage('input')
    setInput('')
    setSubmittedText('')
    setResult(null)
    setError('')
    setEvidenceExpanded(false)
    setSelectedAltId(null)
    setCounterpart(null)
    setCopied(false)
    setLikes(0)
    setDislikes(0)
    setMyVote(null)
    setSaving(false)
    setSaved(false)
  }

  return (
    <main style={{ minHeight: '100vh', maxWidth: 430, margin: '0 auto', paddingBottom: 100, display: 'flex', flexDirection: 'column' }}>
      {/* 헤더: /service .header 규격과 동일 (수정 없음) */}
      <FadeIn show={show.header}>
        <header style={{ padding: '48px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/tutone-logo.svg" alt="Tutone" style={{ height: 24, width: 'auto', objectFit: 'contain', opacity: 0.7 }} />
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '0.5px solid rgba(255,255,255,0.4)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            U
          </div>
        </header>
      </FadeIn>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          opacity: stageVisible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        {stage === 'input' && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              // space-between 대신 clamp: 실제 폰 높이(~700~850px)에서는 화면 높이에 비례해 자연스럽게 벌어지고,
              // 데스크탑처럼 창이 비정상적으로 긴 경우엔 40px에서 상한선이 걸려 그룹 사이가 무한정 벌어지지 않음
              gap: 'clamp(16px, 4vh, 40px)',
              padding: '4px 20px 4px',
            }}
          >
            {/* HeroGroup: 말풍선 + sphere + TONE CHECK + heading + description */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                opacity: show.orb ? 1 : 0,
                transform: show.orb ? 'translate3d(0,0,0)' : 'translate3d(0,16px,0)',
                transition: 'opacity 2s cubic-bezier(0.25,0.1,0.25,1), transform 2s cubic-bezier(0.25,0.1,0.25,1)',
              }}
            >
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 999,
                  padding: '8px 16px',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                }}
              >
                메시지를 붙여넣어 보세요
              </div>
              <div
                style={{
                  width: 9,
                  height: 9,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderTop: 'none',
                  borderLeft: 'none',
                  transform: 'rotate(45deg)',
                  margin: '-6px 0 2px',
                }}
              />
              <div
                style={{
                  transform: focused || input.length > 0 ? 'scale(1.04)' : 'scale(1)',
                  transition: 'transform 0.4s ease',
                }}
              >
                <TranslatorOrb isActive={focused || input.length > 0} size={184} />
              </div>

              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <span className="label-mono" style={{ color: 'var(--purple-500)', fontSize: 11 }}>
                  TONE CHECK
                </span>
                <p style={{ fontSize: 21, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '7px 0 8px' }}>
                  이 말, 어떻게 들릴까요?
                </p>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  애매한 회사 메시지나 짧은 대화를 붙여넣어 보세요.
                  <br />
                  뜻부터 맥락, 지금 할 수 있는 대응까지 정리해드릴게요.
                </p>
              </div>
            </div>

            {/* InputGroup: composer + privacy helper */}
            <div
              style={{
                opacity: show.content ? 1 : 0,
                transform: show.content ? 'translate3d(0,0,0)' : 'translate3d(0,16px,0)',
                transition: 'opacity 2s cubic-bezier(0.25,0.1,0.25,1), transform 2s cubic-bezier(0.25,0.1,0.25,1)',
              }}
            >
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '0.5px solid rgba(255, 255, 255, 0.5)',
                  boxShadow: '0 4px 24px rgba(160, 120, 200, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="메시지 또는 짧은 대화를 붙여넣어 주세요..."
                  maxLength={MAX_LEN}
                  rows={3}
                  className="w-full bg-transparent outline-none resize-none"
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                    caretColor: 'var(--purple-500)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1px' }}>
                  <span style={{ fontSize: 15, opacity: 0.45 }}>📎</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {input.length.toLocaleString()} / {MAX_LEN.toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className="disabled:opacity-40 active:scale-95 transition-transform"
                  style={{
                    width: '100%',
                    padding: 15,
                    borderRadius: 14,
                    background: 'var(--purple-500)',
                    border: 'none',
                    fontSize: 14.5,
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    color: '#fff',
                  }}
                >
                  해석하기 →
                </button>
                {error && <p style={{ fontSize: 12.5, color: '#c94040' }}>{error}</p>}
              </div>

              <p style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 9 }}>
                이름·회사명·고객명 등 식별 정보는 지우고 입력해 주세요.
              </p>
            </div>

            {/* DiscoveryGroup: example prompts (responsive wrap) + shortcut cards */}
            <div
              style={{
                opacity: show.content ? 1 : 0,
                transform: show.content ? 'translate3d(0,0,0)' : 'translate3d(0,16px,0)',
                transition: 'opacity 2s cubic-bezier(0.25,0.1,0.25,1), transform 2s cubic-bezier(0.25,0.1,0.25,1)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>예시로 넣어볼까요?</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: '100%' }}>
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setInput(ex)}
                      className="active:scale-95 transition-transform"
                      style={{
                        fontSize: 12.5,
                        color: 'var(--text-primary)',
                        background: 'rgba(255, 255, 255, 0.35)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '0.5px solid rgba(255, 255, 255, 0.6)',
                        boxShadow: '0 4px 24px rgba(160, 120, 200, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                        borderRadius: 999,
                        padding: '8px 14px',
                        maxWidth: '100%',
                      }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shortcut cards: 2개 카드(플레이북/패턴), 클릭 시 각 상세페이지로 이동. 레이아웃/카드 높이는 고정, 숫자만 사용량에 따라 성장 */}
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {([
                  { id: 'playbook' as const, title: 'MY PLAYBOOK', count: playbookCount, subtitle: '쌓인 대응', href: '/my/playbook' },
                  { id: 'pattern' as const, title: 'MY PATTERN', count: patternCount, subtitle: '체크한 상황', href: '/my/pattern' },
                ]).map((s) => (
                  <div
                    key={s.id}
                    onClick={() => router.push(s.href)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(s.href) }}
                    className="active:scale-95 transition-transform"
                    style={{
                      background: 'rgba(255, 255, 255, 0.25)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      border: '0.5px solid rgba(255, 255, 255, 0.5)',
                      boxShadow: '0 4px 24px rgba(160, 120, 200, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '16px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'rgba(160, 120, 220, 0.1)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '0.5px solid rgba(160, 120, 220, 0.2)',
                        color: 'var(--purple-500)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {SHORTCUT_ICONS[s.id]}
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--text-primary)', whiteSpace: 'nowrap', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{s.title}</span>
                    <span style={{ fontSize: 19, fontWeight: 600, color: 'var(--text-primary)' }}>{s.count}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{s.subtitle}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {stage === 'checking' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px' }}>
            <TranslatorOrb isActive size={160} />
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 18 }}>메시지를 읽고 있어요</p>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 6, textAlign: 'center' }}>
              말의 뜻과 상황을 함께 살펴보고 있어요...
            </p>
          </div>
        )}

        {stage === 'result' && result && (
          <div className="px-5 flex flex-col gap-3">
            {/* CHECK: 입력 메시지 접힌 상태 */}
            <div
              className="text-[11px] px-3 py-2 flex items-center justify-between gap-2"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, color: 'var(--text-secondary)' }}
            >
              <span className="truncate">&ldquo;{highlightTraps(submittedText)}&rdquo;</span>
              <button
                onClick={handleEdit}
                className="shrink-0 font-semibold"
                style={{ color: 'var(--purple-500)' }}
              >
                수정
              </button>
            </div>

            {/* UNDERSTAND */}
            <div className="glass-card-elevated p-4 flex flex-col gap-3">
              <span className="label-mono" style={{ color: 'var(--text-secondary)' }}>UNDERSTAND</span>
              <div>
                <p className="font-bold text-[16px] mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  이렇게 읽힐 수 있어요
                </p>
                <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {result.interpretation}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {result.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10.5px] font-semibold px-2.5 py-1"
                    style={{ background: 'var(--glass-purple)', color: 'var(--purple-500)', borderRadius: 999 }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {result.evidenceDistribution.length > 0 && (
                <button
                  onClick={() => setEvidenceExpanded((v) => !v)}
                  className="text-left text-[12px] font-semibold"
                  style={{ color: 'var(--purple-500)' }}
                >
                  비슷한 실제 사례 {result.evidenceCount}건 · {evidenceExpanded ? '접기 ↑' : '자세히 보기 ↓'}
                </button>
              )}

              {evidenceExpanded && result.evidenceDistribution.length > 0 && (
                <div className="p-3 flex flex-col gap-2" style={{ background: 'var(--bg-card)', borderRadius: 14 }}>
                  {result.evidenceDistribution.map((row) => (
                    <div key={row.label} className="flex items-center gap-2">
                      <span className="text-[10.5px] w-20 shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        {row.label}
                      </span>
                      <div className="flex-1 h-[7px] rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="h-full" style={{ width: `${row.pct}%`, background: 'var(--purple-500)' }} />
                      </div>
                      <span className="text-[10.5px] font-bold w-8 text-right" style={{ color: 'var(--text-primary)' }}>
                        {row.pct}%
                      </span>
                    </div>
                  ))}
                  {result.isSample && (
                    <span className="text-[9.5px]" style={{ color: 'var(--text-muted)' }}>
                      예시 데이터 · 실제 응답 데이터는 베타 테스트 후 반영될 예정입니다.
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>
                  맥락이 다르다면 · 보낸 사람 알려주기 (선택)
                </span>
                <div className="flex gap-1.5">
                  {COUNTERPARTS.map((c) => (
                    <button
                      key={c}
                      onClick={() => handleCounterpartSelect(c)}
                      className="flex-1 text-[11.5px] font-semibold py-1.5"
                      style={{
                        borderRadius: 10,
                        background: counterpart === c ? 'var(--purple-500)' : 'var(--bg-elevated)',
                        color: counterpart === c ? '#fff' : 'var(--text-primary)',
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RESPOND */}
            <div className="glass-card-elevated p-4 flex flex-col gap-3">
              <span className="label-mono" style={{ color: 'var(--text-secondary)' }}>RESPOND</span>
              <p className="font-bold text-[16px]" style={{ color: 'var(--text-primary)' }}>
                이렇게 대응해볼 수 있어요
              </p>

              <div
                className="p-3.5 flex flex-col gap-2.5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 14 }}
              >
                <span className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {activeReasoning}
                </span>
                <span className="text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  &ldquo;{activeReply}&rdquo;
                </span>
                <button
                  onClick={handleCopy}
                  className="self-end text-white text-[12px] font-bold px-3.5 py-2"
                  style={{ background: 'var(--text-primary)', borderRadius: 10 }}
                >
                  {copied ? '복사됨 ✓' : '복사하기 ↗'}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>
                  다른 방향으로 답하고 싶다면
                </span>
                <div className="flex gap-1.5">
                  {result.alternatives.map((alt) => (
                    <button
                      key={alt.id}
                      onClick={() => setSelectedAltId(alt.id === selectedAltId ? null : alt.id)}
                      className="flex-1 text-[11.5px] font-semibold py-2"
                      style={{
                        borderRadius: 10,
                        background: selectedAltId === alt.id ? 'var(--text-primary)' : 'var(--bg-elevated)',
                        color: selectedAltId === alt.id ? '#fff' : 'var(--text-primary)',
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      {alt.label}
                      {selectedAltId === alt.id ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleVote('like')}
                    className="text-[13px] px-2 py-1"
                    style={{ opacity: myVote === 'like' ? 1 : 0.55 }}
                  >
                    👍{likes > 0 && <span className="text-[10px] ml-1">{likes}</span>}
                  </button>
                  <button
                    onClick={() => handleVote('dislike')}
                    className="text-[13px] px-2 py-1"
                    style={{ opacity: myVote === 'dislike' ? 1 : 0.55 }}
                  >
                    👎{dislikes > 0 && <span className="text-[10px] ml-1">{dislikes}</span>}
                  </button>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="text-[11px] font-semibold px-3 py-1.5"
                  style={{
                    borderRadius: 999,
                    border: '1px solid var(--border-default)',
                    color: saved ? 'var(--purple-500)' : 'var(--text-secondary)',
                  }}
                >
                  {saved ? '저장됨 ✓' : '저장'}
                </button>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="text-center text-[12px] py-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              새로운 메시지 확인하기
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
