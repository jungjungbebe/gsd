'use client'

import React from 'react'

interface SubscriptionGateProps {
  isSubscriber: boolean
  children: React.ReactNode
  message?: string
}

export default function SubscriptionGate({ isSubscriber, children, message }: SubscriptionGateProps) {
  if (isSubscriber) return <>{children}</>

  return (
    <div className="relative mt-4">
      <div className="pointer-events-none select-none blur-sm opacity-40" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="p-6 text-center max-w-[280px] mx-4"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        >
          <p className="label-mono mb-2" style={{ color: 'var(--purple-300)' }}>premium</p>
          <h3 className="font-serif text-[16px] tracking-[-0.02em] mb-1.5" style={{ color: 'var(--text-primary)' }}>
            더 깊은 문해력의 세계로
          </h3>
          <p className="text-[12px] tracking-[-0.01em] leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
            {message || '구독하고 지적인 라이프스타일을 완성하세요'}
          </p>
          <button
            onClick={() => alert('준비 중입니다')}
            className="text-white text-[12px] font-medium tracking-[-0.01em] px-6 py-2.5 active:scale-95 transition-transform"
            style={{ background: 'var(--purple-500)', borderRadius: 'var(--radius-xl)' }}
          >
            구독하기
          </button>
        </div>
      </div>
    </div>
  )
}
