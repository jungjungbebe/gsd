'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            nickname,
          },
        },
      })

      if (authError) {
        if (authError.message.toLowerCase().includes('fetch')) {
          setError('서버에 연결할 수 없습니다. 데모 모드에서는 회원가입이 지원되지 않습니다.')
        } else if (authError.message.includes('already registered')) {
          setError('이미 사용 중인 이메일입니다. 로그인 페이지로 이동해주세요.')
        } else {
          setError(authError.message)
        }
        return
      }

      setSuccess(true)
    } catch {
      setError('회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.grid} />
          <div className={styles.glow} />
          <div className={`${styles.inner} ${styles.center}`}>
            <div className={styles.iconRing}>
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className={styles.eyebrow}>CHECK YOUR MAIL</div>
            <h2 className={styles.title}>이메일을 확인해주세요</h2>
            <p className={styles.sub}>
              <span className={styles.noteStrong}>{email}</span>으로 인증 링크를 보내드렸습니다.
            </p>
            <p className={styles.footer}>
              <Link href="/login" className={styles.link}>로그인 페이지로 이동</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.grid} />
        <div className={styles.glow} />
        <div className={styles.inner}>
          <div className={styles.eyebrow}>TUTONE · SIGN UP</div>
          <h1 className={styles.title}>회원가입</h1>
          <p className={styles.sub}>무료로 시작하여 비즈니스 문해력을 키워보세요</p>

          <div className={styles.divider} />

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div>
              <label htmlFor="nickname" className={styles.label}>NICKNAME</label>
              <input
                id="nickname"
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="사용할 닉네임을 입력해주세요"
                className={styles.input}
              />
            </div>

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

            <div>
              <label htmlFor="password" className={styles.label}>PASSWORD</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상의 비밀번호를 입력해주세요"
                className={styles.input}
              />
            </div>

            <button type="submit" disabled={loading} className={styles.button}>
              {loading ? '가입 중...' : '무료로 시작하기'}
            </button>
          </form>

          <p className={styles.footer}>
            가입하면 <Link href="/privacy" className={styles.link}>개인정보처리방침</Link>에 동의한 것으로 봐요.
          </p>

          <p className={styles.footer}>
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className={styles.link}>로그인</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
