// AI(OpenAI) 전송 동의. 기기별로 한 번 받는다. 문구가 바뀌면 KEY 버전을 올려 다시 묻는다.
export const AI_CONSENT_KEY = 'tutone_ai_consent_v1'

export function hasAiConsent(): boolean {
  try {
    return !!localStorage.getItem(AI_CONSENT_KEY)
  } catch {
    return false
  }
}

// 동의가 없으면 동의 창을 띄우고 결과(true/false)를 돌려준다
export function requestAiConsent(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (hasAiConsent()) return Promise.resolve(true)
  return new Promise((resolve) => {
    const onResult = (e: Event) => {
      window.removeEventListener('tt-ai-consent-result', onResult)
      resolve(!!(e as CustomEvent<boolean>).detail)
    }
    window.addEventListener('tt-ai-consent-result', onResult)
    window.dispatchEvent(new Event('tt-ai-consent-request'))
  })
}
