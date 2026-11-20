import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/LegalPage'

export const metadata: Metadata = {
  title: '이용약관 — 투톤',
  description: '투톤 서비스 이용약관',
}

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="TERMS"
      title="이용약관"
      intro="투톤(Tutone)을 이용하기 전에 아래 내용을 확인해 주세요."
      sections={[
        { title: '1. 서비스 내용', body: <p>투톤은 업무 메시지의 뜻을 쉬운 말로 풀고, 상황에 맞는 답장 초안을 제안하며, 회사어를 익히는 미션(단어사냥·필사 스팟)과 기록 기능을 제공하는 서비스예요.</p> },
        { title: '2. AI 결과에 대한 안내', body: <p>해석과 답장은 AI가 만든 참고용 결과예요. 틀리거나 상황에 맞지 않을 수 있으니, 실제로 보내거나 판단하기 전에 반드시 직접 확인해 주세요. 투톤은 AI 결과를 그대로 사용해 생긴 결과에 대해 책임지지 않아요.</p> },
        { title: '3. 계정', body: <ul><li>회원가입은 이메일로 할 수 있고, 계정 정보는 본인이 안전하게 관리해야 해요.</li><li>계정은 MY의 「계정 삭제」에서 언제든 삭제할 수 있어요. 삭제하면 저장한 기록도 함께 지워지고 되돌릴 수 없어요.</li></ul> },
        { title: '4. 이용 시 지켜 주세요', body: <ul><li>다른 사람의 개인정보, 회사의 기밀 정보, 법적으로 문제가 되는 내용을 입력하지 마세요.</li><li>서비스를 비정상적으로 대량 호출하거나, 시스템을 방해하는 행위를 하지 마세요.</li><li>이를 어기면 이용이 제한될 수 있어요.</li></ul> },
        { title: '5. 콘텐츠 권리', body: <p>사용자가 입력하거나 직접 찍은 사진·문장의 권리는 사용자에게 있어요. 투톤은 서비스 제공에 필요한 범위에서만 이를 처리해요. 투톤의 디자인, 로고, 미션 문구 등 서비스 자체의 권리는 투톤에 있어요.</p> },
        { title: '6. 서비스 변경·중단', body: <p>기능은 개선을 위해 바뀌거나 중단될 수 있어요. 중요한 변경은 서비스 안이나 이 페이지에서 미리 알려 드려요.</p> },
        { title: '7. 개인정보', body: <p>개인정보 처리 방식은 <Link href="/privacy">개인정보처리방침</Link>을 따라요.</p> },
        { title: '8. 문의', body: <p><a href="mailto:tutone.kr@gmail.com">tutone.kr@gmail.com</a></p> },
        { title: '9. 시행일', body: <p>이 약관은 2026년 11월 20일부터 적용돼요.</p> },
      ]}
    />
  )
}
