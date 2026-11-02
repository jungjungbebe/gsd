// 필사 스팟 "오늘의 세트": 감성 문구 → 업무 문장으로 바꿔 쓰기 미션 → 힌트 단어
// 세트는 운영자가 정한다. 날짜로 하루에 하나씩 돌아가며 보여준다.

export interface HintWord {
  word: string
  meaning: string
  example: string
}

export interface MissionSet {
  id: string
  korean: string
  hanja: string
  english: string
  sentence: string
  bridge: string
  sentenceMark: string
  task: string
  mission: { before: string; highlight: string; tail: string }
  hints: HintWord[]
  hunt: {
    label: string // 헤드라인용 이름 (예: 기한)
    type: string // 결과의 '표현 유형'
    sub: string
    words: string[] // 발견 예시 (힌트)
    matchRule: string // 성공 판정 기준 (AI에 전달)
    exclude: string // 제외 기준
    questions: string[] // 결과 요약 질문
  }
}

export const MISSION_SETS: MissionSet[] = [
  {
    id: 'confirm',
    hunt: {
      label: '확인하거나 연락할 내용',
      type: '문의·확인',
      sub: '안내문이나 간판에서 문의, 확인, 접수 방법을 발견해보세요.',
      words: ['문의 바랍니다', '접수 안내', '확인 후 연락'],
      matchRule: '독자에게 무엇을 확인하거나 어디에 문의·연락해야 하는지 안내하는 문장',
      exclude: '콘텐츠 제목, 영상 제목, 상품명, 사람 이름, 감상 문구, 일반 명사',
      questions: ['무엇을 확인하나요', '어디에 문의하나요'],
    },
    sentenceMark: '정확해지는 일이다.',
    task: '확인하고 답하기',
    korean: '확인',
    hanja: '確認',
    english: 'CONFIRM',
    sentence: '답하기 전에 한 번 묻는 것은 늦는 것이 아니라 정확해지는 일이다.',
    bridge: '바로 답하기 전에 확인하는 한마디를 업무 문장으로 옮겨봐요.',
    mission: { before: '동료가 급한 일정을 요청했어요.', highlight: '바로 수락하지 않고 마감을 확인하는 말', tail: '업무 문장으로 바꿔보세요.' },
    hints: [
      { word: '금일', meaning: '오늘을 뜻하는 한자어예요. 금요일이 아니에요.', example: '금일 중으로 회신 부탁드립니다.' },
      { word: '회신', meaning: '요청이나 질문에 답을 보내는 것', example: '내일 오전까지 회신드리겠습니다.' },
      { word: '가능 여부', meaning: '할 수 있는지 없는지', example: '일정 확인 후 가능 여부를 말씀드리겠습니다.' },
    ],
  },
  {
    id: 'scope',
    hunt: {
      label: '조건',
      type: '조건',
      sub: '특정한 경우에만 적용되는 내용을 안내문에서 발견해보세요.',
      words: ['우천 시', '미성년자 제외', '2인 이상'],
      matchRule: '특정한 경우나 대상에만 적용되는 조건과 그 결과를 알려주는 문장',
      exclude: '콘텐츠 제목, 영상 제목, 상품명, 사람 이름, 감상 문구, 일반 명사',
      questions: ['어떤 경우인가요', '그때 어떻게 되나요'],
    },
    sentenceMark: '어디를 고칠지가 숨어 있다.',
    task: '범위 좁혀 되묻기',
    korean: '범위',
    hanja: '範圍',
    english: 'SCOPE',
    sentence: '고쳐 달라는 말 속에는 어디를 고칠지가 숨어 있다.',
    bridge: '수정 요청을 받았을 때 어디까지 고칠지 좁혀 묻는 문장을 만들어봐요.',
    mission: { before: '"좀 아쉬운데 다시 봐주세요"라는 피드백을 받았어요.', highlight: '어느 부분을 고칠지 되묻는 말', tail: '업무 문장으로 바꿔보세요.' },
    hints: [
      { word: '반영', meaning: '의견이나 수정 사항을 결과물에 넣는 것', example: '말씀하신 내용을 반영해 수정본을 전달드리겠습니다.' },
      { word: '보완', meaning: '부족한 부분을 채우는 것', example: '자료를 보완해서 다시 공유드리겠습니다.' },
      { word: '우선순위', meaning: '먼저 처리할 순서', example: '우선순위를 확인한 뒤 진행하겠습니다.' },
    ],
  },
  {
    id: 'boundary',
    hunt: {
      label: '하면 안 되는 일',
      type: '금지·주의',
      sub: '간판이나 표지판에서 금지, 제한 사항을 발견해보세요.',
      words: ['출입 금지', '촬영 금지', '주차 불가'],
      matchRule: '하면 안 되거나 제한되는 행동을 알려주는 문장',
      exclude: '콘텐츠 제목, 영상 제목, 상품명, 사람 이름, 감상 문구, 일반 명사',
      questions: ['무엇을 하면 안 되나요', '예외가 있나요'],
    },
    sentenceMark: '다음의 가능성을 남기며 할 수 있다.',
    task: '대안 남기며 거절하기',
    korean: '경계',
    hanja: '境界',
    english: 'BOUNDARY',
    sentence: '할 수 없다는 말도 다음의 가능성을 남기며 할 수 있다.',
    bridge: '거절하더라도 다음 길을 남기는 문장을 업무 표현으로 옮겨봐요.',
    mission: { before: '지금은 맡기 어려운 요청이 왔어요.', highlight: '거절하면서 대안을 함께 전하는 말', tail: '업무 문장으로 바꿔보세요.' },
    hints: [
      { word: '양해', meaning: '사정을 이해하고 받아들여 주는 것', example: '일정상 어려운 점 양해 부탁드립니다.' },
      { word: '대안', meaning: '원래 안을 대신할 다른 방법', example: '대안으로 다음 주 초 전달을 제안드립니다.' },
      { word: '조율', meaning: '서로 의견이나 일정을 맞추는 것', example: '가능한 일정을 조율하고 싶습니다.' },
    ],
  },
  {
    id: 'pace',
    hunt: {
      label: '기한',
      type: '기한',
      sub: '안내문이나 간판에서 마감일, 신청 기한, 종료 시점을 발견해보세요.',
      words: ['접수 마감', '사전 예약', '오후 6시까지'],
      matchRule: '날짜, 시간 또는 종료 시점이 포함되어 언제까지/언제 해야 하는지 알려주는 문장',
      exclude: '단순 영업시간, 영상 재생시간, 게시일, 콘텐츠 제목, 상품명, 일반 명사',
      questions: ['무엇을 해야 하나요', '언제까지인가요'],
    },
    sentenceMark: '서두르는 일은 다르다.',
    task: '인정하고 일정 알리기',
    korean: '속도',
    hanja: '速度',
    english: 'PACE',
    sentence: '늦었다는 사실을 인정하는 일과 서두르는 일은 다르다.',
    bridge: '늦은 회신에는 짧게 인정하고 다음 일정을 분명히 전하는 표현을 연습해요.',
    mission: { before: '"혹시 확인하셨나요?"라는 재촉을 받았어요.', highlight: '짧게 사과하고 다음 일정을 분명히 전하는 말', tail: '업무 문장으로 바꿔보세요.' },
    hints: [
      { word: '지연', meaning: '예정보다 늦어지는 것', example: '회신이 지연되어 죄송합니다.' },
      { word: '진행 상황', meaning: '일이 지금 어디까지 되어 있는지', example: '현재 진행 상황을 공유드립니다.' },
      { word: '기한', meaning: '정해진 마감 시점', example: '기한 내에 전달드리겠습니다.' },
    ],
  },
  {
    id: 'clarity',
    hunt: {
      label: '해야 할 일',
      type: '해야 할 일',
      sub: '안내문에서 준비하거나 신청해야 할 내용을 발견해보세요.',
      words: ['신분증 지참', '사전 예약', '접수 후 입장'],
      matchRule: '독자에게 준비하거나 신청하는 등 구체적인 행동을 요구하거나 안내하는 문장',
      exclude: '콘텐츠 제목, 영상 제목, 상품명, 사람 이름, 감상 문구, 일반 명사',
      questions: ['무엇을 해야 하나요', '언제 하나요'],
    },
    sentenceMark: '기다림을 끝낸다.',
    task: '받았다고 알리기',
    korean: '명료',
    hanja: '明瞭',
    english: 'CLARITY',
    sentence: '받았다는 한 줄이 상대의 기다림을 끝낸다.',
    bridge: '받았다는 확인과 다음 일정을 함께 전하는 문장을 업무 표현으로 옮겨봐요.',
    mission: { before: '거래처에서 자료를 보냈어요.', highlight: '받았다는 확인과 다음 일정을 함께 전하는 말', tail: '업무 문장으로 바꿔보세요.' },
    hints: [
      { word: '수신', meaning: '메일이나 자료를 받는 것', example: '보내주신 자료 수신 확인했습니다.' },
      { word: '검토', meaning: '내용을 살펴보고 판단하는 것', example: '검토 후 의견 드리겠습니다.' },
      { word: '공유', meaning: '알려서 함께 볼 수 있게 하는 것', example: '진행 내용을 공유드리겠습니다.' },
    ],
  },
  {
    id: 'transition',
    hunt: {
      label: '바뀌는 내용',
      type: '변경 안내',
      sub: '간판이나 공사 안내에서 변경, 이전, 임시 운영 문구를 발견해보세요.',
      words: ['임시 휴무', '위치 이전', '운영 시간 변경'],
      matchRule: '이전과 달라지거나 임시로 바뀐 내용과 시점을 알려주는 문장',
      exclude: '콘텐츠 제목, 영상 제목, 상품명, 사람 이름, 감상 문구, 일반 명사',
      questions: ['무엇이 바뀌나요', '언제부터인가요'],
    },
    sentenceMark: '사라지는 것은 아니다.',
    task: '방향 바꿔 설명하기',
    korean: '전환',
    hanja: '轉換',
    english: 'TRANSITION',
    sentence: '방향을 바꾼다고 해서 지금까지 걸어온 길이 사라지는 것은 아니다.',
    bridge: '방향이 바뀌었을 때 이유와 지금까지의 가치를 함께 전하는 표현을 연습해요.',
    mission: { before: '프로젝트 방향이 바뀌었어요.', highlight: '기존 작업도 의미가 있었다는 말', tail: '동료에게 전하는 문장으로 바꿔보세요.' },
    hints: [
      { word: '기조', meaning: '일을 추진할 때 바탕이 되는 기본 방향', example: '이번 프로젝트의 운영 기조를 재검토했습니다.' },
      { word: '축적', meaning: '경험이나 결과를 차곡차곡 쌓는 것', example: '그간 축적한 검토 결과는 계속 활용할 수 있습니다.' },
      { word: '경과', meaning: '일이 진행되어 온 과정', example: '지금까지의 경과를 공유드립니다.' },
    ],
  },
]

export function getTodaySet(date: Date = new Date()): MissionSet {
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000)
  return MISSION_SETS[dayOfYear % MISSION_SETS.length]
}

// 내가 쓴 문장에 실제로 들어간 힌트 단어만 수집한다 (열어만 본 카드는 수집하지 않음)
export function collectExpressions(text: string, hints: HintWord[]): string[] {
  const compact = text.replace(/\s+/g, '')
  return hints.filter((h) => compact.includes(h.word.replace(/\s+/g, ''))).map((h) => h.word)
}
