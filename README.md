# 문해력UP — 사회초년생을 위한 비즈니스 문해력 플랫폼

진단 → 레벨별 독해 훈련 → 필사 미션 → 커뮤니티 피드

## 기능
- 문해력 진단 테스트 (7문항, 로그인 불필요)
- 레벨별(1-5) 독해 콘텐츠 + 한자 어원 hover 힌트
- 오늘의 필사 미션 (타이핑 제출)
- 7일 연속 스트릭 + 배지 시스템
- 구독자 전용 커뮤니티 피드
- AI 기반 매일 자동 콘텐츠 생성

## 기술 스택
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth)
- **배포**: Vercel
- **AI**: OpenAI API (선택)

## 로컬 실행

1. 의존성 설치:
   ```bash
   npm install
   ```

2. Supabase 프로젝트 생성 후 환경 변수 설정:
   ```bash
   cp .env.local.example .env.local
   # .env.local에 Supabase URL, Anon Key, Service Role Key 입력
   ```

3. Supabase에 스키마 적용:
   ```bash
   # Supabase Dashboard → SQL Editor에서 실행:
   # supabase/migrations/00001_initial_schema.sql
   # supabase/seed.sql
   ```

4. 개발 서버 시작:
   ```bash
   npm run dev
   ```

5. http://localhost:3000 접속

## 데모 모드
Supabase 환경 변수 없이도 대부분의 UI가 데모 데이터로 동작합니다.

## 프로젝트 구조
```
src/
  app/
    page.tsx              # 랜딩 페이지
    layout.tsx            # 글로벌 레이아웃
    diagnosis/page.tsx    # 진단 테스트
    contents/page.tsx     # 레벨별 콘텐츠
    contents/[id]/page.tsx # 콘텐츠 상세
    missions/page.tsx     # 오늘의 필사 미션
    dashboard/page.tsx    # 대시보드
    community/page.tsx    # 커뮤니티 피드
    (auth)/login/page.tsx # 로그인
    (auth)/signup/page.tsx # 회원가입
  components/
    Navbar.tsx
    VocabularyHint.tsx
    StreakCalendar.tsx
    BadgeGrid.tsx
    SubscriptionGate.tsx
  lib/
    diagnosis.ts
    supabase/client.ts
    supabase/server.ts
  types/database.ts
supabase/
  migrations/00001_initial_schema.sql
  seed.sql
```
