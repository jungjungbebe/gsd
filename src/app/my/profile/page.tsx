'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { signOutAndGo } from '@/lib/tutone-session'
import styles from '../../(auth)/auth.module.css'

export default function ProfileEditPage() {
  const [ready, setReady] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (data.user) {
          setLoggedIn(true)
          setEmail(data.user.email ?? '')
          setNickname(((data.user.user_metadata as { nickname?: string } | undefined)?.nickname) ?? '')
        }
      } catch {}
      setReady(true)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    const name = nickname.trim()
    if (!name) {
      setError('닉네임을 입력해주세요.')
      return
    }
    if (name.length > 20) {
      setError('닉네임은 20자 이내로 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data, error: updateError } = await supabase.auth.updateUser({ data: { nickname: name } })
      if (updateError) {
        setError(updateError.message)
        return
      }
      try {
        if (data.user) await supabase.from('users').update({ nickname: name }).eq('id', data.user.id)
      } catch {}
      setMessage('저장했어요.')
    } catch {
      setError('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.grid} />
        <div className={styles.glow} />
        <div className={styles.inner}>
          <div className={styles.eyebrow}>TUTONE · PROFILE</div>
          <h1 className={styles.title}>프로필 편집</h1>

          {!ready ? (
            <p className={styles.sub}>불러오는 중...</p>
          ) : !loggedIn ? (
            <>
              <p className={styles.sub}>로그인 후에 편집할 수 있어요</p>
              <div className={styles.divider} />
              <Link href="/login" className={styles.button} style={{ textAlign: 'center', display: 'block' }}>
                로그인하러 가기
              </Link>
            </>
          ) : (
            <>
              <p className={styles.sub}>닉네임을 바꾸거나 로그아웃할 수 있어요</p>
              <div className={styles.divider} />

              {error && <div className={styles.error}>{error}</div>}
              {message && (
                <p className={styles.sub} style={{ color: 'var(--text-purple)', marginBottom: 12 }}>
                  {message}
                </p>
              )}

              <form onSubmit={handleSave} className={styles.form}>
                <div>
                  <label htmlFor="email" className={styles.label}>EMAIL</label>
                  <input id="email" type="email" value={email} disabled className={styles.input} />
                </div>

                <div>
                  <label htmlFor="nickname" className={styles.label}>NICKNAME</label>
                  <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="닉네임을 입력해주세요"
                    maxLength={20}
                    className={styles.input}
                  />
                </div>

                <button type="submit" disabled={saving} className={styles.button}>
                  {saving ? '저장 중...' : '저장'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => signOutAndGo('/tone-check')}
                className={styles.button}
                style={{
                  marginTop: 12,
                  background: 'transparent',
                  color: 'var(--text-purple)',
                  border: '1px solid var(--purple-300)',
                  boxShadow: 'none',
                }}
              >
                로그아웃
              </button>
            </>
          )}

          <p className={styles.footer}>
            <Link href="/my" className={styles.link}>← MY로 돌아가기</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
