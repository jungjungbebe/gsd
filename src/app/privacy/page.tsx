import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '개인정보처리방침 — 투톤',
  description: '투톤이 어떤 정보를 수집하고 어떻게 사용·보관하는지 안내해요.',
}

const sections: { title: string; body: React.ReactNode }[] = [
  {
    title: '1. 수집하는 정보',
    body: (
      <ul>
        <li>회원가입 시: 이메일, 비밀번호(암호화되어 인증 서비스에서 관리), 닉네임</li>
        <li>로그인 후 저장한 기록: 입력한 메시지 원문, 상황 분류, 선택한 답장 방향, 저장한 답장 문구</li>
        <li>로그인하지 않고 저장한 기록은 서버가 아니라 사용 중인 기기(브라우저)에만 저장돼요.</li>
        <li>서비스 이용 중 자동으로 생성되는 방문 통계(접속 페이지, 기기·브라우저 종류 등)</li>
      </ul>
    ),
  },
  {
    title: '2. 이용 목적',
    body: (
      <ul>
        <li>회원 식별과 로그인 유지, 계정별 기록 보관</li>
        <li>메시지 톤 분석과 답장 제안 기능 제공</li>
        <li>서비스 품질 개선과 오류 확인을 위한 통계 분석</li>
      </ul>
    ),
  },
  {
    title: '3. 외부 서비스 이용 (처리 위탁)',
    body: (
      <ul>
        <li>Supabase: 회원 인증과 기록 저장 (서버 위치: 일본 도쿄)</li>
        <li>Vercel: 웹사이트 호스팅과 방문 통계</li>
        <li>카카오 지도·장소검색: 필사 스팟 추천에 사용돼요. 「내 위치로 찾기」를 누를 때만 브라우저 위치 정보를 사용하며, 위치 좌표는 서버에 저장하지 않아요. 기기에는 선택한 방식(내 위치/동네)만 저장돼요.</li>
        <li>OpenAI: 톤 분석·답장 제안과 단어 사냥 사진의 글자 해독에 사용해요. 아래 「개인정보의 국외 이전」을 확인해 주세요.</li>
      </ul>
    ),
  },
  {
    title: '4. 개인정보의 국외 이전',
    body: (
      <ul>
        <li>이전받는 곳: OpenAI, L.L.C. (미국)</li>
        <li>이전 항목: 톤 체크에 입력한 메시지, 단어 사냥에서 올린 사진</li>
        <li>이전 시기와 방법: 해석을 요청할 때마다 암호화된 네트워크로 전송</li>
        <li>이용 목적: 메시지 해석과 답장 제안, 사진 속 글자 해독</li>
        <li>보유 기간: OpenAI 정책에 따라 오남용 확인을 위해 최대 30일 보관 후 삭제되며, AI 학습에는 쓰이지 않아요. 투톤 서버에는 사진을 저장하지 않아요.</li>
        <li>처음 해석을 요청할 때 이 내용을 안내하고 동의를 받아요. 동의하지 않으면 해석 기능을 쓸 수 없지만 다른 기능은 쓸 수 있어요.</li>
        <li>이름·회사명·연락처 등 개인정보는 지우고 입력해 주세요.</li>
      </ul>
    ),
  },
  {
    title: '5. 보관 기간과 삭제',
    body: (
      <p>
        회원 정보와 저장 기록은 탈퇴할 때까지 보관해요. MY 화면 아래 「계정 삭제」(또는 /account/delete)에서 직접 계정과
        기록을 바로 삭제할 수 있고, 이메일로 요청하면 지체 없이 삭제해요. 이 기기에만 저장된 기록은 같은 화면에서 지우거나
        브라우저 데이터를 지우면 함께 삭제돼요.
      </p>
    ),
  },
  {
    title: '6. 이용자의 권리',
    body: (
      <p>
        언제든 내 정보의 열람, 수정, 삭제를 요청할 수 있어요. 닉네임은 MY &gt; 프로필 편집에서 직접 바꿀 수 있고,
        그 외 요청은 아래 문의처로 보내주세요.
      </p>
    ),
  },
  {
    title: '7. 문의처',
    body: (
      <p>
        개인정보 관련 문의: <a href="mailto:tutone.kr@gmail.com">tutone.kr@gmail.com</a>
      </p>
    ),
  },
  {
    title: '8. 시행일',
    body: <p>이 방침은 2026년 11월 6일부터 적용돼요. (이전 버전: 2026년 10월 27일) 내용이 바뀌면 이 페이지에 안내해요.</p>,
  },
]

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '56px 20px 24px' }}>
      <div
        style={{
          borderRadius: 24,
          border: '0.5px solid rgba(255,255,255,0.5)',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          padding: '28px 24px',
          color: 'var(--text-primary)',
          lineHeight: 1.7,
          fontSize: 14,
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-purple)', marginBottom: 8 }}>
          PRIVACY
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>개인정보처리방침</h1>
        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)' }}>
          투톤(Tutone)이 어떤 정보를 어떻게 다루는지 안내해요.
        </p>
        {sections.map((s) => (
          <section key={s.title} style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>{s.title}</h2>
            <div className="privacy-body" style={{ color: 'var(--text-secondary)' }}>{s.body}</div>
          </section>
        ))}
        <div style={{ marginTop: 28 }}>
          <Link href="/tone-check" style={{ color: 'var(--text-purple)', fontWeight: 600, textDecoration: 'none' }}>
            ← 홈으로
          </Link>
        </div>
      </div>
      <style>{`.privacy-body ul{margin:0;padding-left:18px;list-style:disc}.privacy-body li{margin:2px 0}.privacy-body p{margin:0}.privacy-body a{color:var(--text-purple);text-decoration:underline}`}</style>
    </main>
  )
}
