'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { addPatternRecord, addPlaybookRecord, addScrapRecord, getScrapRecords, removeScrapRecord, type ToneCheckScrapRecord } from '@/lib/tutone-records'
import { createPortal } from 'react-dom'
import { getScope, scopedKey, useScopeReady } from '@/lib/tutone-scope'

const TranslatorOrb = dynamic(() => import('@/components/TranslatorOrb'), { ssr: false })

interface ToneCheckDirection {
  id: string
  label: string
  reasoning: string
  reply: string
}

// 한 번의 호출로 해석 + 대응 방향 3가지(첫 번째가 추천)를 모두 받아온다. 방향을 바꿔 보는 건 추가 호출 없이 화면에서만 바뀐다.
interface ToneCheckResult {
  interpretation: string
  tags: string[]
  directions: ToneCheckDirection[]
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
  const [selectedAltId, setSelectedAltId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [checkStep, setCheckStep] = useState(0)
  const [counterpart, setCounterpart] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [likes, setLikes] = useState(0)
  const [dislikes, setDislikes] = useState(0)
  const [myVote, setMyVote] = useState<'like' | 'dislike' | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showSavePrompt, setShowSavePrompt] = useState(false)

  // 내 패턴 = 체크한 상황 수(TONE CHECK 사용 시 누적) / 내 플레이북 = 실제로 저장한 대응 수(저장 버튼 사용 시 누적)
  // 아직 백엔드 집계가 없어서 브라우저 localStorage에 누적 — 레이아웃/카드 위치는 고정, 숫자만 성장
  const [patternCount, setPatternCount] = useState(0)
  const [playbookCount, setPlaybookCount] = useState(0)
  const scopeReady = useScopeReady()
  const [scrapList, setScrapList] = useState<ToneCheckScrapRecord[]>([])
  useEffect(() => {
    if (scopeReady) setScrapList(getScrapRecords())
  }, [scopeReady])
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

