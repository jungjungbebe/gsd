'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// 이 기기에 저장된 투톤 기록(tutone_으로 시작하는 키)을 모두 지운다
function clearDeviceRecords() {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('tutone')) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {}
}

export default function DeleteAccount() {
  const [email, setEmail] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<'account' | 'device' | null>(null)

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data?.user?.email ?? null))
      .catch(() => setEmail(null))
      .finally(() => setLoading(false))
  }, [])

  async function deleteAccount() {
    if (!checked || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || '계정을 삭제하지 못했어요.')
      } else {
        clearDeviceRecords()
        try {
          await createClient().auth.signOut()
        } catch {}
        setDone('account')
      }
    } catch {
      setError('네트워크 오류가 발생했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  function deleteDeviceOnly() {
    clearDeviceRecords()
    setDone('device')
  }

  const card: React.CSSProperties = {
    borderRadius: 24,
    border: '0.5px solid rgba(255,255,255,0.5)',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    padding: '28px 22px',
    color: 'var(--text-primary)',
    lineHeight: 1.65,
    fontSize: 15,
  }
  const danger: React.CSSProperties = {
    width: '100%',
    minHeight: 50,
    border: 0,
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    background: '#b3261e',
    cursor: 'pointer',
  }

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '56px 20px 120px' }}>
      <div style={card}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>계정 삭제</h1>

        {done ? (
          <>
            <p style={{ margin: '0 0 20px' }}>
              {done === 'account'
                ? '계정과 저장한 기록을 모두 삭제했어요. 그동안 투톤을 써 주셔서 고마워요.'
                : '이 기기에 저장된 투톤 기록을 모두 지웠어요.'}
            </p>
            <Link href="/tone-check" style={{ color: 'var(--purple-500)', fontWeight: 600 }}>
              처음 화면으로
            </Link>
          </>
        ) : loading ? (
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>불러오는 중...</p>
        ) : email ? (
          <>
            <p style={{ margin: '0 0 14px', color: 'var(--text-secondary)' }}>{email} 계정을 삭제해요.</p>
            <ul style={{ margin: '0 0 18px', paddingLeft: 18 }}>
              <li>계정 정보(이메일, 닉네임)가 바로 삭제돼요.</li>
              <li>서버에 저장된 해석 기록, 필사 미션, 작성한 글이 함께 삭제돼요.</li>
              <li>이 기기에 저장된 찜한 표현, 발견 카드 등 기록도 지워져요.</li>
              <li>삭제한 계정과 기록은 되돌릴 수 없어요.</li>
            </ul>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '0 0 16px', cursor: 'pointer' }}>
              <input
                id="confirm-delete"
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                style={{ width: 20, height: 20, marginTop: 2 }}
              />
              <span>위 내용을 확인했고, 계정을 삭제할게요.</span>
            </label>
            <button type="button" onClick={deleteAccount} disabled={!checked || busy} style={{ ...danger, opacity: checked && !busy ? 1 : 0.45 }}>
              {busy ? '삭제하는 중...' : '계정 삭제'}
            </button>
            {error && <p style={{ margin: '12px 0 0', color: '#b3261e', fontSize: 14 }}>{error}</p>}
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 14px' }}>
              계정을 삭제하려면 먼저 로그인해 주세요. 로그인 후 MY 화면 아래의 「계정 삭제」에서 바로 삭제할 수 있어요.
            </p>
            <Link href="/login" style={{ display: 'inline-block', marginBottom: 20, color: 'var(--purple-500)', fontWeight: 600 }}>
              로그인하러 가기
            </Link>
            <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: 14 }}>
              로그인하지 않고 썼다면 기록은 이 기기에만 저장돼 있어요. 아래 버튼으로 지울 수 있어요.
            </p>
            <button type="button" onClick={deleteDeviceOnly} style={{ ...danger, background: 'rgba(0,0,0,0.55)' }}>
              이 기기의 투톤 기록 지우기
            </button>
            <p style={{ margin: '16px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
              로그인이 안 되거나 다른 도움이 필요하면 tutone.kr@gmail.com으로 삭제를 요청해 주세요. 확인 후 지체 없이 삭제해요.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
