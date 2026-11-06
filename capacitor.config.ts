import type { CapacitorConfig } from '@capacitor/cli'

// iOS 앱은 배포된 투톤 웹앱(Vercel)을 그대로 불러오는 셸이다.
// 웹 코드는 Vercel에서 계속 배포되고, 앱은 그 주소를 연다. (서버 기능·로그인·AI 해석이 그대로 동작)
// 도메인을 바꾸면 SITE만 바꾸고 `npx cap sync ios` 후 앱을 다시 빌드한다.
const SITE = 'https://gsd-mauve.vercel.app'

const config: CapacitorConfig = {
  appId: 'kr.tutone.app',
  appName: '투톤 TUTONE',
  // 인터넷이 끊겼을 때 보여줄 로컬 화면
  webDir: 'cap-shell',
  server: {
    url: `${SITE}/tone-check?source=ios`,
    // 앱 안에서 열 도메인. 여기에 없는 외부 링크는 Safari로 열린다.
    allowNavigation: ['gsd-mauve.vercel.app', '*.supabase.co', '*.kakao.com', '*.daumcdn.net'],
    errorPath: 'index.html',
  },
  // 웹에서 앱 안인지 알 수 있게 (PWA 설치 안내 숨김 등)
  appendUserAgent: 'TutoneApp/1.0',
  ios: {
    // 상태바·홈 바 영역은 웹의 safe-area(env()) 처리로 대응
    contentInset: 'never',
    backgroundColor: '#000000',
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'LIGHT',
    },
    Keyboard: {
      // 키보드가 올라오면 웹뷰 높이를 줄여 입력창·버튼이 가려지지 않게
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
}

export default config
