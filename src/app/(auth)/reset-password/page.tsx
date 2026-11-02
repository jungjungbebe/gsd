'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await createClient().auth.getSession()
        setHasSession(!!data.session)
      } catch {}
      setReady(true)
    })()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('비밀번호는 6자 이상으로 입력해 주세요.')
      return
    }
    if (password !== confirm) {
      setError('비밀번호가 서로 달라요. 다시 확인해 주세요.')
      return
    }
    setLoading(true)
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password })
      if (updateError) {
        setError(
          updateError.message.toLowerCase().includes('different')
            ? '이전과 다른 비밀번호를 입력해 주세요.'
            : '비밀번호를 바꾸지 못했어요. 링크가 만료됐다면 다시 요청해 주세요.',
        )
        return
      }
      setDone(true)
      setTimeout(() => {
        window.location.href = '/tone-check'
      }, 1500)
    } catch {
      setError('비밀번호를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.grid} />
        <div className={styles.glow} />
        <div className={styles.inner}>
          <div className={styles.eyebrow}>TUTONE · PASSWORD</div>
          <h1 className={styles.title}>새 비밀번호 설정</h1>
          {!ready ? (
            <p className={styles.sub}>불러오는 중...</p>
          ) : done ? (
            <p className={styles.sub}>비밀번호를 바꿨어요. 잠시 후 이동할게요.</p>
          ) : !hasSession ? (
            <>
              <p className={styles.sub}>링크가 만료됐거나 이미 사용됐어요. 다시 요청해 주세요.</p>
              <div className={styles.divider} />
              <Link href="/forgot-password" className={styles.button} style={{ textAlign: 'center', display: 'block' }}>
                재설정 링크 다시 받기
              </Link>
            </>
          ) : (
            <>
              <p className={styles.sub}>새로 사용할 비밀번호를 입력해 주세요.</p>
              <div className={styles.divider} />
              {error && <div className={styles.error}>{error}</div>}
              <form onSubmit={handleSubmit} className={styles.form}>
                <div>
                  <label htmlFor="password" className={styles.label}>NEW PASSWORD</label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6자 이상의 비밀번호"
                    className={styles.input}
                  />
                </div>
                <div>
                  <label htmlFor="confirm" className={styles.label}>CONFIRM</label>
                  <input
                    id="confirm"
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="한 번 더 입력해 주세요"
                    className={styles.input}
                  />
                </div>
                <button type="submit" disabled={loading} className={styles.button}>
                  {loading ? '변경 중...' : '비밀번호 바꾸기'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
