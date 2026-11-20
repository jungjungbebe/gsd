import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/LegalPage'

export const metadata: Metadata = {
  title: '고객지원 — 투톤',
  description: '투톤 이용 중 궁금한 점이나 문제가 있을 때 확인하세요.',
}

const MAIL = 'tutone.kr@gmail.com'

export default function SupportPage() {
  return (
    <LegalPage
      eyebrow="SUPPORT"
      title="고객지원"
      intro="이용 중 궁금한 점이나 불편한 점이 있으면 아래 내용을 먼저 확인하고, 해결되지 않으면 이메일로 알려 주세요."
      sections={[
        {
          title: '문의하기',
          body: (
            <p>
              이메일: <a href={`mailto:${MAIL}`}>{MAIL}</a>
              <br />
              보통 영업일 기준 2일 안에 답장드려요. 오류 문의라면 사용 중인 기기, 화면 캡처, 입력한 문장을 함께 보내 주시면 빨리 확인할 수 있어요.
            </p>
          ),
        },
        {
          title: '자주 묻는 질문',
          body: (
            <ul>
              <li><b>해석이나 답장이 이상해요.</b> AI가 만든 결과라 틀릴 수 있어요. 보내기 전에 꼭 직접 확인해 주세요. 이상한 결과는 화면의 👍/👎로 알려 주시면 개선에 반영해요.</li>
              <li><b>입력한 메시지는 어디에 저장되나요?</b> 해석을 위해 OpenAI로 전송되고, 로그인한 경우 저장한 기록만 계정에 보관돼요. 자세한 내용은 <Link href="/privacy">개인정보처리방침</Link>을 확인해 주세요.</li>
              <li><b>카메라가 켜지지 않아요.</b> 기기 설정에서 투톤(또는 브라우저)의 카메라 권한을 허용해 주세요.</li>
              <li><b>로그인 없이도 쓸 수 있나요?</b> 톤체크는 로그인 없이 쓸 수 있어요. 이때 기록은 사용 중인 기기에만 저장돼요.</li>
              <li><b>계정을 삭제하고 싶어요.</b> MY 맨 아래 「계정 삭제」 또는 <Link href="/account/delete">계정 삭제 페이지</Link>에서 바로 삭제할 수 있어요. 계정과 저장한 기록이 함께 지워지고 되돌릴 수 없어요.</li>
            </ul>
          ),
        },
        {
          title: '관련 문서',
          body: (
            <p>
              <Link href="/terms">이용약관</Link> · <Link href="/privacy">개인정보처리방침</Link>
            </p>
          ),
        },
      ]}
    />
  )
}