  // 분석 중 단계 표시 (실제 진행률이 아니라 처리 순서를 보여준다)
  useEffect(() => {
    if (stage !== 'checking') return
    setCheckStep(0)
    const a = setTimeout(() => setCheckStep(1), 1500)
    const b = setTimeout(() => setCheckStep(2), 3500)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [stage])

  // 같은 메시지 + 같은 상대 조합은 한 번만 호출하고 결과를 기억해둔다 (토큰 절약)
  const resultCache = useRef<Map<string, ToneCheckResult>>(new Map())

  async function runCheck(text: string, withCounterpart?: string | null, opts?: { recordPattern?: boolean }) {
    const cacheKey = text + '||' + (withCounterpart ?? '')
    const cached = resultCache.current.get(cacheKey)
    if (cached) {
      setError('')
      setResult(cached)
      setSelectedAltId(null)
      setStage('result')
      if (opts?.recordPattern) {
        addPatternRecord({
          originalText: text,
          situationCategory: cached.tags?.[0] || '기타 요청',
          direction: cached.tags?.[1] || '검토 필요',
        })
      }
      return
    }
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
      if (!data.isSample) resultCache.current.set(cacheKey, data)
      setResult(data)
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
    runCheck(text, counterpart, { recordPattern: true })
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
    setNotice(next ? `${next} 맥락으로 다시 정리했어요.` : '보낸 사람 정보 없이 다시 정리했어요.')
    setTimeout(() => setNotice(''), 3500)
  }

  const activeDirection = result ? result.directions.find((a) => a.id === selectedAltId) ?? result.directions[0] : undefined
  const activeReasoning = activeDirection?.reasoning
  const activeReply = activeDirection?.reply

  function handleToggleScrap() {
    if (!activeReply) return
    const existing = scrapList.filter((r) => r.replyText === activeReply)
    if (existing.length > 0) {
      existing.forEach((r) => removeScrapRecord(r.id))
    } else {
      const alt = activeDirection
      addScrapRecord({
        originalText: submittedText,
        situationCategory: result?.tags?.[0] || '기타 요청',
        direction: alt?.label || '추천 대응',
        replyText: activeReply,
      })
    }
    setScrapList(getScrapRecords())
  }

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

  // 로그인 전이면 가입 안내를 먼저 보여주고, 로그인 상태면 바로 저장
  function handleSave() {
    if (saving || saved) return
    if (getScope() === 'guest') {
      setShowSavePrompt(true)
      return
    }
    void doSave()
  }

  async function doSave() {
    if (saving || saved) return
    setSaving(true)
    try {
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
    const alt = activeDirection
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
    setSelectedAltId(null)
    setCounterpart(null)
    setCopied(false)
    setLikes(0)
    setDislikes(0)
    setMyVote(null)
    setSaving(false)
    setSaved(false)
  }

  const savePrompt = showSavePrompt
    ? createPortal(
        <div
          onClick={() => setShowSavePrompt(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(42,32,53,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 340, padding: 24, borderRadius: 24, background: 'rgba(255,255,255,0.55)', border: '0.5px solid rgba(255,255,255,0.7)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: '0 12px 40px rgba(42,32,53,0.25)', textAlign: 'center' }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-purple)', marginBottom: 10 }}>SAVE</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>이 대응을 저장할까요?</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
              가입하면 기록이 내 계정에 보관돼요. 가입 없이 저장하면 이 기기에만 남고, 나중에 가입해도 옮겨지지 않아요.
            </p>
            <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)', margin: '0 0 20px' }}>
              로그인하면 다른 기기에서도 이어서 볼 수 있어요.
            </p>
            <a
              href="/signup"
              style={{ display: 'block', padding: '14px 0', borderRadius: 14, background: 'var(--purple-500)', color: '#fff', fontSize: 15, fontWeight: 600, textDecoration: 'none', marginBottom: 10 }}
            >
              가입하기
            </a>
            <button
              type="button"
              onClick={() => {
                setShowSavePrompt(false)
                void doSave()
              }}
              style={{ display: 'block', width: '100%', padding: '13px 0', borderRadius: 14, background: 'transparent', border: '1px solid var(--purple-300)', color: 'var(--text-purple)', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 6 }}
            >
              이 기기에만 저장
            </button>
            <button
              type="button"
              onClick={() => setShowSavePrompt(false)}
              style={{ background: 'transparent', border: 'none', padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}
            >
              닫기
            </button>
          </div>
        </div>,
        document.body,
      )
    : null

  // 하단 메뉴의 홈을 이미 홈에서 다시 누르면 처음 화면(입력)으로 돌아감
  useEffect(() => {
    function onHome() {
      handleReset()
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('tutone:home', onHome)
    return () => window.removeEventListener('tutone:home', onHome)
  }, [])

  return (
    <main style={{ minHeight: '100vh', maxWidth: 430, margin: '0 auto', paddingBottom: 100, display: 'flex', flexDirection: 'column' }}>
      {savePrompt}
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '0 20px 4px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, ...{ opacity: show.orb ? 1 : 0, transform: show.orb ? 'translate3d(0,0,0)' : 'translate3d(0,16px,0)', transition: 'opacity 1.2s cubic-bezier(0.25,0.1,0.25,1), transform 1.2s cubic-bezier(0.25,0.1,0.25,1)' } }}>
              <div style={{ transform: focused || input.length > 0 ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.4s ease' }}>
                <TranslatorOrb isActive={focused || input.length > 0} size={96} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <span className="label-mono" style={{ color: 'var(--purple-500)', fontSize: 11 }}>TONE CHECK</span>
                <p style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '6px 0 6px' }}>이 말, 어떻게 들릴까요?</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                  짧은 업무 메시지를 붙여넣으면
                  <br />
                  의미와 다음 대응을 함께 정리해드려요.
                </p>
              </div>
            </div>

            <div style={{ ...{ background: 'rgba(255,252,246,0.94)', border: '0.5px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 24px rgba(160,120,200,0.14)', borderRadius: 'var(--radius-lg)' }, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, ...{ opacity: show.content ? 1 : 0, transform: show.content ? 'translate3d(0,0,0)' : 'translate3d(0,16px,0)', transition: 'opacity 1.2s cubic-bezier(0.25,0.1,0.25,1), transform 1.2s cubic-bezier(0.25,0.1,0.25,1)' } }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="메시지 또는 짧은 대화를 붙여넣어 주세요"
                maxLength={MAX_LEN}
                rows={4}
                className="w-full outline-none resize-none"
                style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-primary)', caretColor: 'var(--purple-500)', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {input.length.toLocaleString()} / {MAX_LEN.toLocaleString()}
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>누가 보냈나요?</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>선택하면 더 정확해져요</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COUNTERPARTS.map((c) => {
                    const on = counterpart === c
                    return (
                      <button
                        key={c}
                        onClick={() => setCounterpart(on ? null : c)}
                        style={{ flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13.5, fontWeight: 600, background: on ? 'var(--purple-500)' : '#fff', color: on ? '#fff' : 'var(--text-primary)', border: on ? '1px solid var(--purple-500)' : '1px solid var(--border-default)' }}
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="active:scale-95 transition-transform"
                style={{ width: '100%', padding: 15, borderRadius: 14, background: input.trim() ? 'var(--purple-500)' : 'var(--bg-elevated)', border: input.trim() ? 'none' : '1px solid var(--border-default)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: input.trim() ? '#fff' : 'var(--text-secondary)' }}
              >
                메시지 해석하기 →
              </button>
              {error && <p style={{ fontSize: 12.5, color: '#c94040', margin: 0 }}>{error}</p>}
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
                🔒 이름·회사명·고객명 등 식별 정보는 지우고 입력해 주세요.
              </p>
            </div>

            <div style={{ ...{ opacity: show.content ? 1 : 0, transform: show.content ? 'translate3d(0,0,0)' : 'translate3d(0,16px,0)', transition: 'opacity 1.2s cubic-bezier(0.25,0.1,0.25,1), transform 1.2s cubic-bezier(0.25,0.1,0.25,1)' } }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>예시로 넣어볼까요?</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setInput(ex)}
                      className="active:scale-95 transition-transform"
                      style={{ fontSize: 13, color: 'var(--text-primary)', background: 'rgba(255,252,246,0.8)', border: '0.5px solid rgba(255,255,255,0.8)', borderRadius: 999, padding: '8px 14px', maxWidth: '100%' }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {playbookCount === 0 && patternCount === 0 ? (
                <div style={{ ...{ background: 'rgba(255,252,246,0.94)', border: '0.5px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 24px rgba(160,120,200,0.14)', borderRadius: 'var(--radius-lg)' }, marginTop: 16, padding: '16px 18px', fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', textAlign: 'center' }}>
                  첫 메시지를 분석하면
                  <br />
                  나의 업무 패턴이 여기에 쌓여요.
                </div>
              ) : (
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                  {([
                    { id: 'playbook' as const, title: '저장한 대응', count: playbookCount, sub: 'MY PLAYBOOK', href: '/my/playbook' },
                    { id: 'pattern' as const, title: '분석한 상황', count: patternCount, sub: 'MY PATTERN', href: '/my/pattern' },
                  ]).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => router.push(c.href)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') router.push(c.href) }}
                      className="active:scale-95 transition-transform"
                      style={{ ...{ background: 'rgba(255,252,246,0.94)', border: '0.5px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 24px rgba(160,120,200,0.14)', borderRadius: 'var(--radius-lg)' }, padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                    >
                      <div style={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: '50%', background: 'rgba(160,120,220,0.12)', color: 'var(--purple-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {SHORTCUT_ICONS[c.id]}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.title}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{c.count}개</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {stage === 'checking' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px', gap: 6 }}>
            <TranslatorOrb isActive size={150} />
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '14px 0 0' }}>메시지를 살펴보고 있어요</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>보통 몇 초 안에 끝나요.</p>
            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'stretch', maxWidth: 300, marginInline: 'auto' }}>
              {['문장의 핵심 의미 확인', counterpart ? `${counterpart}와의 관계 고려` : '상황과 맥락 고려', '대응 방향 정리'].map((label, i) => {
                const done = checkStep > i
                const active = checkStep === i
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: done || active ? 1 : 0.45, transition: 'opacity 0.4s ease' }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', background: done ? 'var(--purple-500)' : 'transparent', border: done ? 'none' : active ? '2px solid var(--purple-500)' : '1.5px solid var(--border-default)', animation: active ? 'pulse 1.2s ease-in-out infinite' : 'none' }}>
                      {done ? '✓' : ''}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: 'var(--text-primary)' }}>{label}</span>
                  </div>
                )
              })}
            </div>
            <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}'}</style>
          </div>
        )}

        {stage === 'result' && result && (
          <div className="px-5 flex flex-col gap-3">
            <div
              className="text-[12px] px-3 py-2.5 flex items-center justify-between gap-2"
              style={{ background: 'rgba(255,252,246,0.94)', border: '0.5px solid var(--border-default)', borderRadius: 14, color: 'var(--text-primary)' }}
            >
              <span className="truncate">&ldquo;{highlightTraps(submittedText)}&rdquo;</span>
              <button onClick={handleEdit} className="shrink-0 font-semibold" style={{ color: 'var(--purple-500)' }}>
                수정
              </button>
            </div>

            <div style={{ ...{ background: 'rgba(255,252,246,0.94)', border: '0.5px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 24px rgba(160,120,200,0.14)', borderRadius: 'var(--radius-lg)' }, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span className="label-mono" style={{ color: 'var(--text-secondary)', fontSize: 10 }}>UNDERSTAND</span>
                <p className="font-bold text-[18px] mt-1" style={{ color: 'var(--text-primary)', margin: '4px 0 0' }}>
                  이렇게 읽을 수 있어요
                </p>
              </div>
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-primary)', margin: 0 }}>
                {result.interpretation}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.tags.map((tag) => (
                  <span key={tag} className="text-[12px] font-semibold px-3 py-1" style={{ background: 'rgba(160,120,220,0.14)', color: 'var(--purple-500)', borderRadius: 999 }}>
                    {tag}
                  </span>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>ⓘ 단정하지 않고 가능한 해석을 보여드려요.</p>

              <div style={{ borderTop: '0.5px solid var(--border-default)', paddingTop: 10 }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>보낸 사람</span>
                  {COUNTERPARTS.map((c) => (
                    <button
                      key={c}
                      onClick={() => handleCounterpartSelect(c)}
                      className="text-[12px] font-semibold px-3 py-1"
                      style={{ borderRadius: 999, background: counterpart === c ? 'var(--purple-500)' : '#fff', color: counterpart === c ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {notice && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-purple)' }}>{notice}</p>}
              </div>
            </div>

            <div style={{ ...{ background: 'rgba(255,252,246,0.94)', border: '0.5px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 24px rgba(160,120,200,0.14)', borderRadius: 'var(--radius-lg)' }, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span className="label-mono" style={{ color: 'var(--text-secondary)', fontSize: 10 }}>RESPOND</span>
                <p className="font-bold text-[18px]" style={{ color: 'var(--text-primary)', margin: '4px 0 0' }}>어떻게 대응할까요?</p>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>원하는 방향을 고르면, 그에 맞는 답변을 보여드려요.</p>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {result.directions.map((d, i) => {
                  const on = (activeDirection?.id ?? '') === d.id
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedAltId(d.id)}
                      className="text-[13px] font-semibold px-3.5 py-2"
                      style={{ borderRadius: 999, background: on ? '#dff77e' : '#fff', color: '#2a2035', border: on ? '1px solid var(--purple-500)' : '1px solid var(--border-default)' }}
                    >
                      {on ? '✓ ' : ''}
                      {d.label}
                      {i === 0 ? ' · 추천' : ''}
                    </button>
                  )
                })}
              </div>

              <div className="p-3.5 flex flex-col gap-2.5" style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 14 }}>
                <span className="text-[14px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  &ldquo;{activeReply}&rdquo;
                </span>
                <span className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {activeReasoning}
                </span>
              </div>

              <button
                onClick={handleCopy}
                className="text-white text-[14px] font-bold py-3.5 active:scale-95 transition-transform"
                style={{ background: 'var(--purple-500)', borderRadius: 14 }}
              >
                {copied ? '복사됨 ✓' : '복사하기'}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleToggleScrap}
                  className="flex-1 text-[13px] font-semibold py-2.5"
                  style={{ background: '#fff', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 12 }}
                >
                  {scrapList.some((r) => r.replyText === activeReply) ? '★ 찜됨' : '☆ 찜하기'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="flex-1 text-[13px] font-semibold py-2.5"
                  style={{ background: '#fff', border: '1px solid var(--border-default)', color: saved ? 'var(--purple-500)' : 'var(--text-primary)', borderRadius: 12 }}
                >
                  {saved ? '저장됨 ✓' : '내 대응에 저장'}
                </button>
              </div>
            </div>

            <div style={{ ...{ background: 'rgba(255,252,246,0.94)', border: '0.5px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 24px rgba(160,120,200,0.14)', borderRadius: 'var(--radius-lg)' }, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>이 해석이 도움됐나요?</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => handleVote('like')} className="text-[16px] px-2.5 py-1" style={{ opacity: myVote === 'like' ? 1 : 0.55 }}>
                  👍
                </button>
                <button onClick={() => handleVote('dislike')} className="text-[16px] px-2.5 py-1" style={{ opacity: myVote === 'dislike' ? 1 : 0.55 }}>
                  👎
                </button>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="text-center text-[14px] font-semibold py-3"
              style={{ background: 'rgba(255,252,246,0.6)', border: '1px solid var(--border-default)', borderRadius: 14, color: 'var(--text-primary)' }}
            >
              새로운 메시지 확인하기
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
