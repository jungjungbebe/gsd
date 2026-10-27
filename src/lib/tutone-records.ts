// MY PLAYBOOK / MY PATTERN 상세페이지용 구조화 기록.
// 기존 tutone_pattern_count / tutone_playbook_count 카운터 로직은 그대로 두고,
// 이 파일은 "record"(원문/상황/대응방향/날짜)만 별도 키에 추가로 쌓는다.
// 로그인한 계정은 Supabase(tutone_pattern_records / tutone_playbook_records)에도 함께 저장하고,
// 로그인할 때 서버 기록과 이 기기의 기록을 합친다. (로그인 전 'guest' 기록은 이 기기에만 저장)

import { createClient } from '@/lib/supabase/client'
import { getScope, scopedKey } from '@/lib/tutone-scope'

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

interface PatternRow {
  id: string
  created_at: string
  original_text: string
  situation_category: string
  direction: string
}

interface PlaybookRow extends PatternRow {
  reply_text: string
}

const PATTERN_RECORDS_KEY = 'tutone_pattern_records'
const PLAYBOOK_RECORDS_KEY = 'tutone_playbook_records'
const PATTERN_COUNT_KEY = 'tutone_pattern_count'
const PLAYBOOK_COUNT_KEY = 'tutone_playbook_count'
const PATTERN_TABLE = 'tutone_pattern_records'
const PLAYBOOK_TABLE = 'tutone_playbook_records'
const SCRAP_RECORDS_KEY = 'tutone_scrap_records'
const SCRAP_TABLE = 'tutone_scrap_records'
const WRITING_RECORDS_KEY = 'tutone_writing_records'
const WRITING_TABLE = 'tutone_writing_records'
const MAX_RECORDS = 100

// 찜한 표현 = 저장한 답장과 같은 모양
export type ToneCheckScrapRecord = ToneCheckPlaybookRecord

// 필사 기록 (필사 스팟 미션을 완료한 기록)
export interface WritingRecord {
  id: string
  date: string
  theme: string
  spot: string
  sentence: string
}

interface WritingRow {
  id: string
  created_at: string
  theme: string
  spot: string
  sentence: string
}

function readRecords<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(scopedKey(key))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRecords<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(scopedKey(key), JSON.stringify(list.slice(0, MAX_RECORDS)))
  } catch {}
}

function makeId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function patternToRow(r: ToneCheckPatternRecord) {
  return {
    id: r.id,
    created_at: r.date,
    original_text: r.originalText,
    situation_category: r.situationCategory,
    direction: r.direction,
  }
}

function playbookToRow(r: ToneCheckPlaybookRecord) {
  return { ...patternToRow(r), reply_text: r.replyText }
}

function rowToPattern(row: PatternRow): ToneCheckPatternRecord {
  return {
    id: row.id,
    date: new Date(row.created_at).toISOString(),
    originalText: row.original_text,
    situationCategory: row.situation_category,
    direction: row.direction,
  }
}

function rowToPlaybook(row: PlaybookRow): ToneCheckPlaybookRecord {
  return { ...rowToPattern(row), replyText: row.reply_text }
}

// 로그인 상태일 때만 서버에도 저장 (실패해도 기기 저장은 유지)
function pushToServer(table: string, row: Record<string, unknown>) {
  if (getScope() === 'guest') return
  try {
    createClient()
      .from(table)
      .upsert(row, { onConflict: 'user_id,id' })
      .then(
        () => {},
        () => {},
      )
  } catch {}
}

function mergeById<T extends { id: string; date: string }>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>()
  for (const r of a.concat(b)) {
    if (!map.has(r.id)) map.set(r.id, r)
  }
  return Array.from(map.values())
    .sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0))
    .slice(0, MAX_RECORDS)
}

export function getPatternRecords(): ToneCheckPatternRecord[] {
  return readRecords<ToneCheckPatternRecord>(PATTERN_RECORDS_KEY)
}

export function getPlaybookRecords(): ToneCheckPlaybookRecord[] {
  return readRecords<ToneCheckPlaybookRecord>(PLAYBOOK_RECORDS_KEY)
}

export function addPatternRecord(input: Omit<ToneCheckPatternRecord, 'id' | 'date'>) {
  const list = getPatternRecords()
  const rec: ToneCheckPatternRecord = { id: makeId(), date: new Date().toISOString(), ...input }
  list.unshift(rec)
  writeRecords(PATTERN_RECORDS_KEY, list)
  pushToServer(PATTERN_TABLE, patternToRow(rec))
}

export function addPlaybookRecord(input: Omit<ToneCheckPlaybookRecord, 'id' | 'date'>) {
  const list = getPlaybookRecords()
  const rec: ToneCheckPlaybookRecord = { id: makeId(), date: new Date().toISOString(), ...input }
  list.unshift(rec)
  writeRecords(PLAYBOOK_RECORDS_KEY, list)
  pushToServer(PLAYBOOK_TABLE, playbookToRow(rec))
}

