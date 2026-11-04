# 투톤 스토어 앱 패키징 점검 보고

작성일: 2026-11-04 · 브랜치: `app/store-packaging` · 기준 커밋: `7181bd7`

## 1. 현재 구조 점검 결과

| 항목 | 현재 상태 | 정적 번들(Capacitor `output: 'export'`)에서 |
|---|---|---|
| 프레임워크 | Next.js 14.2 App Router, Vercel 배포 | — |
| 빌드 | `next build` (Node 서버 런타임) | `output: 'export'`로 바꾸면 아래 기능이 빠짐 |
| API 라우트 | `/api/tone-check`, `/api/hunt-decode`(단어사냥 OCR), `/api/generate-mission`, `/api/missions/today` — 모두 서버에서 OpenAI 키·Supabase 서버 클라이언트 사용 | **동작 안 함** (번들에 넣으면 OpenAI 키가 앱에 노출됨) |
| 인증 | Supabase SSR(쿠키), `src/middleware.ts`에서 세션 갱신·`/contents` 보호, `/auth/callback` 라우트에서 코드 교환 | **동작 안 함** (미들웨어·라우트 핸들러 없음) |
| 서버 컴포넌트 데이터 | `/contents`, `/contents/[id]`가 서버에서 Supabase 조회 | 빌드 시점 고정 또는 클라이언트 조회로 재작성 필요 |
| 기타 서버 기능 | `next.config` 리다이렉트(`/service`, `/dashboard`), 동적 OG 이미지, 메모리 기반 요청 제한 | 리다이렉트·OG 이미지 사라짐 |
| PWA | manifest, 서비스 워커, 192/512/maskable 아이콘, 시작 화면 | 유지 가능 |

**결론:** 현재 앱은 핵심 기능(톤체크 해석, 단어사냥 OCR, 로그인)이 서버에 의존해서, 구조를 바꾸지 않고는 정적 웹 번들로 패키징할 수 없습니다. 요청대로 구조를 억지로 바꾸지 않고, 아래 대안을 먼저 제안합니다.

막히는 기능 요약
- 톤체크 해석, 단어사냥 OCR, 미션 생성: OpenAI 비밀키가 필요한 서버 라우트
- 로그인 유지·보호 페이지: 쿠키 기반 SSR 인증과 미들웨어
- 콘텐츠 상세: 서버 컴포넌트 조회

## 2. 권장안

### Android — TWA(Trusted Web Activity)로 기존 PWA 패키징 (우선)
배포된 사이트를 Chrome 엔진으로 전체 화면 실행하는 방식이라 웹 코드 변경이 거의 없습니다.

- 도구: Bubblewrap CLI (`@bubblewrap/cli`), 패키지명 `kr.tutone.app`, 앱 이름 `투톤 TUTONE`
- 필요한 웹 변경: `/.well-known/assetlinks.json` 추가 (Play 앱 서명 키의 SHA-256 지문을 넣어야 함)
- 아이콘·시작 화면: 기존 manifest 아이콘(192/512/maskable)과 배경색 사용
- 기능별 동작
  - 카메라·OCR: Chrome의 `getUserMedia` 그대로 동작 (첫 사용 시 권한 요청)
  - 클립보드 복사·공유: 웹 Clipboard / Web Share API 그대로 동작
  - 뒤로 가기: 시스템 뒤로 가기가 앱 내 이전 페이지로 이동, 첫 화면에서 앱 종료
  - 외부 링크: 다른 도메인은 Chrome 커스텀 탭으로 열림
  - 알림: TWA는 웹 알림 권한을 앱 알림으로 위임. **정해진 시간 로컬 알림은 웹에서 불가** → 필사 미션 알림은 웹 푸시(서버 필요) 또는 이후 네이티브 전환 시 구현
- 결과물: `bubblewrap build`로 AAB 생성 → Play Console 업로드

