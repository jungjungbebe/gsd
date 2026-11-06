# 투톤 iOS 앱 빌드 안내 (Capacitor)

## 구조
- iOS 앱은 배포된 웹앱(`https://gsd-mauve.vercel.app`)을 그대로 여는 **Capacitor 셸**입니다.
- 웹 코드·AI 해석·로그인은 지금처럼 Vercel에서 배포되고, 앱은 그 주소를 엽니다. 웹을 고치면 앱도 바로 바뀝니다 (앱 재심사 불필요).
- 앱을 다시 빌드해야 하는 경우: 아이콘·스플래시·권한 문구·도메인(`capacitor.config.ts`의 `SITE`)·플러그인을 바꿀 때.
- 웹 정적 번들로 만들지 않은 이유: 톤체크·단어사냥 OCR·로그인이 서버(API 라우트, 미들웨어)에 의존합니다 (`docs/app-packaging.md` 참고).

## 들어 있는 것
| 항목 | 위치 |
|---|---|
| 앱 ID `kr.tutone.app`, 이름 `투톤 TUTONE`(홈 화면 표시명 `투톤`) | `capacitor.config.ts`, `ios/App/App/Info.plist` |
| 카메라·사진·위치 권한 문구 | `Info.plist` (`NSCameraUsageDescription` 등) |
| 키보드가 입력창을 가리지 않게 웹뷰 리사이즈 | `capacitor.config.ts` → `Keyboard.resize: 'native'` |
| 상태바·홈 바 영역 | 웹뷰를 화면 끝까지 쓰고(`contentInset: 'never'`), 웹의 `env(safe-area-inset-*)`로 여백 처리 |
| 왼쪽 가장자리 스와이프로 뒤로 가기 | `ios/App/App/MainViewController.swift` |
| 외부 링크 | `allowNavigation`에 없는 도메인은 Safari로 열림 |
| 인터넷이 끊겼을 때 화면 | `cap-shell/index.html` |
| 앱 아이콘·시작 화면(검은 배경 + 투톤 로고) | `assets/` 원본 → `ios/App/App/Assets.xcassets` |
| 앱 안에서는 PWA 설치 안내 숨김 | 웹 `PwaInstall.tsx` (User-Agent `TutoneApp`) |
| 세로 화면 고정, iPhone 전용, iOS 15 이상 | Xcode 프로젝트 설정 |

## 맥에서 처음 한 번
```bash
# 1) Xcode 설치 (App Store) 후 한 번 실행해서 추가 구성요소 설치
# 2) 코드 받기
git clone https://github.com/jungjungbebe/gsd.git
cd gsd
git checkout app/store-packaging
# 3) 패키지 설치
npm install
# 4) iOS 프로젝트에 설정·플러그인 반영
npx cap sync ios
# 5) Xcode로 열기
npx cap open ios
```
CocoaPods는 필요 없습니다 (Swift Package Manager 사용).

## Xcode 설정 순서
1. 왼쪽에서 **App** 프로젝트 → TARGETS **App** 선택.
2. **Signing & Capabilities** 탭
   - "Automatically manage signing" 켜기
   - Team: Apple Developer 계정 선택 (없으면 Xcode → Settings → Accounts에서 Apple ID 추가)
   - Bundle Identifier가 `kr.tutone.app`인지 확인
3. **General** 탭
   - Display Name `투톤`, Version `1.0.0`, Build `1` 확인
   - Minimum Deployments: iOS 15.0
4. 처음 열면 Swift 패키지(Capacitor)를 자동으로 내려받습니다. 왼쪽 아래 "Package Dependencies"가 다 받아질 때까지 기다립니다.
5. 위쪽 기기 선택에서 **iPhone 16 시뮬레이터**(또는 연결한 아이폰)를 고르고 ▶ 실행.

## 시뮬레이터·실기기에서 확인할 것
- [ ] 시작 화면(검은 배경 + 로고) → 톤체크 화면
- [ ] 위쪽 상태바, 아래 홈 바에 글자·버튼이 가리지 않는지
- [ ] 메시지 입력 시 키보드가 "해석하기" 버튼을 가리지 않는지
- [ ] 단어사냥 카메라 권한 요청 → 촬영·OCR (실기기에서만 가능)
- [ ] 필사 미션 "내 위치로 찾기" 위치 권한 요청
- [ ] 결과 복사하기
- [ ] 왼쪽 가장자리 스와이프로 뒤로 가기
- [ ] 개인정보처리방침 등 외부 링크
- [ ] 비행기 모드에서 실행 → 연결 안내 화면

## App Store 제출 (Archive)
1. Apple Developer Program 가입 (연 99달러), App Store Connect에서 새 앱 생성 (번들 ID `kr.tutone.app`).
2. Xcode 위쪽 기기 선택을 **Any iOS Device (arm64)** 로 변경.
3. 메뉴 **Product → Archive**.
4. 완료되면 Organizer 창 → **Distribute App → App Store Connect → Upload**.
5. App Store Connect에서 빌드 선택, 스크린샷·설명·개인정보 라벨·심사용 테스트 계정 입력 후 심사 제출.
6. 다음 버전 올릴 때는 Build 번호를 올리고 3~5 반복.

## 심사 전 필수 (앱 밖 작업)
- 앱 안 계정 삭제 기능 (App Store 5.1.1(v))
- AI(OpenAI)로 입력 문장을 보내기 전 고지·동의 (5.1.2(i))
- 웹사이트를 감싼 앱은 4.2(최소 기능)로 반려될 수 있음 → 네이티브 공유·알림 등 보강 검토
