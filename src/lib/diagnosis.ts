export interface DiagnosisQuestion {
  id: number
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export const diagnosisQuestions: DiagnosisQuestion[] = [
  {
    id: 1,
    question: '공지사항에 "금일(今日) 오후 2시에 회의가 있습니다"라고 적혀 있습니다. "금일"의 올바른 의미는?',
    options: ['황금의 날', '오늘', '지난 금요일', '특별한 날'],
    correctIndex: 1,
    explanation: '"금일(今日)"은 한자어로 "오늘"을 뜻합니다. "今(이제 금) + 日(날 일)"로, 현재의 날, 즉 오늘을 의미합니다.',
  },
  {
    id: 2,
    question: '동료가 "출장이 사흘 걸린다고 했어요"라고 말했습니다. 출장 기간은 며칠인가요?',
    options: ['1일', '2일', '3일', '4일'],
    correctIndex: 2,
    explanation: '"사흘"은 순우리말로 3일을 뜻합니다. "하루(1일), 이틀(2일), 사흘(3일), 나흘(4일)"로 이어지는 우리말 날짜 표현입니다.',
  },
  {
    id: 3,
    question: '민원 답변서에 "심심한 사과의 말씀을 드립니다"라고 적혀 있습니다. 이 문장의 올바른 해석은?',
    options: [
      '지루해서 사과한다는 뜻이다',
      '간단하게 사과한다는 뜻이다',
      '마음속 깊이 진심으로 사과한다는 뜻이다',
      '억지로 사과한다는 뜻이다',
    ],
    correctIndex: 2,
    explanation: '"심심(甚深)하다"는 "매우 깊다"는 뜻의 한자어입니다. "심심한 사과"는 "지루한 사과"가 아니라 "깊고 진심 어린 사과"를 의미합니다.',
  },
  {
    id: 4,
    question: '채용 공고에 "중식 제공"이라고 적혀 있습니다. 이것은 무엇을 의미하나요?',
    options: ['중국 음식 제공', '점심 식사 제공', '중간 간식 제공', '저녁 식사 제공'],
    correctIndex: 1,
    explanation: '"중식(中食)"은 "낮 중(中) + 밥 식(食)"으로 점심 식사를 뜻합니다. 중국 음식은 "중국식(中國食)" 또는 "중화요리"라고 표현합니다.',
  },
  {
    id: 5,
    question: '뉴스에서 "고가 도로 공사로 인해 교통이 통제됩니다"라는 안내를 들었습니다. "고가 도로"란?',
    options: ['비싼 도로', '땅 위에 높게 만든 도로', '고속 전용 도로', '오래된 도로'],
    correctIndex: 1,
    explanation: '"고가(高架)"는 "높을 고(高) + 시렁 가(架)"로, 높은 곳에 가설된 구조물을 뜻합니다. 고가 도로는 지면보다 높게 만든 도로(육교형 도로)를 말합니다.',
  },
  {
    id: 6,
    question: '기획서에 "이번 프로젝트의 시발점은 고객 불만 접수였다"라고 쓰여 있습니다. "시발점"의 의미는?',
    options: ['끝나는 지점', '가장 중요한 지점', '시작되는 지점', '문제가 되는 지점'],
    correctIndex: 2,
    explanation: '"시발점(始發點)"은 "시작 시(始) + 출발할 발(發) + 점 점(點)"으로, 어떤 일이 처음 시작되는 지점을 의미하는 표준 한자어입니다.',
  },
  {
    id: 7,
    question: '공문서에 "귀하의 협조에 감사드립니다"라고 적혀 있습니다. "귀하"는 누구를 가리키나요?',
    options: ['회사 대표', '문서를 받는 상대방(당신)', '정부 기관', '담당 직원'],
    correctIndex: 1,
    explanation: '"귀하(貴下)"는 "귀할 귀(貴) + 아래 하(下)"로, 공문서나 격식 있는 글에서 상대방을 높여 부르는 2인칭 표현입니다. "당신" 또는 "선생님"에 해당합니다.',
  },
]

export interface DiagnosisLevel {
  level: number
  label: string
  description: string
}

export const levels: DiagnosisLevel[] = [
  { level: 1, label: 'Lv.1', description: '문해력 기초 단계 — 기본 어휘부터 시작해요' },
  { level: 2, label: 'Lv.2', description: '일상 문해력 — 생활 속 표현은 이해해요' },
  { level: 3, label: 'Lv.3', description: '사회 문해력 — 뉴스와 공문서를 읽기 시작해요' },
  { level: 4, label: 'Lv.4', description: '비즈니스 문해력 — 업무 소통에 자신감이 생겨요' },
  { level: 5, label: 'Lv.5', description: '전문가 문해력 — 고급 한자어도 척척 이해해요' },
]

export function calculateLevel(correctCount: number): DiagnosisLevel {
  if (correctCount <= 2) return levels[0]
  if (correctCount === 3) return levels[1]
  if (correctCount === 4) return levels[2]
  if (correctCount === 5) return levels[3]
  return levels[4]
}
