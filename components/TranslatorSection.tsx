'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import styles from './TranslatorSection.module.css'

const TranslatorOrb = dynamic(() => import('./TranslatorOrb'), { ssr: false })

const STEPS = [
  { key: 'relation', question: '누구에게 보내는 말인가요?', options: ['동료', '상사', '클라이언트'] },
  { key: 'purpose', question: '어떤 채널로 전달하나요?', options: ['이메일', '메신저', '대면', '전화'] },
  { key: 'formality', question: '어느 정도 격식을 차릴까요?', options: ['편하게', '정중하게', '격식있게'] },
] as const

// 함정 어휘
const TRAP_WORDS: { word: string; desc: string }[] = [
  { word: '심심한 사과', desc: '심심(甚深) = 깊고 간절하다는 뜻이에요. 지루하다는 뜻이 아니에요' },
  { word: '사흘', desc: '사흘 = 3일이에요. 4일로 오해하는 경우가 많아요' },
  { word: '금일', desc: '금일 = 오늘이에요. 금요일이 아니에요' },
  { word: '모레', desc: '모레 = 내일 다음 날(2일 후)이에요' },
  { word: '글피', desc: '글피 = 3일 후예요. 잘 안 쓰이는 표현이에요' },
  { word: '우천시', desc: '우천시 = 비가 올 경우라는 뜻이에요' },
  { word: '익일', desc: '익일 = 다음 날이에요' },
]

function detectTraps(text: string): { word: string; desc: string }[] {
  return TRAP_WORDS.filter((t) => text.includes(t.word))
}

function highlightTraps(text: string): React.ReactNode {
  const traps = detectTraps(text)
  if (traps.length === 0) return text
  const parts: React.ReactNode[] = []
  let remaining = text
  traps.forEach((t) => {
    const idx = remaining.indexOf(t.word)
    if (idx >= 0) {
      if (idx > 0) parts.push(remaining.slice(0, idx))
      parts.push(<span key={t.word} style={{ color: '#fac775', background: 'rgba(250,199,117,0.15)', borderRadius: 3, padding: '0 3px', textDecoration: 'underline', textDecorationColor: 'rgba(250,199,117,0.4)', textUnderlineOffset: 2 }}>{t.word}</span>)
      remaining = remaining.slice(idx + t.word.length)
    }
  })
  if (remaining) parts.push(remaining)
  return parts
}

const QUICK_PHRASES = [
  '오늘까지 해주세요',
  '그건 좀 아닌 것 같은데요',
  '다시 보내주세요',
  '제가 한번 해볼게요',
  '그거 언제 됩니까?',
]

