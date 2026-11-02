'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (resetError) {
        if (resetError.message.toLowerCase().includes('rate')) {
          setError('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.')
        } else {
          setError('메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.')
        }
        return
      }
      // 가입 여부를 알려주지 않도록 항상 같은 안내를 보여준다
      setSent(true)
    } catch {
      setError('메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.')
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
          <h1 className={styles.title}>비밀번호 찾기</h1>
          {sent ? (
            <>
              <p className={styles.sub}>
                <span className={styles.noteStrong}>{email}</span>으로 가입한 계정이 있다면 재설정 링크를 보내드렸어요. 메일이 안 보이면 스팸함도 확인해 주세요.
              </p>
              <p className={styles.footer}>
                <Link href="/login" className={styles.link}>로그인으로 돌아가기</Link>
              </p>
            </>
          ) : (
            <>
              <p className={styles.sub}>가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드려요.</p>
              <div className={styles.divider} />
              {error && <div className={styles.error}>{error}</div>}
              <form onSubmit={handleSubmit} className={styles.form}>
                <div>
                  <label htmlFor="email" className={styles.label}>EMAIL</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className={styles.input}
                  />
                </div>
                <button type="submit" disabled={loading} className={styles.button}>
                  {loading ? '보내는 중...' : '재설정 링크 보내기'}
                </button>
              </form>
              <p className={styles.footer}>
                <Link href="/login" className={styles.link}>로그인으로 돌아가기</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
