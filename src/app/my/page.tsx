'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './my.module.css'

const TABS = [
  { key: 'saved', label: '저장한 번역' },
  { key: 'scrap', label: '찜한 표현' },
  { key: 'archive', label: '필사 기록' },
] as const

type TabKey = typeof TABS[number]['key']

interface SavedTranslation {
  id: string
  input_text: string
  output_cushion: string | null
  output_practical: string | null
  relation: string
  purpose: string
  formality: string
  score: number
  created_at: string
}

const EMPTY_STATES: Record<TabKey, { icon: string; text: string; btnLabel: string; btnHref: string }> = {
  saved: { icon: '💾', text: '저장한 번역이 없어요.\n번역기를 사용해보세요', btnLabel: '번역기로 이동', btnHref: '/home' },
  scrap: { icon: '⭐', text: '찜한 표현이 없어요.\n마음에 드는 표현을 저장해보세요', btnLabel: '표현 둘러보기', btnHref: '/home' },
  archive: { icon: '✍️', text: '필사 기록이 없어요.\n오늘의 필사를 시작해보세요', btnLabel: '필사 미션 시작', btnHref: '/missions' },
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
  const [translations, setTranslations] = useState<SavedTranslation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('translations')
          .select('id, input_text, output_cushion, output_practical, relation, purpose, formality, score, created_at')
          .order('created_at', { ascending: false })
          .limit(20)
        if (data) setTranslations(data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const empty = EMPTY_STATES[activeTab]
  const translateCount = translations.length

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
              <span className={styles.rewardText}>120 P</span>
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
              <span className={styles.nickname}>사용자</span>
              <span className={styles.userId}>@user_munhae</span>
            </div>
            <Link href="/login" className={styles.editBtn}>프로필 편집</Link>
          </div>

          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>00:00</span>
              <span className={styles.statLabel}>학습시간</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statValue}>{translateCount}</span>
              <span className={styles.statLabel}>번역횟수</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statValue}>Lv.2</span>
              <span className={styles.statLabel}>문해력 등급</span>
            </div>
          </div>

          <div className={styles.levelProgress}>
            <div className={styles.levelHeader}>
              <span className={styles.levelTitle}>어휘 탐험가</span>
              <span className={styles.levelRange}>Lv.2 → Lv.3</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: '35%' }} />
            </div>
            <div className={styles.levelFooter}>
              <span className={styles.levelXp}>350 / 1,000 XP</span>
              <span className={styles.levelPercent}>35%</span>
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
                  <span className={styles.savedInput}>{t.input_text}</span>
                  <span className={styles.savedTime}>{timeAgo(t.created_at)}</span>
                </div>
                <div className={styles.savedResults}>
                  <div className={styles.savedResult}>
                    <span className={styles.savedLabel}>쿠션</span>
                    <span className={styles.savedText}>{t.output_cushion || '—'}</span>
                  </div>
                  <div className={styles.savedResult}>
                    <span className={styles.savedLabelBiz}>실무</span>
                    <span className={styles.savedText}>{t.output_practical || '—'}</span>
                  </div>
                </div>
                <div className={styles.savedMeta}>
                  <span>{t.relation} · {t.purpose} · {t.formality}</span>
                  <span className={styles.savedScore}>스코어 {t.score}</span>
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
            <Link href={empty.btnHref} className={styles.emptyBtn}>
              {empty.btnLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