// 예시 응답
const RESPONSES: Record<string, Record<string, Record<string, Record<string, string>>>> = {
  '오늘까지 해주세요': {
    '동료': {
      '이메일': { '편하게': '오늘 중으로 처리 부탁해요!', '정중하게': '오늘 안으로 처리 부탁드려도 될까요?', '격식있게': '금일(今日) 중으로 처리 부탁드리겠습니다.' },
      '메신저': { '편하게': '오늘 중으로 부탁해도 될까요?', '정중하게': '오늘 안으로 보내줄 수 있을까요?', '격식있게': '금일 내로 전달 부탁드립니다.' },
      '대면': { '편하게': '오늘까지 가능할까요?', '정중하게': '오늘 중으로 마무리 가능할지 여쭤봐도 될까요?', '격식있게': '금일 내로 완료 부탁드리겠습니다.' },
      '전화': { '편하게': '오늘 중으로 한번 부탁할게요.', '정중하게': '오늘 안으로 처리 가능하실까요?', '격식있게': '금일 중으로 처리 부탁드릴 수 있을까요?' },
    },
    '상사': {
      '이메일': { '편하게': '혹시 오늘 중으로 가능하실까요?', '정중하게': '번거로우시겠지만, 금일 중으로 처리 부탁드려도 될까요?', '격식있게': '송구하오나, 금일(今日) 중으로 처리 부탁드려도 되겠습니까?' },
      '메신저': { '편하게': '오늘 안으로 가능하실까요?', '정중하게': '혹시 오늘 중으로 확인 부탁드려도 될까요?', '격식있게': '번거로우시겠지만 금일 내로 검토 부탁드리겠습니다.' },
      '대면': { '편하게': '오늘 중으로 부탁드려도 될까요?', '정중하게': '번거로우시겠지만, 오늘 안으로 처리 부탁드려도 될까요?', '격식있게': '외람되오나, 금일 내로 처리 부탁드려도 되겠습니까?' },
      '전화': { '편하게': '혹시 오늘 안으로 가능하실까요?', '정중하게': '번거로우시겠지만 오늘 중으로 확인 부탁드려도 될까요?', '격식있게': '송구하지만, 금일 중으로 처리 부탁드려도 되겠습니까?' },
    },
    '클라이언트': {
      '이메일': { '편하게': '오늘 중으로 전달 부탁드려요.', '정중하게': '번거로우시겠지만, 금일 중으로 회신 부탁드려도 될까요?', '격식있게': '번거로우시겠지만, 금일(今日) 내로 회신(回信) 부탁드리겠습니다.' },
      '메신저': { '편하게': '오늘 안으로 보내주실 수 있을까요?', '정중하게': '혹시 오늘 중으로 공유 부탁드려도 될까요?', '격식있게': '번거로우시겠지만 금일 내로 전달 부탁드리겠습니다.' },
      '대면': { '편하게': '오늘 안으로 가능하실까요?', '정중하게': '번거로우시겠지만, 오늘 중으로 전달 부탁드려도 될까요?', '격식있게': '번거로우시겠지만, 금일 내로 송부(送付) 부탁드리겠습니다.' },
      '전화': { '편하게': '오늘 중으로 보내주실 수 있으실까요?', '정중하게': '번거로우시겠지만 오늘 안으로 회신 부탁드려도 될까요?', '격식있게': '번거로우시겠지만, 금일 중으로 회신 부탁드리겠습니다.' },
    },
  },
  '그건 좀 아닌 것 같은데요': {
    '동료': {
      '이메일': { '편하게': '이 부분은 다시 한번 생각해 보면 좋겠어요.', '정중하게': '이 부분에 대해 다른 의견을 드려도 될까요?', '격식있게': '해당 사안(事案)에 대해 재고(再考)를 제안드립니다.' },
      '메신저': { '편하게': '음, 이건 좀 다르게 가는 게 낫지 않을까?', '정중하게': '혹시 다른 방향도 고려해 볼 수 있을까요?', '격식있게': '조심스럽지만, 다른 방향을 검토해 보시면 어떨까요?' },
      '대면': { '편하게': '솔직히 이건 좀 다시 생각해 보자.', '정중하게': '제 생각에는 다른 접근이 필요할 것 같아요.', '격식있게': '조심스럽지만 재검토가 필요하다고 생각됩니다.' },
      '전화': { '편하게': '그 부분은 좀 다시 볼 필요가 있을 것 같아.', '정중하게': '그 부분은 한번 더 논의해 보면 좋겠습니다.', '격식있게': '해당 건에 대해 추가 논의(論議)가 필요할 것으로 사료됩니다.' },
    },
    '상사': {
      '이메일': { '편하게': '말씀하신 부분에 대해 의견을 드려도 될까요?', '정중하게': '조심스럽지만, 해당 방향에 대해 의견을 드려도 될까요?', '격식있게': '송구하오나, 해당 사안에 대해 재고(再考)를 건의드립니다.' },
      '메신저': { '편하게': '혹시 이 방향에 대해 한 번 더 여쭤봐도 될까요?', '정중하게': '조심스럽지만, 다른 관점에서 말씀드려도 될까요?', '격식있게': '외람되오나 다른 관점을 말씀드려도 되겠습니까?' },
      '대면': { '편하게': '그 부분은 좀 다르게 가도 될까요?', '정중하게': '제가 잘못 이해한 걸 수도 있는데, 다른 방향은 어떨까요?', '격식있게': '외람된 말씀이오나, 대안(代案)을 제시드려도 되겠습니까?' },
      '전화': { '편하게': '말씀하신 부분에 대해 다른 의견이 있어서요.', '정중하게': '조심스럽지만 다른 의견을 말씀드려도 될까요?', '격식있게': '송구하지만, 다른 관점에서 의견을 개진(開陳)드려도 되겠습니까?' },
    },
    '클라이언트': {
      '이메일': { '편하게': '이 부분에 대해 다른 제안을 드려도 될까요?', '정중하게': '해당 방향에 대해 대안을 제안드려도 될까요?', '격식있게': '해당 사안에 대해 대안(代案)을 제안드리오니 검토 부탁드립니다.' },
      '메신저': { '편하게': '이 부분은 조금 다르게 접근하면 어떨까요?', '정중하게': '혹시 다른 방향도 함께 검토해 보시겠어요?', '격식있게': '조심스럽지만, 대안적 방향을 제안드립니다.' },
      '대면': { '편하게': '다른 방향도 한번 고려해 보시면 좋을 것 같아요.', '정중하게': '혹시 괜찮으시다면, 대안을 하나 제안드려도 될까요?', '격식있게': '번거로우시겠지만, 대안을 제시드려도 되겠습니까?' },
      '전화': { '편하게': '그 부분은 저희 쪽 제안도 참고해 주시면 좋겠습니다.', '정중하게': '해당 건에 대해 저희 의견도 말씀드려도 될까요?', '격식있게': '해당 건에 대해 저희 측 의견을 개진드려도 되겠습니까?' },
    },
  },
  '다시 보내주세요': {
    '동료': {
      '이메일': { '편하게': '미안한데 한 번만 더 보내줄 수 있어?', '정중하게': '번거로우시겠지만, 재송 부탁드려도 될까요?', '격식있게': '번거로우시겠지만, 해당 자료를 재송(再送) 부탁드립니다.' },
      '메신저': { '편하게': '아까 거 한 번만 더 보내줄래?', '정중하게': '혹시 다시 한번 보내줄 수 있을까요?', '격식있게': '번거로우시겠지만 재전송 부탁드립니다.' },
      '대면': { '편하게': '아까 파일 한 번만 더 보내줘.', '정중하게': '번거롭지만 한 번 더 공유해 줄 수 있을까요?', '격식있게': '번거로우시겠지만 재전달 부탁드리겠습니다.' },
      '전화': { '편하게': '아까 거 다시 보내줄 수 있어?', '정중하게': '통화 후 해당 자료 재전송 부탁드려도 될까요?', '격식있게': '번거로우시겠지만 해당 건 재송부 부탁드립니다.' },
    },
    '상사': {
      '이메일': { '편하게': '혹시 해당 자료를 다시 받을 수 있을까요?', '정중하게': '번거로우시겠지만, 해당 자료를 다시 전달 주시면 감사하겠습니다.', '격식있게': '송구하오나, 해당 자료의 재송(再送)을 요청드립니다.' },
      '메신저': { '편하게': '혹시 아까 파일 한 번 더 보내주실 수 있을까요?', '정중하게': '번거로우시겠지만 다시 한번 공유 부탁드려도 될까요?', '격식있게': '번거로우시겠지만 재전달 부탁드리겠습니다.' },
      '대면': { '편하게': '혹시 다시 한번 받을 수 있을까요?', '정중하게': '번거로우시겠지만 다시 한번 전달 부탁드려도 될까요?', '격식있게': '송구하지만 재전달을 요청드려도 되겠습니까?' },
      '전화': { '편하게': '해당 건 다시 한번 보내주실 수 있으실까요?', '정중하게': '번거로우시겠지만 다시 한번 전달 부탁드리겠습니다.', '격식있게': '송구하오나 해당 건 재송부를 요청드립니다.' },
    },
    '클라이언트': {
      '이메일': { '편하게': '혹시 해당 자료를 다시 보내주실 수 있을까요?', '정중하게': '번거로우시겠지만, 해당 자료를 재송부 부탁드려도 될까요?', '격식있게': '번거로우시겠지만, 해당 자료의 재송(再送)을 정중히 요청드립니다.' },
      '메신저': { '편하게': '혹시 다시 한번 보내주실 수 있을까요?', '정중하게': '번거로우시겠지만 재전송 부탁드려도 될까요?', '격식있게': '번거로우시겠지만 재송부 부탁드리겠습니다.' },
      '대면': { '편하게': '해당 자료를 다시 받을 수 있을까요?', '정중하게': '번거로우시겠지만 다시 한번 전달 부탁드려도 될까요?', '격식있게': '번거로우시겠지만 해당 건 재전달을 요청드립니다.' },
      '전화': { '편하게': '혹시 다시 한번 보내주실 수 있으실까요?', '정중하게': '번거로우시겠지만 재전송 부탁드려도 될까요?', '격식있게': '번거로우시겠지만 해당 건의 재송부를 정중히 요청드립니다.' },
    },
  },
  '제가 한번 해볼게요': {
    '동료': {
      '이메일': { '편하게': '내가 한번 맡아볼게!', '정중하게': '제가 한번 진행해 보겠습니다.', '격식있게': '해당 건은 제가 담당하여 진행하겠습니다.' },
      '메신저': { '편하게': '그거 내가 해볼게!', '정중하게': '제가 한번 시도해 보겠습니다.', '격식있게': '해당 업무는 제가 수행(遂行)하겠습니다.' },
      '대면': { '편하게': '내가 해볼게요.', '정중하게': '제가 맡아서 진행해 보겠습니다.', '격식있게': '해당 건은 제가 책임지고 추진하겠습니다.' },
      '전화': { '편하게': '그건 제가 한번 해볼게요.', '정중하게': '제가 한번 진행해 보겠습니다.', '격식있게': '해당 건은 제가 담당하여 추진하겠습니다.' },
    },
    '상사': {
      '이메일': { '편하게': '제가 한번 맡아보겠습니다.', '정중하게': '해당 건은 제가 담당하여 진행해 보겠습니다.', '격식있게': '해당 업무를 제가 담당하여 추진(推進)하겠습니다.' },
      '메신저': { '편하게': '제가 맡아서 해보겠습니다.', '정중하게': '제가 담당하여 진행해 보겠습니다.', '격식있게': '해당 건은 제가 책임지고 수행하겠습니다.' },
      '대면': { '편하게': '제가 한번 해보겠습니다.', '정중하게': '해당 건은 제가 맡아서 진행해 보겠습니다.', '격식있게': '해당 업무는 제가 전담(專擔)하여 추진하겠습니다.' },
      '전화': { '편하게': '제가 맡아보겠습니다.', '정중하게': '해당 건은 제가 진행해 보겠습니다.', '격식있게': '해당 건은 제가 책임지고 추진하겠습니다.' },
    },
    '클라이언트': {
      '이메일': { '편하게': '저희 쪽에서 진행해 보겠습니다.', '정중하게': '해당 건은 저희가 담당하여 진행하겠습니다.', '격식있게': '해당 건은 저희가 전담하여 추진(推進)하겠습니다.' },
      '메신저': { '편하게': '저희가 맡아서 처리해 드릴게요.', '정중하게': '해당 건은 저희 쪽에서 진행하겠습니다.', '격식있게': '해당 업무는 저희가 책임지고 수행하겠습니다.' },
      '대면': { '편하게': '저희 쪽에서 해보겠습니다.', '정중하게': '해당 건은 저희가 맡아서 진행하겠습니다.', '격식있게': '해당 건은 저희가 전담하여 추진하겠습니다.' },
      '전화': { '편하게': '저희가 한번 진행해 보겠습니다.', '정중하게': '해당 건은 저희 쪽에서 진행해 보겠습니다.', '격식있게': '해당 건은 저희가 책임지고 추진하겠습니다.' },
    },
  },
  '그거 언제 됩니까?': {
    '동료': {
      '이메일': { '편하게': '그거 언제쯤 될 것 같아?', '정중하게': '해당 건 예상 완료 시점을 알 수 있을까요?', '격식있게': '해당 건의 예상 완료 일정(日程)을 공유 부탁드립니다.' },
      '메신저': { '편하게': '그거 대충 언제쯤?', '정중하게': '혹시 언제쯤 완료될지 알 수 있을까요?', '격식있게': '예상 완료 일정을 공유 부탁드립니다.' },
      '대면': { '편하게': '그거 언제 끝나?', '정중하게': '해당 건 진행 상황이 어떻게 될까요?', '격식있게': '해당 건의 진척(進捗) 상황을 여쭤봐도 될까요?' },
      '전화': { '편하게': '그 건 언제쯤 되려나?', '정중하게': '해당 건 예상 일정을 여쭤봐도 될까요?', '격식있게': '해당 건의 예상 완료 시점을 확인 부탁드립니다.' },
    },
    '상사': {
      '이메일': { '편하게': '해당 건 일정을 여쭤봐도 될까요?', '정중하게': '해당 건의 예상 완료 일정을 여쭤봐도 되겠습니까?', '격식있게': '해당 건의 예상 완료 일정(日程)을 확인 부탁드려도 되겠습니까?' },
      '메신저': { '편하게': '혹시 그 건 언제쯤 될까요?', '정중하게': '해당 건 진행 상황을 여쭤봐도 될까요?', '격식있게': '해당 건의 진척 상황을 확인 부탁드립니다.' },
      '대면': { '편하게': '그 건 일정이 어떻게 될까요?', '정중하게': '해당 건의 예상 일정을 여쭤봐도 될까요?', '격식있게': '해당 건의 예상 완료 시점을 확인 부탁드려도 되겠습니까?' },
      '전화': { '편하게': '그 건 일정 확인 부탁드려도 될까요?', '정중하게': '해당 건의 진행 상황을 말씀해 주실 수 있을까요?', '격식있게': '해당 건의 진척 상황을 보고 부탁드려도 되겠습니까?' },
    },
    '클라이언트': {
      '이메일': { '편하게': '해당 건 일정 확인 부탁드려요.', '정중하게': '해당 건의 예상 완료 일정을 확인 부탁드려도 될까요?', '격식있게': '해당 건의 예상 납기(納期) 일정을 회신 부탁드립니다.' },
      '메신저': { '편하게': '그 건 진행 상황이 어떻게 될까요?', '정중하게': '해당 건 예상 일정을 공유해 주실 수 있을까요?', '격식있게': '해당 건의 진행 현황과 예상 일정을 공유 부탁드립니다.' },
      '대면': { '편하게': '그 건 언제쯤 될까요?', '정중하게': '해당 건의 예상 일정을 말씀해 주실 수 있을까요?', '격식있게': '해당 건의 예상 완료 시점을 확인 부탁드려도 되겠습니까?' },
      '전화': { '편하게': '그 건 일정 확인 가능할까요?', '정중하게': '해당 건의 진행 상황과 예상 일정을 여쭤봐도 될까요?', '격식있게': '해당 건의 진척 현황 및 예상 납기를 회신 부탁드립니다.' },
    },
  },
}

