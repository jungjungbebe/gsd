'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  getPatternRecords,
  getPlaybookRecords,
  getScrapRecords,
  removeScrapRecord,
  getWritingRecords,
  type ToneCheckPlaybookRecord,
  type ToneCheckScrapRecord,
  type WritingRecord,
} from '@/lib/tutone-records'
import { useScopeReady } from '@/lib/tutone-scope'
import styles from './my.module.css'

const TABS = [
  { key: 'saved', label: '저장한 대응' },
  { key: 'scrap', label: '찜한 표현' },
  { key: 'archive', label: '필사 기록' },
] as const

type TabKey = typeof TABS[number]['key']

const EMPTY_STATES: Record<TabKey, { icon: string; text: string; btnLabel: string; btnHref: string }> = {
  saved: { icon: '💾', text: '저장한 대응이 없어요.\n메시지를 분석하고 저장해보세요', btnLabel: '톤 체크하러 가기', btnHref: '/tone-check' },
  scrap: { icon: '⭐', text: '찜한 표현이 없어요.\n톤 체크 결과에서 ☆ 찜하기를 눌러보세요', btnLabel: '톤 체크하러 가기', btnHref: '/tone-check' },
  archive: { icon: '✍️', text: '필사 기록이 없어요.\n필사 스팟 미션을 완료해보세요', btnLabel: '필사 미션 시작', btnHref: '/missions' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  return `${day}일 전`
}

export default function MyPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('saved')
  const [translations, setTranslations] = useState<ToneCheckPlaybookRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [scraps, setScraps] = useState<ToneCheckScrapRecord[]>([])
  const [writings, setWritings] = useState<WritingRecord[]>([])
  const [user, setUser] = useState<{ email?: string; user_metadata?: { nickname?: string } } | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        try {
          const { data: auth } = await supabase.auth.getUser()
          setUser(auth?.user ?? null)
        } catch {}
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const empty = EMPTY_STATES[activeTab]
  const scopeReady = useScopeReady()
  const [translateCount, setTranslateCount] = useState(0)
  useEffect(() => {
    if (scopeReady) {
      setTranslateCount(getPatternRecords().length)
      setTranslations(getPlaybookRecords())
      setScraps(getScrapRecords())
      setWritings(getWritingRecords())
    }
  }, [scopeReady])

  return (
    <div className={styles.page}>
      {/* 프로필 카드 */}
      <div className={styles.profileCard}>
        <div className={styles.profileBg}>
          <div className={styles.bgGrid} />
          <div className={styles.bgGlow} />
        </div>

        <div className={styles.profileContent}>
          <div className={styles.rewardRow}>
            <div className={styles.rewardBadge}>
              <span className={styles.rewardIcon}>✦</span>
              <span className={styles.rewardText}>{user ? 'MEMBER' : 'GUEST'}</span>
            </div>
            <button className={styles.settingsBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </button>
          </div>

          <div className={styles.profileRow}>
            <div className={styles.avatarArea}>
              <div className={styles.speechBubble}>Hello~</div>
              <div className={styles.avatar}>
                <span className={styles.avatarText}>U</span>
              </div>
            </div>
            <div className={styles.nameArea}>
              <span className={styles.nickname}>{user ? (user.user_metadata?.nickname || '사용자') : '게스트'}</span>
              <span className={styles.userId}>{user ? `@${(user.email ?? 'user').split('@')[0]}` : '기록은 이 기기에 저장돼요'}</span>
            </div>
            {user ? (
              <Link href="/my/profile" className={styles.editBtn}>프로필 편집</Link>
            ) : (
              <Link href="/signup" className={styles.editBtn}>가입하기</Link>
            )}
          </div>

          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>—</span>
              <span className={styles.statLabel}>학습시간</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statValue}>{translateCount}</span>
              <span className={styles.statLabel}>번역횟수</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statValue}>Lv.1</span>
              <span className={styles.statLabel}>문해력 등급</span>
            </div>
          </div>

          <div className={styles.levelProgress}>
            <div className={styles.levelHeader}>
              <span className={styles.levelTitle}>어휘 탐험가</span>
              <span className={styles.levelRange}>Lv.1 → Lv.2</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: '0%' }} />
            </div>
            <div className={styles.levelFooter}>
              <span className={styles.levelXp}>0 / 1,000 XP</span>
              <span className={styles.levelPercent}>0%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className={styles.content}>
        {activeTab === 'saved' && translations.length > 0 ? (
          <div className={styles.savedList}>
            {translations.map((t) => (
              <div key={t.id} className={styles.savedCard}>
                <div className={styles.savedTop}>
                  <span className={styles.savedInput}>{t.originalText}</span>
                  <span className={styles.savedTime}>{timeAgo(t.date)}</span>
                </div>
                <div className={styles.savedResults}>
                  <div className={styles.savedResult}>
                    <span className={styles.savedLabelBiz}>답장</span>
                    <span className={styles.savedText}>{t.replyText || '—'}</span>
                  </div>
                </div>
                <div className={styles.savedMeta}>
                  <span>{t.situationCategory} · {t.direction}</span>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'scrap' && scraps.length > 0 ? (
          <div className={styles.savedList}>
            {scraps.map((t) => (
              <div key={t.id} className={styles.savedCard}>
                <div className={styles.savedTop}>
                  <span className={styles.savedInput}>{t.replyText}</span>
                  <span className={styles.savedTime}>{timeAgo(t.date)}</span>
                </div>
                <div className={styles.savedMeta}>
                  <span>{t.situationCategory} · {t.direction}</span>
                  <button
                    onClick={() => {
                      removeScrapRecord(t.id)
                      setScraps(getScrapRecords())
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    찜 해제
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'archive' && writings.length > 0 ? (
          <div className={styles.savedList}>
            {writings.map((t) => (
              <div key={t.id} className={styles.savedCard}>
                <div className={styles.savedTop}>
                  <span className={styles.savedInput}>{t.sentence}</span>
                  <span className={styles.savedTime}>{timeAgo(t.date)}</span>
                </div>
                <div className={styles.savedMeta}>
                  <span>{t.theme} · {t.spot}</span>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'saved' && loading ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>불러오는 중...</p>
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>{empty.icon}</span>
            <p className={styles.emptyText}>{empty.text}</p>
            {empty.btnHref && (
              <Link href={empty.btnHref} className={styles.emptyBtn}>
                {empty.btnLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