function writingToRow(r: WritingRecord) {
  return { id: r.id, created_at: r.date, theme: r.theme, spot: r.spot, sentence: r.sentence }
}

function rowToWriting(row: WritingRow): WritingRecord {
  return { id: row.id, date: new Date(row.created_at).toISOString(), theme: row.theme, spot: row.spot, sentence: row.sentence }
}

export function getScrapRecords(): ToneCheckScrapRecord[] {
  return readRecords<ToneCheckScrapRecord>(SCRAP_RECORDS_KEY)
}

export function addScrapRecord(input: Omit<ToneCheckScrapRecord, 'id' | 'date'>) {
  const list = getScrapRecords()
  const rec: ToneCheckScrapRecord = { id: makeId(), date: new Date().toISOString(), ...input }
  list.unshift(rec)
  writeRecords(SCRAP_RECORDS_KEY, list)
  pushToServer(SCRAP_TABLE, playbookToRow(rec))
}

export function removeScrapRecord(id: string) {
  writeRecords(SCRAP_RECORDS_KEY, getScrapRecords().filter((r) => r.id !== id))
  if (getScope() === 'guest') return
  try {
    createClient()
      .from(SCRAP_TABLE)
      .delete()
      .eq('id', id)
      .then(
        () => {},
        () => {},
      )
  } catch {}
}

export function getWritingRecords(): WritingRecord[] {
  return readRecords<WritingRecord>(WRITING_RECORDS_KEY)
}

export function addWritingRecord(input: Omit<WritingRecord, 'id' | 'date'>) {
  const list = getWritingRecords()
  const rec: WritingRecord = { id: makeId(), date: new Date().toISOString(), ...input }
  list.unshift(rec)
  writeRecords(WRITING_RECORDS_KEY, list)
  pushToServer(WRITING_TABLE, writingToRow(rec))
}

async function syncTable<R extends { id: string }, T extends { id: string; date: string }>(opts: {
  table: string
  select: string
  recordsKey: string
  countKey?: string
  fromRow: (row: R) => T
  toRow: (r: T) => Record<string, unknown>
}) {
  const supabase = createClient()
  const res = await supabase
    .from(opts.table)
    .select(opts.select)
    .order('created_at', { ascending: false })
    .limit(MAX_RECORDS)
  if (res.error) return
  const rows = (res.data ?? []) as unknown as R[]
  const server = rows.map(opts.fromRow)
  const local = readRecords<T>(opts.recordsKey)
  const merged = mergeById(local, server)
  writeRecords(opts.recordsKey, merged)
  if (opts.countKey) {
    try {
      localStorage.setItem(scopedKey(opts.countKey), String(merged.length))
    } catch {}
  }
  const serverIds = new Set(server.map((r) => r.id))
  const missing = local.filter((r) => !serverIds.has(r.id))
  if (missing.length > 0) {
    await supabase.from(opts.table).upsert(missing.map(opts.toRow), { onConflict: 'user_id,id' })
  }
}

// 로그인 상태에서 서버 기록과 이 기기의 기록을 합치고, 기기에만 있던 기록은 서버로 올림
export async function syncRecords(): Promise<void> {
  if (getScope() === 'guest') return
  try {
    await Promise.all([
      syncTable<PatternRow, ToneCheckPatternRecord>({
        table: PATTERN_TABLE,
        select: 'id, created_at, original_text, situation_category, direction',
        recordsKey: PATTERN_RECORDS_KEY,
        countKey: PATTERN_COUNT_KEY,
        fromRow: rowToPattern,
        toRow: patternToRow,
      }),
      syncTable<PlaybookRow, ToneCheckPlaybookRecord>({
        table: PLAYBOOK_TABLE,
        select: 'id, created_at, original_text, situation_category, direction, reply_text',
        recordsKey: PLAYBOOK_RECORDS_KEY,
        countKey: PLAYBOOK_COUNT_KEY,
        fromRow: rowToPlaybook,
        toRow: playbookToRow,
      }),
      syncTable<PlaybookRow, ToneCheckScrapRecord>({
        table: SCRAP_TABLE,
        select: 'id, created_at, original_text, situation_category, direction, reply_text',
        recordsKey: SCRAP_RECORDS_KEY,
        fromRow: rowToPlaybook,
        toRow: playbookToRow,
      }),
      syncTable<WritingRow, WritingRecord>({
        table: WRITING_TABLE,
        select: 'id, created_at, theme, spot, sentence',
        recordsKey: WRITING_RECORDS_KEY,
        fromRow: rowToWriting,
        toRow: writingToRow,
      }),
    ])
  } catch {}
}
