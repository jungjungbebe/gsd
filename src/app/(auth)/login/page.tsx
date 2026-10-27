'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reason') === 'idle') {
      setError('30분 동안 활동이 없어 로그아웃됐어요. 다시 로그인해주세요.')
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.toLowerCase().includes('fetch')) {
          setError('서버에 연결할 수 없습니다. 데모 모드에서는 로그인이 지원되지 않습니다.')
        } else if (authError.message === 'Invalid login credentials') {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        } else {
          setError(authError.message)
        }
        return
      }

      router.push('/tone-check')
    } catch {
      setError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
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
          <div className={styles.eyebrow}>TUTONE · LOGIN</div>
          <h1 className={styles.title}>로그인</h1>
          <p className={styles.sub}>계정에 로그인하여 학습을 이어가세요</p>

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

            <div>
              <label htmlFor="password" className={styles.label}>PASSWORD</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요"
                className={styles.input}
              />
            </div>

            <button type="submit" disabled={loading} className={styles.button}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className={styles.footer}>
            아직 계정이 없으신가요?{' '}
            <Link href="/signup" className={styles.link}>회원가입</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
