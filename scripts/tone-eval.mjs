// 톤체크 자동 점검: 다양한 메시지를 실제 API에 넣고, 서버가 돌려준 검사 결과(checks)와 구조를 표로 정리한다.
// 사용법: node scripts/tone-eval.mjs [BASE_URL]   (기본: https://gsd-mauve.vercel.app)
const BASE = (process.argv[2] || process.env.BASE_URL || 'https://gsd-mauve.vercel.app').replace(/\/$/, '')

const CASES = [
  // 업무 요청
  '클라이언트 피드백 반영해서 베리에이션 디벨롭 후 EOD까지 컨펌 요청 부탁드립니다.',
  '내일 오전까지 회의록 정리해서 팀 채널에 올려주세요.',
  '견적서 최신 버전으로 재송부 부탁드립니다.',
  '상세페이지 썸네일 A/B 테스트 세팅 후 결과 공유 부탁드려요.',
  '소재별 CTR과 CVR 비교 후 저성과 소재는 오프하고, 효율이 확인된 어셋 중심으로 예산 리밸런싱 부탁드립니다.',
  // 질문
  '이번 프로모션 예산 집행률 어느 정도인가요?',
  '혹시 다음 주 촬영 장소 확정됐나요?',
  '레퍼런스 보드 어디에 올려두셨어요?',
  // 승인
  '첨부한 품의서 검토 후 결재 부탁드립니다.',
  'B안으로 진행해도 될지 컨펌 부탁드립니다.',
  // 진행 확인
  '지난주 요청드린 정산 건 어떻게 진행되고 있을까요?',
  '오늘 오픈 예정인 랜딩페이지 이상 없나요?',
  // 피드백
  '전체적으로 톤이 너무 무거워요. 좀 더 가볍게 가봅시다.',
  '카피가 브랜드 톤이랑 안 맞는 것 같아요.',
  // 일정
  '목요일 3시 미팅 가능하실까요?',
  '킥오프 일정 다음 주 화요일로 미뤄도 될까요?',
  // 공지
  '금일 18시부터 서버 점검 예정입니다.',
  '다음 달부터 경비 정산은 새 시스템으로 진행됩니다.',
  // 문제 제기
  '발주서 수량이 실제와 다르게 들어갔네요. 확인 부탁드립니다.',
  '어제 배포 이후로 결제 페이지 오류가 계속 나요.',
  // 짧은 말·구어체·여러 요청
  '이거 오늘 되죠?',
  'ㅇㅋ 그럼 그렇게 갑시다',
  '어제 공유해주신 시안 잘 봤습니다. 2안 방향 좋은데 컬러만 조정해서 금요일까지 다시 부탁드리고, 견적도 같이 보내주세요.',
  'ASAP으로 deck 업데이트해서 클라이언트 리뷰 전에 싱크 한번 하시죠.',
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rows = []
let pass = 0

for (const [i, text] of CASES.entries()) {
  let data = null
  let err = ''
  try {
    const res = await fetch(BASE + '/api/tone-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    data = await res.json()
    if (!res.ok) err = data?.error || 'HTTP ' + res.status
  } catch (e) {
    err = String(e)
  }
  const problems = []
  if (err) problems.push('실패: ' + err)
  else {
    if (!data.interpretation) problems.push('쉽게 풀면 없음')
    if (!data.options?.some((o) => o.available)) problems.push('쓸 수 있는 답장 없음')
    for (const [id, issues] of Object.entries(data.checks ?? {})) for (const x of issues) problems.push(`${id}: ${x.split(' →')[0]}`)
  }
  if (problems.length === 0) pass++
  const replies = (data?.options ?? []).filter((o) => o.text).map((o) => `${o.label}: ${o.text}`).join('<br>')
  rows.push(`| ${i + 1} | ${text} | ${data?.messageType ?? '-'} | ${data?.situation?.deadline || '-'} | ${replies || '-'} | ${problems.length ? '⚠️ ' + problems.join('<br>') : '✅'} |`)
  console.log(`${i + 1}/${CASES.length} ${problems.length ? 'WARN' : 'OK'} ${text}`)
  await sleep(7000) // 서버 요청 제한(분당 10회) 피하기
}

const report = [
  `## 톤체크 자동 점검 — ${pass}/${CASES.length} 통과`,
  '',
  `대상: ${BASE}`,
  '',
  '| # | 받은 메시지 | 유형 | 기한 | 답장 | 검사 |',
  '|---|---|---|---|---|---|',
  ...rows,
].join('\n')

console.log('\n' + report)
if (process.env.GITHUB_STEP_SUMMARY) {
  const fs = await import('node:fs')
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n')
}