interface DualResult {
  cushion: string
  business: string
}

function getResponse(text: string, relation: string, purpose: string, formality: string): DualResult {
  const r = RESPONSES[text]?.[relation]?.[purpose]?.[formality]
  if (r) {
    // 기존 단일 응답을 쿠션형으로, 실무형은 더 간결하게 생성
    return {
      cushion: r,
      business: makeBusiness(text, relation, formality),
    }
  }
  return {
    cushion: `번거로우시겠지만, "${text}"에 대해 검토 부탁드려도 될까요?`,
    business: `"${text}" 건 — 검토 후 회신 부탁드립니다.`,
  }
}

// 실무형: 간결하고 명확한 버전
const BUSINESS_MAP: Record<string, Record<string, Record<string, string>>> = {
  '오늘까지 해주세요': {
    '동료': { '편하게': '오늘 중 처리 부탁.', '정중하게': '금일 내 처리 요청드립니다.', '격식있게': '금일(今日) 중 처리 요망.' },
    '상사': { '편하게': '오늘까지 확인 요청드립니다.', '정중하게': '금일 중 검토 요청드립니다.', '격식있게': '금일 내 처리 건의드립니다.' },
    '클라이언트': { '편하게': '오늘 내로 회신 부탁드립니다.', '정중하게': '금일 중 회신 요청드립니다.', '격식있게': '금일 내 회신(回信) 요청드립니다.' },
  },
  '그건 좀 아닌 것 같은데요': {
    '동료': { '편하게': '재검토 필요합니다.', '정중하게': '해당 방향 재검토 제안드립니다.', '격식있게': '해당 사안 재고(再考) 요청드립니다.' },
    '상사': { '편하게': '대안 검토를 건의드립니다.', '정중하게': '해당 건 대안 검토 건의드립니다.', '격식있게': '대안(代案) 검토를 건의드립니다.' },
    '클라이언트': { '편하게': '다른 방향도 검토 부탁드립니다.', '정중하게': '대안 방향 제안드립니다.', '격식있게': '대안적 접근을 제안드립니다.' },
  },
  '다시 보내주세요': {
    '동료': { '편하게': '재전송 부탁.', '정중하게': '해당 자료 재송 요청드립니다.', '격식있게': '해당 건 재송(再送) 요청.' },
    '상사': { '편하게': '자료 재전달 요청드립니다.', '정중하게': '해당 자료 재송부 요청드립니다.', '격식있게': '해당 자료 재송 요청드립니다.' },
    '클라이언트': { '편하게': '자료 재전송 부탁드립니다.', '정중하게': '해당 자료 재송부 요청드립니다.', '격식있게': '해당 건 재송(再送) 요청드립니다.' },
  },
  '제가 한번 해볼게요': {
    '동료': { '편하게': '제가 담당합니다.', '정중하게': '해당 건 제가 진행하겠습니다.', '격식있게': '해당 업무 제가 담당하겠습니다.' },
    '상사': { '편하게': '제가 맡겠습니다.', '정중하게': '해당 건 제가 담당 진행하겠습니다.', '격식있게': '해당 업무 전담(專擔) 추진하겠습니다.' },
    '클라이언트': { '편하게': '저희가 진행합니다.', '정중하게': '저희 측에서 담당 진행하겠습니다.', '격식있게': '저희가 전담 추진하겠습니다.' },
  },
  '그거 언제 됩니까?': {
    '동료': { '편하게': '예상 일정 공유 부탁.', '정중하게': '예상 완료 일정 확인 요청드립니다.', '격식있게': '완료 예정 일정(日程) 회신 요청.' },
    '상사': { '편하게': '진행 현황 확인 요청드립니다.', '정중하게': '해당 건 예상 일정 확인 요청드립니다.', '격식있게': '진척(進捗) 현황 보고 요청드립니다.' },
    '클라이언트': { '편하게': '일정 확인 부탁드립니다.', '정중하게': '예상 납기 일정 확인 요청드립니다.', '격식있게': '납기(納期) 일정 회신 요청드립니다.' },
  },
}