### iOS — Capacitor 원격 URL 셸 (최소 변경)
iOS에는 TWA가 없어서, Capacitor 앱이 배포된 사이트(`server.url`)를 WKWebView로 여는 방식이 가장 작은 변경입니다.

필요한 최소 변경 범위
1. `ios/` Capacitor 프로젝트 생성 (`appId: kr.tutone.app`, `appName: 투톤 TUTONE`, `server.url`=운영 도메인)
2. Info.plist 권한 문구: 카메라(`NSCameraUsageDescription`), 사진 보관함(`NSPhotoLibraryUsageDescription`)
3. 웹에서 앱 실행 여부 감지(`window.Capacitor`) 후
   - PWA "앱 설치하기" 안내 숨김 (앱 안에서는 standalone이 아니라서 현재 그대로면 노출됨)
   - 외부 링크를 `@capacitor/browser`로 열기
   - 공유는 `@capacitor/share`, 필사 미션 알림은 `@capacitor/local-notifications`
4. 스와이프 뒤로 가기(`allowsBackForwardNavigationGestures`), 상태바(`@capacitor/status-bar`), 키보드(`@capacitor/keyboard` resize 모드)
5. **앱 내 계정 삭제 기능** — App Store 심사 기준 5.1.1(v): 회원가입이 있으면 앱 안에서 탈퇴가 가능해야 함. 현재 개인정보처리방침에는 "요청 시 삭제"만 있고 화면 기능은 없음
6. 심사 리스크: 웹사이트를 감싼 앱은 4.2(최소 기능)로 반려될 수 있음 → 네이티브 카메라·로컬 알림·공유 시트 연결과 오프라인 화면으로 앱다운 기능을 보강해야 함

## 3. 요청 항목별 상태

| # | 항목 | Android(TWA) | iOS(Capacitor 원격) |
|---|---|---|---|
| 1 | Capacitor 초기화 | 해당 없음 | 가능 |
| 2·3 | 앱 이름·ID | Bubblewrap 설정 | capacitor.config |
| 4 | 플랫폼 프로젝트 | Bubblewrap이 생성 | `npx cap add ios` (빌드는 Mac 필요) |
| 5 | 아이콘·스플래시 | manifest 사용 | `@capacitor/assets`로 생성 |
| 6 | 상태바·Safe Area | 기존 `viewport-fit=cover`·`env()` 대응 유지 | StatusBar 플러그인 추가 |
| 7 | 키보드 | Chrome 기본 리사이즈 | Keyboard 플러그인 resize |
| 8 | 카메라·사진 권한 | Chrome 권한 | Info.plist 문구 |
| 9 | OCR 실기기 테스트 | 실기기 필요 (이 환경에서 불가) | 실기기 필요 |
| 10 | 클립보드·공유 | 웹 API 동작 | 웹 API + Share 플러그인 |
| 11 | 로컬 알림 | 웹 푸시 필요 | LocalNotifications 플러그인 |
| 12 | 뒤로 가기·외부 링크 | 기본 지원 | 플러그인 연결 |
| 13 | 개인정보·권한 문구 | 처리방침 보완 | 처리방침 보완 + 권한 문구 |
| 14 | AAB·Archive 절차 | 문서화 가능 | 문서화 가능 (Mac·Xcode 필요) |

## 4. 결정이 필요한 것
1. **운영 도메인**: TWA의 assetlinks와 iOS 셸 URL이 도메인에 묶입니다. `gsd-mauve.vercel.app` 대신 정식 도메인을 먼저 정하는 걸 권장합니다 (나중에 바꾸면 앱 업데이트 필요).
2. **개발자 계정**: Google Play Console(일회 25달러), Apple Developer Program(연 99달러).
3. **iOS 빌드 환경**: Archive는 Mac + Xcode에서만 만들 수 있습니다.
4. **계정 삭제 기능** 추가 여부 (iOS 심사 필수).
