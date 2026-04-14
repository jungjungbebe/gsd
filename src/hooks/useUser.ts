'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  id: string
  email: string
  nickname: string | null
  level: number
  subscription_status: 'free' | 'subscriber'
}

interface UseUserReturn {
  user: UserProfile | null
  loading: boolean
  isPremium: boolean
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) { setLoading(false); return }

        const { data: profile } = await supabase
          .from('users')
          .select('id, email, nickname, level, subscription_status')
          .eq('id', authUser.id)
          .single()

        if (profile) setUser(profile as UserProfile)
      } catch {
        // not logged in
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return {
    user,
    loading,
    isPremium: user?.subscription_status === 'subscriber',
  }
}
