// 실무 용어 사전 (src/data/glossary.json — 사용자가 준 시트에서 변환)
// 톤체크에서 원문에 나온 용어를 찾아 AI에 참고 자료로 넘기고, 화면 풀이는 사전 뜻을 우선한다.
import raw from '@/data/glossary.json'

export interface GlossaryEntry {
  t: string // 용어
  a: string[] // 다른 표기(영문 정식 명칭 등)
  m: string // 뜻
  f: string // 분야
}

const ENTRIES = raw as GlossaryEntry[]

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const isLatin = (s: string) => /^[A-Za-z0-9 .&\-+/'()]+$/.test(s)

// 영문 키는 단어 경계로 찾고(PO가 POS 안에서 잡히지 않게), 대문자 약어는 대소문자를 구분한다
function makeMatcher(key: string): (text: string) => boolean {
  if (isLatin(key)) {
    const flags = /^[A-Z0-9&\-+/ ]+$/.test(key) ? '' : 'i'
    const re = new RegExp(`(?<![A-Za-z0-9])${esc(key)}(?![A-Za-z0-9])`, flags)
    return (text) => re.test(text)
  }
  return (text) => text.includes(key)
}

interface Indexed {
  e: GlossaryEntry
  keys: { key: string; test: (text: string) => boolean }[]
}

const INDEX: Indexed[] = ENTRIES.map((e) => ({
  e,
  keys: [e.t, ...e.a].filter((k) => k && k.trim().length >= 2).map((key) => ({ key, test: makeMatcher(key) })),
}))

export interface GlossaryHit {
  term: string // 원문에 실제로 나온 표기
  entry: GlossaryEntry
}

// 원문에 나온 사전 용어 (긴 표기 우선, 같은 위치에 겹친 짧은 용어는 제외)
export function findTerms(text: string, max = 15): GlossaryHit[] {
  const hits: GlossaryHit[] = []
  for (const { e, keys } of INDEX) {
    const k = keys.find((x) => x.test(text))
    if (k) hits.push({ term: k.key, entry: e })
  }
  hits.sort((a, b) => b.term.length - a.term.length)
  const out: GlossaryHit[] = []
  for (const h of hits) {
    // '현금 소진 예상기간' 안의 '현금'처럼 더 긴 용어에 포함된 짧은 용어는 뺀다 (같은 용어의 다른 분야 뜻은 둔다)
    if (out.some((o) => o.term !== h.term && o.term.includes(h.term))) continue
    out.push(h)
    if (out.length >= max) break
  }
  return out
}

// 매칭된 용어들에서 가장 많이 나온 분야 (메시지 맥락 추정용)
export function dominantField(hits: GlossaryHit[]): string {
  const count = new Map<string, number>()
  for (const h of hits) count.set(h.entry.f, (count.get(h.entry.f) ?? 0) + 1)
  let best = ''
  let n = 0
  count.forEach((v, k) => {
    if (v > n) {
      best = k
      n = v
    }
  })
  return n >= 2 ? best : ''
}

// AI에 넘길 참고 블록
export function glossaryPrompt(hits: GlossaryHit[]): string {
  if (!hits.length) return ''
  const field = dominantField(hits)
  return (
    '\n\n[참고 용어 사전 — 정확한 뜻이므로 해석·풀이·답장 어휘의 근거로 쓴다. 같은 용어에 분야별 뜻이 여러 개면 메시지 맥락에 맞는 것을 고른다. 누구나 아는 일상어는 terms에 넣지 않는다]\n' +
    (field ? `이 메시지는 "${field}" 분야 맥락일 가능성이 높다.\n` : '') +
    hits.map((h) => `- ${h.term}${h.entry.t !== h.term ? `(${h.entry.t})` : ''} [${h.entry.f}]: ${h.entry.m}`).join('\n')
  )
}

// 화면에 보여줄 풀이는 사전 뜻을 우선한다 (분야가 여럿이면 메시지 주 분야 → 첫 항목)
export function sheetMeaning(term: string, hits: GlossaryHit[]): string | null {
  const norm = term.trim().toLowerCase()
  const cands = hits.filter((h) => h.term.toLowerCase() === norm || h.entry.t.toLowerCase() === norm || h.entry.a.some((a) => a.toLowerCase() === norm))
  if (!cands.length) return null
  const field = dominantField(hits)
  return (cands.find((c) => c.entry.f === field) ?? cands[0]).entry.m
}
