// MY PLAYBOOK / MY PATTERN 상세페이지용 구조화 기록.
// 기존 tutone_pattern_count / tutone_playbook_count 카운터 로직은 그대로 두고,
// 이 파일은 "record"(원문/상황/대응방향/날짜)만 별도 키에 추가로 쌓는다.

export interface ToneCheckPatternRecord {
  id: string
  date: string
  originalText: string
  situationCategory: string
  direction: string
}

export interface ToneCheckPlaybookRecord extends ToneCheckPatternRecord {
  replyText: string
}

const PATTERN_RECORDS_KEY = 'tutone_pattern_records'
const PLAYBOOK_RECORDS_KEY = 'tutone_playbook_records'
const MAX_RECORDS = 100

function readRecords<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRecords<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_RECORDS)))
  } catch {}
}

function makeId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function getPatternRecords(): ToneCheckPatternRecord[] {
  return readRecords<ToneCheckPatternRecord>(PATTERN_RECORDS_KEY)
}

export function getPlaybookRecords(): ToneCheckPlaybookRecord[] {
  return readRecords<ToneCheckPlaybookRecord>(PLAYBOOK_RECORDS_KEY)
}

export function addPatternRecord(input: Omit<ToneCheckPatternRecord, 'id' | 'date'>) {
  const list = getPatternRecords()
  list.unshift({ id: makeId(), date: new Date().toISOString(), ...input })
  writeRecords(PATTERN_RECORDS_KEY, list)
}

export function addPlaybookRecord(input: Omit<ToneCheckPlaybookRecord, 'id' | 'date'>) {
  const list = getPlaybookRecords()
  list.unshift({ id: makeId(), date: new Date().toISOString(), ...input })
  writeRecords(PLAYBOOK_RECORDS_KEY, list)
}