function makeBusiness(text: string, relation: string, formality: string): string {
  return BUSINESS_MAP[text]?.[relation]?.[formality] || `"${text}" 건 — 확인 후 회신 요청드립니다.`
}

type Bubble = { id: number; type: 'bot' | 'user' | 'options' | 'typing' | 'input' | 'result'; content?: string; cushion?: string; business?: string; options?: string[]; stepKey?: string }

export default function TranslatorSection() {
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [step, setStep] = useState(0)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<DualResult | null>(null)
  const [copied, setCopied] = useState<'cushion' | 'business' | null>(null)
  const [likes, setLikes] = useState(0)
  const [dislikes, setDislikes] = useState(0)
  const [myVote, setMyVote] = useState<'like' | 'dislike' | null>(null)
  const [saved, setSaved] = useState(false)
  const [saveToast, setSaveToast] = useState(false)
  const [resultMode, setResultMode] = useState<'cushion' | 'business'>('cushion')
  const [orbActive, setOrbActive] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(0)

  function nextId() { return ++idRef.current }

  function scrollToBottom() {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)
  }

  // 초기 인사 시퀀스 (Strict Mode 중복 방지)
  const initRef = useRef(false)
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    idRef.current = 0
    setOrbActive(true)

    // 타이핑 인디케이터
    const typingId1 = nextId()
    setBubbles([{ id: typingId1, type: 'typing' }])

    // 문구 1: 0.8초 후
    setTimeout(() => {
      const id1 = nextId()
      setBubbles([{ id: id1, type: 'bot', content: '안녕하세요! 같은 언어 속 진심을 잇는 Link입니다.' }])
      scrollToBottom()
    }, 800)

    // 문구 2: 1.3초 후 (0.5초 간격)
    setTimeout(() => {
      const id2 = nextId()
      setBubbles((prev) => [
        ...prev,
        { id: id2, type: 'bot', content: '오늘 조율이 필요한 대화는 무엇인가요?' },
      ])
      scrollToBottom()
    }, 1800)

    // 선택지: 2.5초 후, orb 비활성
    setTimeout(() => {
      const id3 = nextId()
      const id4 = nextId()
      setBubbles((prev) => [
        ...prev,
        { id: id3, type: 'bot', content: STEPS[0].question },
        { id: id4, type: 'options', options: [...STEPS[0].options], stepKey: STEPS[0].key },
      ])
      scrollToBottom()
      setOrbActive(false)
    }, 2500)
  }, [])

  function handleSelect(stepKey: string, value: string) {
    const newSelections = { ...selections, [stepKey]: value }
    setSelections(newSelections)

    // 유저 선택 버블
    const userId = nextId()
    setBubbles((prev) => [
      ...prev.filter((b) => !(b.type === 'options' && b.stepKey === stepKey)),
      { id: userId, type: 'user', content: value },
    ])
    scrollToBottom()

    const nextStep = step + 1

    if (nextStep < STEPS.length) {
      // 타이핑 인디케이터 → 다음 질문
      const typingId = nextId()
      setTimeout(() => {
        setBubbles((prev) => [...prev, { id: typingId, type: 'typing' }])
        scrollToBottom()
      }, 300)

      setTimeout(() => {
        const qId = nextId()
        const oId = nextId()
        setBubbles((prev) => [
          ...prev.filter((b) => b.id !== typingId),
          { id: qId, type: 'bot', content: STEPS[nextStep].question },
          { id: oId, type: 'options', options: [...STEPS[nextStep].options], stepKey: STEPS[nextStep].key },
        ])
        scrollToBottom()
      }, 1100)

      setStep(nextStep)
    } else {
      // 모든 선택 완료 → 입력창 표시
      const typingId = nextId()
      setTimeout(() => {
        setBubbles((prev) => [...prev, { id: typingId, type: 'typing' }])
        scrollToBottom()
      }, 300)

      setTimeout(() => {
        const botId = nextId()
        const inputId = nextId()
        setBubbles((prev) => [
          ...prev.filter((b) => b.id !== typingId),
          { id: botId, type: 'bot', content: '좋아요! 이제 변환할 문장을 입력해 주세요.' },
          { id: inputId, type: 'input' },
        ])
        scrollToBottom()
      }, 1100)

      setStep(nextStep)
    }
  }

  function handleConvert() {
    const text = input.trim()
    if (!text) return


    const userId = nextId()
    setBubbles((prev) => [
      ...prev.filter((b) => b.type !== 'input'),
      { id: userId, type: 'user', content: text },
    ])
    scrollToBottom()

    // 타이핑 인디케이터
    const typingId = nextId()
    setTimeout(() => {
      setBubbles((prev) => [...prev, { id: typingId, type: 'typing' }])
      scrollToBottom()
    }, 200)

    // 결과
    setTimeout(() => {
      const dual = getResponse(text, selections.relation, selections.purpose, selections.formality)
      setOutput(dual)

      const resultId = nextId()
      setBubbles((prev) => [
        ...prev.filter((b) => b.id !== typingId),
        { id: resultId, type: 'result', cushion: dual.cushion, business: dual.business },
      ])
      scrollToBottom()
    }, 1000)
  }

  function handleQuick(phrase: string) {
    setInput(phrase)
  }

  async function handleSave() {
    if (saved) return
    setSaved(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('translations').insert({
        user_id: user?.id ?? null,
        input_text: input.trim(),
        output_text: output ? output.cushion : '',
        output_cushion: output?.cushion ?? '',
        output_practical: output?.business ?? '',
        relation: selections.relation,
        purpose: selections.purpose,
        formality: selections.formality,
        score: 87,
      })
      setSaveToast(true)
      setTimeout(() => setSaveToast(false), 2500)
    } catch {
      setSaved(false)
    }
  }

  function handleVote(vote: 'like' | 'dislike') {
    if (myVote === vote) return
    const prev = myVote
    if (vote === 'like') { setLikes((n) => n + 1); if (prev === 'dislike') setDislikes((n) => Math.max(0, n - 1)) }
    else { setDislikes((n) => n + 1); if (prev === 'like') setLikes((n) => Math.max(0, n - 1)) }
    setMyVote(vote)
  }

  function handleReset() {
    idRef.current = 0
    setStep(0)
    setSelections({})
    setInput('')
    setOutput(null)
    setCopied(null)
    setLikes(0)
    setDislikes(0)
    setMyVote(null)
    setSaved(false)
    setOrbActive(true)
    const typingId = nextId()
    setBubbles([{ id: typingId, type: 'typing' }])
    setTimeout(() => {
      const id1 = nextId()
      setBubbles([{ id: id1, type: 'bot', content: '안녕하세요! 같은 언어 속 진심을 잇는 Link입니다.' }])
      scrollToBottom()
    }, 800)
    setTimeout(() => {
      const id2 = nextId()
      setBubbles((prev) => [
        ...prev,
        { id: id2, type: 'bot', content: '오늘 조율이 필요한 대화는 무엇인가요?' },
      ])
      scrollToBottom()
    }, 1800)
    setTimeout(() => {
      const id3 = nextId()
      const id4 = nextId()
      setBubbles((prev) => [
        ...prev,
        { id: id3, type: 'bot', content: STEPS[0].question },
        { id: id4, type: 'options', options: [...STEPS[0].options], stepKey: STEPS[0].key },
      ])
      scrollToBottom()
      setOrbActive(false)
    }, 2500)
  }

  return (
    <section className={styles.section}>
      {saveToast && (
        <div className={styles.saveToast}>저장됐어요 ✓</div>
      )}
      <div className={styles.header}>
        <span className={styles.eyebrow}>BUSINESS TRANSLATOR</span>
        <h2 className={styles.titleLink}>Link</h2>
      </div>

      <div ref={scrollRef} className={styles.chat}>
        {bubbles.map((b) => {
          if (b.type === 'bot') {
            return (
              <div key={b.id} className={`${styles.bubble} ${styles.botBubble} ${styles.fadeUp}`}>
                <div className={styles.botAvatar}><img src="/orb-avatar.png" alt="Link" style={{width:'100%',height:'100%',objectFit:'cover'}} /></div>
                <div className={styles.botText}>{b.content}</div>
              </div>
            )
          }
          if (b.type === 'user') {
            // 함정 어휘 하이라이트
            let rendered: React.ReactNode = b.content || ''
            const traps = detectTraps(b.content || '')
            if (traps.length > 0) {
              const parts: React.ReactNode[] = []
              let remaining = b.content || ''
              traps.forEach((t) => {
                const idx = remaining.indexOf(t.word)
                if (idx >= 0) {
                  if (idx > 0) parts.push(remaining.slice(0, idx))
                  parts.push(
                    <span key={t.word} className={styles.trapHighlight}>{t.word}</span>
                  )
                  remaining = remaining.slice(idx + t.word.length)
                }
              })
              if (remaining) parts.push(remaining)
              rendered = parts
            }
            return (
              <div key={b.id} className={`${styles.bubble} ${styles.userBubble} ${styles.fadeUp}`}>
                <div className={styles.userText}>{rendered}</div>
              </div>
            )
          }
          if (b.type === 'options') {
            return (
              <div key={b.id} className={`${styles.optionsRow} ${styles.fadeUp}`}>
                {b.options?.map((opt) => (
                  <button key={opt} className={styles.optionChip} onClick={() => handleSelect(b.stepKey!, opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            )
          }
          if (b.type === 'typing') {
            return (
              <div key={b.id} className={`${styles.bubble} ${styles.botBubble} ${styles.fadeUp}`}>
                <div className={styles.botAvatar}><img src="/orb-avatar.png" alt="Link" style={{width:'100%',height:'100%',objectFit:'cover'}} /></div>
                <div className={styles.typingDots}>
                  <span /><span /><span />
                </div>
              </div>
            )
          }
          if (b.type === 'input') {
            return (
              <div key={b.id} className={`${styles.inputArea} ${styles.fadeUp}`}>
                <div className={styles.quickRow}>
                  {QUICK_PHRASES.map((p) => (
                    <button key={p} className={styles.quickChip} onClick={() => handleQuick(p)}>{p}</button>
                  ))}
                </div>
                <div className={styles.inputBox}>
                  <textarea
                    className={styles.textarea}
                    placeholder="변환할 문장을 입력하세요"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleConvert() } }}
                    maxLength={200}
                    rows={2}
                  />
                  <button className={styles.sendBtn} onClick={handleConvert} disabled={!input.trim()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          }
          if (b.type === 'result') {
            const activeText = resultMode === 'cushion' ? b.cushion : b.business
            const activeTraps = detectTraps(activeText || '')
            // 두 결과 + 함정설명 모두 보이지 않게 렌더링해서 높이 맞춤
            const cushionTraps = detectTraps(b.cushion || '')
            const businessTraps = detectTraps(b.business || '')
            return (
              <div key={b.id} className={`${styles.bubble} ${styles.botBubble} ${styles.fadeUp}`}>
                <div className={styles.botAvatar}><img src="/orb-avatar.png" alt="Link" style={{width:'100%',height:'100%',objectFit:'cover'}} /></div>
                <div className={styles.resultSlim}>
                  {/* 토글 + copy */}
                  <div className={styles.resultTop}>
                    <div className={styles.toggle}>
                      <button
                        className={`${styles.toggleBtn} ${resultMode === 'cushion' ? styles.toggleActive : ''}`}
                        onClick={() => setResultMode('cushion')}
                      >
                        쿠션형
                      </button>
                      <button
                        className={`${styles.toggleBtn} ${resultMode === 'business' ? styles.toggleActive : ''}`}
                        onClick={() => setResultMode('business')}
                      >
                        실무형
                      </button>
                    </div>
                    <button
                      className={styles.copySmall}
                      onClick={async () => {
                        await navigator.clipboard.writeText(activeText || '')
                        setCopied(resultMode)
                        setTimeout(() => setCopied(null), 2000)
                      }}
                    >
                      {copied === resultMode ? '✓' : 'copy'}
                    </button>
                  </div>

                  {/* 높이 고정용: 두 버전 모두 렌더, 비활성은 숨김 */}
                  <div className={styles.resultBody}>
                    <div className={resultMode === 'cushion' ? styles.resultVisible : styles.resultHidden}>
                      <p className={styles.resultText}>{highlightTraps(b.cushion || '')}</p>
                      {cushionTraps.length > 0 && (
                        <div className={styles.trapInline}>
                          {cushionTraps.map((t) => (
                            <div key={t.word} className={styles.trapRow}>
                              <span className={styles.trapWord}>{t.word}</span>
                              <span className={styles.trapDesc}>{t.desc}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={resultMode === 'business' ? styles.resultVisible : styles.resultHidden}>
                      <p className={styles.resultText}>{highlightTraps(b.business || '')}</p>
                      {businessTraps.length > 0 && (
                        <div className={styles.trapInline}>
                          {businessTraps.map((t) => (
                            <div key={t.word} className={styles.trapRow}>
                              <span className={styles.trapWord}>{t.word}</span>
                              <span className={styles.trapDesc}>{t.desc}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 프로페셔널 스코어 */}
                  <div className={styles.scoreBox}>
                    <div className={styles.scoreHeader}>
                      <span className={styles.scoreTitle}>프로페셔널 스코어</span>
                      <span className={styles.scoreTotal}>87<span className={styles.scoreSuffix}>/100</span></span>
                    </div>
                    <div className={styles.scoreBar}>
                      <div className={styles.scoreRow}>
                        <span className={styles.scoreLabel}>격식도</span>
                        <div className={styles.barTrack}><div className={styles.barFillPurple} style={{ width: '82%' }} /></div>
                        <span className={styles.scoreNum}>82</span>
                      </div>
                      <div className={styles.scoreRow}>
                        <span className={styles.scoreLabel}>정중함</span>
                        <div className={styles.barTrack}><div className={styles.barFillTeal} style={{ width: '91%' }} /></div>
                        <span className={styles.scoreNum}>91</span>
                      </div>
                      <div className={styles.scoreRow}>
                        <span className={styles.scoreLabel}>명확성</span>
                        <div className={styles.barTrack}><div className={styles.barFillAmber} style={{ width: '78%' }} /></div>
                        <span className={styles.scoreNum}>78</span>
                      </div>
                    </div>
                  </div>

                  {/* 원포인트 코칭 */}
                  <div className={styles.coachBox}>
                    <span className={styles.coachIcon}>💡</span>
                    <span className={styles.coachText}>정중함은 높지만 요청 기한이 불명확해요. &quot;금일 중&quot;처럼 구체적 시점을 넣어보세요.</span>
                  </div>

                  {/* 메타 + 투표 + 필사 */}
                  <div className={styles.resultBottom}>
                    <span className={styles.resultMeta}>{selections.relation} · {selections.purpose} · {selections.formality}</span>
                    <div className={styles.voteMini}>
                      <button className={`${styles.voteSmall} ${myVote === 'like' ? styles.voteLike : ''}`} onClick={() => handleVote('like')}>
                        👍{likes > 0 && <span>{likes}</span>}
                      </button>
                      <button className={`${styles.voteSmall} ${myVote === 'dislike' ? styles.voteDislike : ''}`} onClick={() => handleVote('dislike')}>
                        👎{dislikes > 0 && <span>{dislikes}</span>}
                      </button>
                      <a href="/missions" className={styles.pilsaBtn}>✍️ 필사</a>
                    </div>
                  </div>

                  <button className={styles.resetBtn} onClick={handleReset}>
                    새로운 변환
                  </button>
                </div>
              </div>
            )
          }
          return null
        })}
      </div>
    </section>
  )
}
