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
}

export const MISSION_SETS: MissionSet[] = [
  {
    id: 'confirm',
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
