import { NextResponse } from 'next/server'
import { findTerms, glossaryPrompt, sheetMeaning, type GlossaryHit } from '@/lib/glossary'
import { clientIp, rateLimit } from '@/lib/rate-limit'

const MAX_TEXT = 1000

export const maxDuration = 30

interface Term {
  term: string
  meaning: string
}

interface ReplyOption {
  id: string
  label: string
  available: boolean
  needsInput: boolean
  inputPrompt: string
  placeholder: string
  note: string
  text: string
  easy: string
  terms: Term[]
}

interface ToneCheckResult {
  // 쉽게 풀면 (기존 필드명 interpretation 유지: 저장 기록·캐시 호환)
  interpretation: string
  tags: string[]
  todos: string[]
  terms: Term[]
  messageType: string
  options: ReplyOption[]
  counterpart?: string
  hidden?: Hidden
}

interface Hidden {
  surface: string
  real: string
  cue: string
  alt: string
}

interface OptDef {
  id: string
  label: string
  guide: string
  input?: { prompt: string; placeholder: string }
}

// 메시지 유형별 대응 방향 (id·라벨은 서버가 정하고, 문장만 AI가 만든다)
const TYPES: Record<string, { desc: string; options: OptDef[] }> = {
  action_request: {
    desc: '업무 수행 요청',
    options: [
      { id: 'proceed', label: '진행 확인', guide: '받았다는 표시 → 처리 약속 한 가지 → 공유 시점 순서로 쓴다. 요청 내용은 "말씀하신 내용", "해당 건"처럼 받아서 쓰고 원문 문장을 되풀이하지 않는다.' },
      { id: 'clarify', label: '정보 확인', guide: '업무 진행에 꼭 필요한데 원문에 빠진 정보(담당자·형식·기준·공유 대상·마감 모호)가 있을 때만 한 가지를 질문한다. 없으면 available=false.' },
      { id: 'schedule', label: '일정 조율', guide: '원문에 마감이 있을 때만 available=true. 가능한 일정 자리는 [ ]로 비워 둔 초안을 쓴다.', input: { prompt: '언제까지 가능하신가요?', placeholder: '예: 내일 오전' } },
    ],
  },
  question: {
    desc: '정보나 판단을 묻는 질문',
    options: [
      { id: 'answer', label: '바로 답변', guide: '질문에 바로 답하는 답장. 업계 기준·규정·일반 실무 지식으로 답할 수 있으면 근거 한 가지와 함께 분명하게 답하고 다음 행동을 제안한다. 이 회사·이 건에서만 알 수 있는 사실(수치·일정·내부 결정)만 [ ]로 비워 둔다.', input: { prompt: '[ ] 부분에 들어갈 내용을 알려주세요', placeholder: '예: 들은 내용 없음' } },
      { id: 'check', label: '확인 후 회신', guide: '확인한 뒤 회신하겠다는 답장. 확인할 기준(무엇을 근거로 볼지)은 말하되 구체적 사실·수치를 지어내지 않는다.' },
      { id: 'criteria', label: '기준 되묻기', guide: '질문의 기준·범위가 모호할 때만 기준 한 가지를 되묻는다. 모호하지 않으면 available=false.' },
    ],
  },
  approval_request: {
    desc: '승인 또는 결정 요청',
    options: [
      { id: 'approve', label: '승인', guide: '승인한다는 답장. 조건·금액 등 없는 내용을 지어내지 않는다.' },
      { id: 'revise', label: '수정 요청', guide: '수정할 내용은 사용자만 알므로 그 자리만 [ ]로 비워 둔 초안을 쓴다.', input: { prompt: '어떤 수정이 필요한가요?', placeholder: '예: 예산 항목 보완' } },
      { id: 'hold', label: '판단 보류', guide: '검토 후 판단해 회신하겠다는 보류 답장.' },
    ],
  },
  status_check: {
    desc: '진행 상황 확인',
    options: [
      { id: 'share', label: '현재 상황 공유', guide: '현재 진행 상황은 사용자만 알므로 그 자리만 [ ]로 비워 둔 초안을 쓴다.', input: { prompt: '현재 진행 상황을 알려주세요', placeholder: '예: 초안 작성 완료' } },
      { id: 'eta', label: '완료 일정 안내', guide: '완료 시점은 사용자만 알므로 그 자리만 [ ]로 비워 둔 초안을 쓴다.', input: { prompt: '완료 가능한 시점은 언제인가요?', placeholder: '예: 내일 오전' } },
      { id: 'delay', label: '지연 사유 설명', guide: '지연 사유는 사용자만 알므로 그 자리만 [ ]로 비워 둔 초안을 쓴다.', input: { prompt: '지연 사유는 무엇인가요?', placeholder: '예: 자료 수급 지연' } },
    ],
  },
  feedback: {
    desc: '평가·수정 의견·불만 전달',
    options: [
      { id: 'accept', label: '수용 후 반영', guide: '피드백을 받아들여 반영하겠다는 답장. 없는 수정 내용을 지어내지 않는다.' },
      { id: 'criteria', label: '구체적인 기준 질문', guide: '수정 방향·기준이 불명확할 때만 한 가지를 질문한다. 명확하면 available=false.' },
      { id: 'explain', label: '다른 의견 설명', guide: '사용자의 의견은 사용자만 알므로 그 자리만 [ ]로 비워 둔 초안을 쓴다.', input: { prompt: '전하고 싶은 의견을 입력해 주세요', placeholder: '예: 일정상 일부만 반영 가능' } },
    ],
  },
  schedule_coordination: {
    desc: '일정 제안 또는 조율',
    options: [
      { id: 'accept', label: '일정 수락', guide: '제안된 일정을 수락하는 답장.' },
      { id: 'counter', label: '다른 일정 제안', guide: '가능한 일정은 사용자만 알므로 그 자리만 [ ]로 비워 둔 초안을 쓴다.', input: { prompt: '가능한 일정은 언제인가요?', placeholder: '예: 수요일 오후' } },
      { id: 'attend', label: '참석 여부 확인', guide: '참석자·장소·안건 등 원문에 불명확한 점이 있을 때만 한 가지를 확인한다. 없으면 available=false.' },
    ],
  },
  information_notice: {
    desc: '단순 정보 전달',
    options: [
      { id: 'ack', label: '확인', guide: '잘 받았다는 짧은 확인 답장.' },
      { id: 'followup', label: '후속 질문', guide: '원문에서 실제로 더 확인할 점이 있을 때만 한 가지를 질문한다. 없으면 available=false.' },
    ],
  },
  issue_report: {
    desc: '문제나 오류 제기',
    options: [
      { id: 'acknowledge', label: '상황 인정', guide: '문제 제기를 인정하고 살펴보겠다는 답장. 원인·잘못을 단정하지 않는다.' },
      { id: 'investigate', label: '원인 확인', guide: '원인 파악을 위해 확인하겠다는 답장 또는 원인 확인에 필요한 정보 한 가지를 묻는 질문.' },
      { id: 'resolve', label: '해결 방향 제안', guide: '해결 방향은 사용자만 알므로 그 자리만 [ ]로 비워 둔 초안을 쓴다.', input: { prompt: '해결 방향은 무엇인가요?', placeholder: '예: 오늘 중 재발행' } },
    ],
  },
}

const decodeRules = () => `당신은 회사 메시지를 해독하고 실무 답장을 작성한다. 사용자는 아래 메시지를 "받은 사람"이며 보낸 사람에게 회신한다.
낯선 회사어와 업계용어를 실제 행동으로 해독하고, 사용자가 실무 표현을 이해하면서 사용할 수 있도록 돕는다.

[업계 지식 활용 — 실무자 수준으로]
- 사용자는 실무 전문가 수준의 답을 원한다. 원문에 나온 업계(패션·소재·인증·광고·유통·재무 등)의 표준 용어, 규정, 관행을 정확히 적용해 해석하고 답한다.
- 약어·인증·서류명(예: SC, TC, GRS, MOQ, PO)은 업계 표준 정식 명칭과 실무상 의미로 풀고, terms에 반드시 넣는다.
- 질문이 업계 기준으로 판단 가능한 것이면(예: "이 서류만으로 인증 제품이라고 해도 되나?") 막연히 "확인하겠다"로 피하지 말고, 기준에 따른 답과 이유, 해야 할 조치를 제시한다.
- 답장은 그 업무를 실제로 하는 사람이 쓰는 실무 어휘로 쓴다. 원문 업무에 맞는 동사·명사를 고른다(예: 데이터 업데이트 → 재집계·단위 환산·정합성 검토·기준 데이터 / 인증 → 발급·범위 확인 / 일정 → 리드타임·선적 / 정산 → 증빙·대사). "진행 중입니다", "완료되었으며", "파악됩니다", "추가로 공유드리겠습니다" 같은 막연한 말만으로 채우지 않는다.
- 상황·진행·원인을 묻는 질문에는 "무엇을 기준으로 어떤 작업을 하고 있고, 무엇 때문에 차이가 나는지"가 드러나는 구조로 쓴다.
- [ ] 자리표시 이름도 "[현재 진행 상황]", "[원인]"처럼 막연하게 쓰지 말고, 이런 상황에서 실무에서 가장 흔한 후보를 담아 구체적으로 쓴다(예: "[구매팀 ERP 데이터]", "[단위 환산 오류]"). 사용자는 맞으면 그대로, 다르면 고쳐 쓴다.
- "지어내지 않는다"는 이 회사·이 거래의 구체적 사실(수량·날짜·내부 결정·상대 회사 상황)에만 해당한다. 일반적인 업계 지식은 자신 있게 쓴다. 확실하지 않은 업계 지식은 단정하지 않는다.

[돌려 말하기 읽기 — 한국 회사 메신저]
한국 직장인은 요청·지적·재촉·부탁·지시를 질문, 혼잣말, 걱정, 정보 공유처럼 돌려서 말한다. 겉말이 아니라 보낸 사람이 받는 사람에게 실제로 원하는 행동을 찾는다.
자주 쓰는 신호와 실제 뜻:
- "한번 봐주시면 좋을 것 같기도 하고요", "~하면 어떨까 하는 생각도 들고요" → 해 달라는 요청
- "위에서 질문이 나올 수도 있을 것 같네요", "숫자는 다 들어가 있는데" → 부족한 부분을 보완해서 다시 달라는 지적
- "그 뒤로 따로 들은 게 없어서요", "지난번에 한번 하셨던 거죠?" → 진행 상황을 공유하라는 재촉
- "저희 쪽이 좀 빠듯해서… 그쪽은 상황이 어떠신지 해서요" → 도와 달라는 부탁(인력·자원 지원)
- "다들 한번씩 보시는 거죠?", "저번에 ~한 적이 있어서 그냥 여쭤봐요" → 이번에는 꼭 하라는 지시
- 문제를 지적한 뒤 "시간 되실 때요", "급한 건 아니고요" → 실제로는 빨리 처리해야 함
- "저도 좀 애매하네요", "뭐라고 해야 할지 잘 모르겠네요" → 판단하거나 정리해 달라는 요청
- "~인 것 같긴 한데… 아니면 ~도 나쁘지 않을 것 같고요" → 뒤쪽(덜 확정적인 쪽)이 실제로 원하는 방향인 경우가 많음
hidden 필드:
- surface: 겉으로 하는 말 한 줄(예: "상대 팀 인력 상황을 묻는다")
- real: 실제로 원하는 것 한 줄, 받는 사람이 할 행동으로(예: "재고 실사 입회 인원을 지원해 달라는 부탁")
- cue: 속뜻을 드러내는 원문 표현을 원문 글자 그대로 짧게(10~40자)
- alt: 다르게 읽힐 여지가 있으면 다른 해석 한 줄, 확실하면 ""
- 메시지가 원하는 바를 직접 말하고 있으면(돌려 말하지 않음) surface·real·cue를 모두 ""로 둔다.
속뜻이 있으면 easy, todos, 모든 답장은 겉말이 아니라 real에 맞춘다. 답장은 상대가 실제로 원하는 것에 답한다(예: 인력 상황을 물었지만 지원을 부탁한 것이면 "지원 가능 여부·인원"으로 답한다).

[해독 처리 순서]
1. 먼저 문장을 문자 그대로 해석하고, 이어서 겉말과 속뜻을 나눈다(아래 [돌려 말하기 읽기]).
2. 발신자가 요청한 행동, 제출·공유해야 할 결과물, 마감 시점, 공유 대상, 판단 기준, 불명확한 정보를 파악한다.
3. 문장 속 회사어와 업계용어를 일상적인 한국어로 설명한다.
4. 사용자가 지금 해야 할 일을 업계 관행에 맞는 구체적 조치로 순서대로 제시한다(막연한 "검토", "확인"만 쓰지 않는다).

[공통 금지]
- 원문의 명사를 그대로 나열하며 요약하지 않는다.
- 원문 표현에 근거가 없는 감정(재촉, 불만, 압박)을 지어내지 않는다. 단, 아래 돌려 말하기 표현은 그 자체가 근거다.
- 기안과 기한, 결재와 결제처럼 형태가 비슷한 단어를 혼동하지 않는다.
- 사용자가 의미를 이해할 수 없는 전문용어를 설명 없이 추가하지 않는다.
- 메시지에 없는 업무·산출물·일정·수량·책임자·공유 대상을 만들어내지 않는다.
- 사용자가 약속하지 않은 행동을 새롭게 약속하지 않는다. 사용자에게 불리할 수 있는 확정적 표현을 임의로 만들지 않는다.

[해독 필드]
- easy: "쉽게 풀면". 원문을 반복하지 말고 일상적인 말로 완전히 번역한 1~2문장. "~라는 뜻입니다" 형태.
- tags: 짧은 키워드 3개(예: 요청, 마감, 기안). 감정 추측 키워드 금지.
- todos: "내가 해야 할 일". 업무를 순서·마감 기준으로 분리한 2~5개의 짧은 단계.
- terms: "문장 속 회사어". 원문에 실제로 나온 낯선 회사어·업계용어·약어·외래어·한자어(0~6개). 사회초년생이 뜻을 헷갈릴 만한 표현만 넣는다. 인증·거래처·지사·회의·일정·확인·문의처럼 누구나 아는 단어는 넣지 않는다. 해당하는 표현이 없으면 빈 배열. 붙어 있어도 단어 단위로 나눈다(예: '베리에이션 디벨롭' → '베리에이션', '디벨롭'). term은 원문에 나온 그대로의 글자여야 하며, meaning은 신입도 이해할 정확하고 쉬운 풀이 한 문장. 누구나 아는 단어는 넣지 않는다.

[1단계: 메시지 유형 분류 — message_type]
답장을 쓰기 전에 입력 메시지의 주된 목적을 먼저 분류한다. 문장 형태가 아니라 실제 의도를 기준으로 한다. 물음표가 없어도 답변을 요구하면 question 또는 status_check일 수 있다. 여러 의도가 섞이면 가장 중요한 하나로 분류한다.
가능한 유형:
${TYPE_TABLE}

[2단계: 대응 방향별 답장 — options]
선택한 유형의 대응 방향 각각에 대해 reply_options 항목을 만든다. 각 항목의 id는 위 표의 id를 그대로 쓴다.
공통: 실제 회사 메신저에서 자연스럽게 쓰는 말투. 1~2문장, 원문에 안부·인사가 있으면 짧은 인사 한 문장을 더해 최대 3문장. 과한 사과·감탄사·느낌표·이모지 금지.
[관계와 상황 맞추기 — 가장 중요]
- situation.relationship과 situation.register를 먼저 정하고, 모든 답장의 말투·거리감을 그에 맞춘다.
- 윗사람·클라이언트·처음 연락한 상대 → 정중한 합니다체. 가까운 동료·오랜만에 연락한 전 동료·후배 → 정중하지만 부드러운 해요체도 가능.
- 원문이 안부·인사로 시작하면 답장도 짧게 인사를 받아 준다(예: "오랜만이에요, 잘 지내고 있어요."). 업무 요청에 인사가 없으면 인사를 덧붙이지 않는다.
- 원문의 온도(격식/친근, 급함/여유)를 넘지 않게 맞춘다.
[모든 방향에 기본 답장을 쓴다]
- 사용자만 아는 사실(답의 내용, 가능한 일정, 진행 상황, 사유 등)이 필요한 자리는 지어내지 말고 짧은 자리표시 [ ]로 남긴다. 예: "[들은 내용]", "[가능한 일정]", "[현재 진행 상황]". 한 답장에 자리표시는 최대 2개.
- 자리표시를 빼고 읽어도 보낼 수 있는 자연스러운 문장 구조로 쓴다.
- [사용자 입력 필요] 방향은 input_hint에 이 메시지 상황에 맞는 입력 예시 하나를 짧게 쓴다(예: "들은 내용 없음", "다음 주 화요일").
[답장 문장 규칙 — 모든 입력에 적용]
1. 원문과 겹치는 단어는 꼭 필요한 핵심어 1~2개까지만 쓴다. 원문이 지시한 내용은 "말씀하신 내용", "해당 건", "요청하신 부분", "두 건 모두"처럼 받아서 쓴다. 원문을 어순만 바꿔 되풀이하면 실패다.
2. 원문이 묻는 말이 아니라 내가 처리해야 하는 요청이면 "받았다는 표시 → 처리 약속 한 가지 → 공유 시점" 순서로 쓴다.
3. 답장에 업계 표현을 쓸 때는 원문에 없던 표현을 고르고, 어색한 직역(예: 디벨롭 → 변형 작업)을 만들지 않는다.
핵심 원칙: 답을 모르는 질문에 그럴듯한 사실·수치·상품명·일정을 지어내지 않는다. 사용자만 아는 정보는 [ ] 자리표시로 남긴다. 원문에 근거가 없어 억지로 만들어야 하는 질문·방향은 available=false로 하고 note에 이유를 한 줄로 쓴다(예: "추가로 확인할 내용이 명확하게 보이지 않습니다.").
- text: 답장 본문(자리표시 [ ] 포함 가능). easy: 같은 내용을 전문용어 없이 쓴 "쉬운 답장" 한 문장. terms: text에 쓰인 낯선 표현의 풀이(0~3개, term은 text에 그대로 들어 있는 글자). text가 비어 있으면 easy와 terms도 비운다.

[예시 7 — 업계 지식으로 답할 수 있는 질문] 입력: "이번 시즌 리사이클 폴리 원단 GRS 인증서 전달받았는데, SC만 있고 TC가 없네요. 이 상태로 바이어 측에 인증 원단이라고 안내해도 될까요?"
easy: "업체가 GRS 인증을 받았다는 서류(SC)는 있지만 이번에 납품한 원단이 인증 제품이라는 거래 증명서(TC)가 없는데, 이대로 바이어에게 인증 원단이라고 말해도 되는지 묻는 말입니다."
todos: ["SC는 업체 인증 범위 확인용이라 원단 자체의 인증 근거로는 부족함을 공유","공급사에 해당 납품 건 TC 발급 가능 여부 요청","TC 받기 전까지 바이어에게 인증 원단으로 안내 보류"]
terms: GRS(Global Recycled Standard, 재활용 원료 함량과 생산 과정을 인증하는 국제 기준), SC(Scope Certificate, 인증받은 업체·사업장과 인증 범위를 확인하는 서류), TC(Transaction Certificate, 특정 거래로 납품된 제품이 인증 제품임을 증명하는 거래 인증서)
message_type: question
answer: "SC는 업체 인증 범위 확인용이라, 해당 원단을 인증 제품으로 안내하려면 TC 확인이 필요합니다. 공급사에 해당 납품 건 TC 발급 가능 여부 먼저 확인 부탁드립니다."
check: "TC 없이는 인증 원단으로 안내하기 어려워서, 공급사에 TC 발급 가능 여부와 리드타임 확인한 뒤 안내 방향 정리해 드리겠습니다."
criteria: "바이어 측에 인증 원단으로 안내하려는 시점이 언제인지, TC 발급 리드타임과 맞춰 볼 수 있게 알려주실 수 있을까요?"

[예시 8 — 진행 상황·원인을 묻는 질문] 입력: "이번 분기 Scope 3 데이터 업데이트 어디까지 됐나요? 원부자재 구매량이 지난번 자료랑 차이가 좀 있던데요."
easy: "이번 분기 공급망 간접 배출량(Scope 3) 데이터를 어디까지 갱신했는지, 그리고 원부자재 구매량이 지난 자료와 왜 다른지 묻는 말입니다."
todos: ["구매량 원천 데이터(구매 시스템 등) 기준 재집계 현황 정리","지난 자료와 차이 나는 품목의 단위·기준(중량/수량) 확인","차이 원인과 반영 시점 공유"]
terms: Scope 3(원부자재 구매·운송 등 회사 밖 공급망에서 간접적으로 발생하는 온실가스 배출 범주), 원부자재(제품 생산에 쓰는 원자재와 부자재)
message_type: question
answer: "[구매팀 ERP 데이터] 기준으로 재집계 중입니다. 일부 품목이 [중량이 아닌 수량 기준]으로 입력돼 있어 단위 환산 후 다시 확인하고 있습니다.", input_hint "구매팀 ERP / 수량 기준 입력"
check: "구매량 원천 데이터와 지난 자료의 집계 기준을 대조해 차이 원인 확인한 뒤, 재집계 결과와 함께 공유드리겠습니다."
criteria: "차이가 크게 보인 품목이 있으면 알려주실 수 있을까요? 해당 품목부터 단위와 집계 기준 대조해 보겠습니다."

[예시 9 — 돌려 말하는 부탁] 입력: "감사 일정 나왔다고 들었는데, 재고 실사 때 저희 쪽 인원이 좀 빠듯할 수도 있어서… 그쪽 팀은 상황이 어떠신지 해서요."
hidden: surface "상대 팀 인력 상황을 묻는다", real "재고 실사 입회 인원을 지원해 달라는 부탁", cue "저희 쪽 인원이 좀 빠듯할 수도 있어서", alt "단순히 일정 공유 차원에서 상황을 묻는 것일 수도 있음"
easy: "재고 실사 때 자기 팀 인원이 부족할 것 같으니, 우리 팀에서 사람을 지원해 줄 수 있는지 묻는 말입니다."
todos: ["실사 날짜에 지원 가능한 인원 확인","지원 가능 인원과 시간대 회신","실사 일정 확정되면 담당자 연결"]
message_type: question
answer: "실사 때 인원 필요하시면 저희 쪽에서 [1~2명] 지원 가능합니다. 일정 확정되면 말씀 주세요.", input_hint "2명, 오전만"
check: "실사 날짜 기준으로 저희 팀 지원 가능한 인원 확인해서 바로 말씀드릴게요."
criteria: "실사 때 몇 분 정도, 어느 시간대에 지원이 필요하신지 알려주시면 맞춰서 확인해 보겠습니다."

[예시 10 — 돌려 말하는 지적] 입력: "예실 자료 잘 받았습니다~ 숫자는 다 들어가 있는데 위에서 보시면 아마 판관비 쪽에서 질문이 좀 나올 수도 있을 것 같네요."
hidden: surface "자료를 잘 받았다고 인사한다", real "판관비 차이 원인 설명을 보완해서 다시 달라는 지적", cue "판관비 쪽에서 질문이 좀 나올 수도", alt ""
answer: "판관비 쪽 차이 원인 계정별로 코멘트 보완해서 다시 공유드리겠습니다."

[예시 6 — 관계·안부가 있는 질문] 입력: "안녕하세요, 부장님! 오랜만에 연락드려요~ 퇴사 후에도 거래처에서 인증 문의가 종종 와서요. 렌징코리아 지사가 문을 닫았다고 들었는데 혹시 들으신 내용 있으실까요? 앞으로 홍콩 지사로 안내드리면 될까요?"
situation.relationship: "퇴사한 전 직장 후배 → 전 상사(부장)", register: "부드러운 해요체"
terms: [] (누구나 아는 단어뿐)
message_type: question
answer: "오랜만이에요, 잘 지내죠? 지사 건은 [들은 내용]이고, 인증 문의는 [안내할 곳]으로 안내해 주시면 될 것 같아요.", input_hint "들은 내용 없음 / 홍콩 지사"
check: "오랜만이에요, 연락 줘서 반가워요. 지사 건은 저도 정확히 확인해 보고 어디로 안내하면 될지 알려줄게요."
criteria: available=false, note "질문이 명확해 되물을 기준이 보이지 않습니다."

[0단계: 상황 파악 — situation] 다른 필드를 쓰기 전에 먼저 채운다. 아래 모든 필드는 이 분석에서 나와야 한다.
- sender: 보낸 사람이 누구로 보이는지(모르면 "불명")
- relationship: 보낸 사람과 받는 사람(사용자)의 관계 추정(예: "퇴사한 전 직장 후배 → 전 상사", "클라이언트 → 담당자"). 호칭·존댓말·인사·내용에서 근거를 찾는다
- register: 답장에 맞는 말투("격식 합니다체" 또는 "부드러운 해요체")
- intent: 보낸 사람이 실제로 원하는 것 한 줄
- action: 받은 사람(사용자)이 해야 할 행동. 없으면 ""
- deliverable: 넘겨야 할 결과물. 없으면 ""
- deadline: 원문에 나온 기한 표현 그대로(예: "EOD", "금일 중", "목요일 3시"). 없으면 ""
- unclear: 원문만으로는 알 수 없는 것(기준·담당·형식 등) 0~3개
- user_only: 답장에 필요하지만 사용자만 아는 정보 0~3개
짧은 말·구어체·오타·여러 요청이 섞인 메시지도 같은 방식으로 분석한다. 원문에 없는 내용을 채우지 않는다.

[출력 JSON]
{"situation": {"sender": string, "relationship": string, "register": string, "intent": string, "action": string, "deliverable": string, "deadline": string, "unclear": [string], "user_only": [string]},
 "hidden": {"surface": string, "real": string, "cue": string, "alt": string},
 "easy": string, "tags": [string,string,string], "todos": [string], "terms": [{"term": string, "meaning": string}],
 "message_type": string,
 "reply_options": [{"id": string, "available": boolean, "note": string, "text": string, "input_hint": string, "easy": string, "terms": [{"term": string, "meaning": string}]}]}

[예시 1] 입력: "킥오프 미팅에서 정리된 액션 아이템별 오너와 듀데이트를 지정해 금일 중 공유 부탁드립니다."
easy: "회의에서 정한 할 일마다 담당자와 마감일을 정해서, 오늘 안에 알려달라는 뜻입니다."
todos: ["회의에서 정리된 할 일 목록 확인","항목별 담당자와 마감일 지정","오늘 안에 공유"]
terms: 킥오프 미팅(프로젝트를 시작할 때 목표와 역할을 맞추는 첫 회의), 액션 아이템(회의 후 실행해야 할 개별 할 일), 오너(해당 업무의 담당자), 듀데이트(마감일), 금일(오늘)
message_type: action_request
proceed: "네, 확인했습니다. 항목별 담당자랑 일정 정리해서 오늘 중으로 전달드리겠습니다." / easy: "네, 확인했어요. 일마다 담당자와 마감일을 정해서 오늘 안에 보내드릴게요."
clarify: available=true, "오너가 확정되지 않은 항목은 미정으로 표기해 공유드려도 될까요?"
schedule: available=true(금일 중이라는 마감이 있음), "금일 중 공유는 어려울 것 같아, [가능한 일정]까지 전달드려도 괜찮을까요?", input_hint "내일 오전"

[예시 2] 입력: "현재 재고 커버리지 기준으로 추가 리오더가 필요한 SKU가 있을까요?"
easy: "지금 남은 재고로 판매를 얼마나 이어갈 수 있는지 계산했을 때, 추가 주문이 필요한 상품이 있는지 묻는 말입니다."
terms: 재고 커버리지(현재 재고로 예상 판매량을 몇 주 또는 몇 달 동안 감당할 수 있는지 나타내는 수치), 리오더(이미 주문했던 상품을 추가로 주문하는 것), SKU(색상·사이즈 등 옵션별로 구분한 개별 상품 단위)
message_type: question
answer: available=true, "확인해 보니 [리오더가 필요한 SKU]는 추가 주문이 필요한 상황입니다.", input_hint "A, B 상품"
check: "현재고와 최근 판매 추이를 기준으로 SKU별 재고 커버리지를 확인한 후 리오더 필요 여부를 공유드리겠습니다."
criteria: available=true, "재고 커버리지는 기존과 동일하게 4주 기준으로 검토하면 될까요?"

[예시 3] 입력: "소재별 CTR과 CVR 비교 후 저성과 소재는 오프하고, 효율이 확인된 어셋 중심으로 예산 리밸런싱 부탁드립니다."
terms: CTR(광고가 노출된 횟수 대비 클릭된 비율), CVR(클릭한 사람 중 구매·가입 등으로 이어진 비율), 소재(광고에 쓰는 이미지·영상·문구), 오프(광고 노출을 끄는 것), 어셋(광고에 쓰는 소재 자원), 리밸런싱(성과에 맞춰 예산 배분을 다시 조정하는 것)
message_type: action_request
proceed: "네, 확인했습니다. 성과 낮은 소재는 정리하고 효율 좋은 쪽으로 예산 다시 배분해서 반영해 두겠습니다."
clarify: available=true, "저성과 소재를 판단하는 CTR과 CVR 기준값이 별도로 있을까요?"
schedule: available=false, note "원문에 마감이 없어 일정 조율이 필요해 보이지 않습니다."

[예시 5] 입력: "클라이언트 피드백 반영해서 베리에이션 디벨롭 후 EOD까지 컨펌 요청 부탁드립니다."
terms: 클라이언트(일을 맡긴 고객사), 베리에이션(하나의 안을 바탕으로 만든 여러 버전), 디벨롭(시안을 더 다듬어 발전시키는 것), EOD(오늘 업무가 끝나는 시점), 컨펌(검토 후 확정·승인하는 것)
proceed: "네, 확인했습니다. 말씀하신 내용 반영해서 시안 몇 가지로 정리한 뒤 오늘 퇴근 전까지 확인 요청드리겠습니다."

[예시 4] 입력: "선집행 건은 증빙 취합 후 소급 품의 부탁드리며, 세금계산서는 금월 마감 전에 발행 요청해 주세요."
terms: 선집행(승인을 받기 전에 먼저 비용을 쓰거나 일을 진행한 것), 증빙(지출이나 거래가 사실임을 보여주는 영수증·계약서 같은 자료), 취합(흩어진 자료를 한데 모으는 것), 소급 품의(이미 진행한 일에 대해 나중에 올리는 승인 요청 문서), 금월(이번 달)`

const INPUT_RULES = `당신은 회사 메시지에 대한 답장을 작성한다.
사용자가 제공한 "사용자 입력 정보"만 근거로, 지정된 대응 방향의 합니다체 답장을 쓴다.
[기존 초안이 있으면] 초안의 말투·인사·문장 구조를 그대로 두고 [ ] 자리표시만 사용자 입력으로 자연스럽게 채운다. 입력이 다루지 않은 [ ]는 그 부분을 자연스럽게 덜어 낸다. 결과에 [ ]를 남기지 않는다.
[구성] 초안이 없으면 반드시 두 부분으로 쓴다: ① 받았다는 표시("확인했습니다", "말씀하신 내용 확인했습니다" 등) ② 사용자 입력을 반영한 핵심 문장. 일정 조율이면 ② 안에 "원래 마감은 어렵다 + 입력한 시점 제안 + 괜찮은지 묻기"를 담는다. 한 문장짜리 짧은 질문(예: "내일 공유할 수 있을까요?")은 실패다. 30~130자.
[금지] 사용자가 제공하지 않은 사실·시간·날짜·수량·상품명·사유를 만들지 않는다. 원문에 없던 업무나 약속을 추가하지 않는다. 원문과 겹치는 단어는 핵심어 1~2개까지만 쓰고, 원문이 지시한 내용은 "말씀하신 내용", "해당 건"처럼 받아서 쓴다. 과한 사과·감탄사·느낌표·이모지 금지.
[예시]
- 원문 마감 "EOD", 방향 "일정 조율", 입력 "내일" → "말씀하신 내용 확인했습니다. 오늘 중 마무리는 어려울 것 같아, 내일까지 정리해서 공유드려도 괜찮을까요?"
- 원문 마감 "금일 중", 방향 "일정 조율", 입력 "내일 오전" → "요청 주신 내용 확인했습니다. 금일 중 완료는 어려워 내일 오전까지 전달드려도 괜찮을까요?"
- 방향 "바로 답변", 입력 "A, B 상품 리오더 필요" → "확인해 보니 A, B 상품은 리오더가 필요한 상황입니다. 수량 정리해서 다시 말씀드리겠습니다."
- 방향 "현재 상황 공유", 입력 "초안 작성 완료" → "현재 초안 작성까지 마친 상태입니다. 검토 거쳐서 정리되는 대로 바로 공유드리겠습니다."
- 방향 "수정 요청", 입력 "예산 항목 보완" → "검토했습니다. 예산 항목만 조금 보완해 주시면 바로 진행하겠습니다."
출력 JSON: {"text": string, "easy": string, "terms": [{"term": string, "meaning": string}]}
easy는 같은 내용을 일상어로 쓴 한 문장, terms는 text에 쓰인 낯선 업무 표현의 풀이(0~2개, text에 그대로 들어 있는 글자).`

const TYPE_TABLE = Object.entries(TYPES)
  .map(([k, v]) => `- ${k} (${v.desc}): ` + v.options.map((o) => `${o.id}=${o.label}${o.input ? '[사용자 입력 필요]' : ''} → ${o.guide}`).join(' | '))
  .join('\n')

function cleanTerms(raw: unknown, within: string[]): Term[] {
  if (!Array.isArray(raw)) return []
  const out: Term[] = []
  for (const t of raw) {
    const term = typeof t?.term === 'string' ? t.term.trim() : ''
    const meaning = typeof t?.meaning === 'string' ? t.meaning.trim() : ''
    if (!term || !meaning) continue
    // 본문에 실제로 있는 표현만 (밑줄 표시가 가능해야 함)
    if (!within.some((w) => w.includes(term))) continue
    if (out.some((o) => o.term === term)) continue
    out.push({ term, meaning })
    if (out.length >= 6) break
  }
  return out
}

// 풀이는 용어 사전(시트) 뜻을 우선한다
function withSheet(terms: Term[], hits: GlossaryHit[]): Term[] {
  if (!hits.length) return terms
  return terms.map((t) => {
    const m = sheetMeaning(t.term, hits)
    return m ? { ...t, meaning: m } : t
  })
}

function strs(raw: unknown, max: number): string[] {
  return Array.isArray(raw)
    ? raw.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim()).slice(0, max)
    : []
}

async function callOpenAI(system: string, user: string): Promise<any | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey || apiKey.startsWith('placeholder')) {
    console.error('[tone-check] OPENAI_API_KEY is missing or placeholder')
    return null
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.TONE_MODEL || 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
    }),
  })
  if (!res.ok) {
    console.error('[tone-check] OpenAI HTTP', res.status, (await res.text()).slice(0, 300))
    return null
  }
  const data = await res.json()
  const raw: string = data?.choices?.[0]?.message?.content ?? ''
  return JSON.parse(raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''))
}

// 원문에서 그대로 가져온 단어 (조사·어미를 떼고 비교). 답장이 원문을 되풀이하는지 판단한다
const STOP = new Set(['부탁드립니다', '부탁', '드립니다', '주세요', '요청', '확인', '진행', '공유', '오늘', '금일', '해당'])
function stemsOf(s: string): string[] {
  const out = new Set<string>()
  for (const tok of s.match(/[가-힣A-Za-z0-9]+/g) ?? []) {
    let w = tok.replace(/(으로|에서|까지|부터|에게|해서|하여|하고|이랑|랑|을|를|이|가|은|는|에|의|와|과|도|만|로|후)$/, '')
    w = w.replace(/(합니다|했습니다|하겠습니다|해주세요|드립니다|했|하|해)$/, '')
    if (w.length >= 2 && !STOP.has(w)) out.add(w.toLowerCase())
  }
  return Array.from(out)
}
function repeated(original: string, reply: string): string[] {
  const r = reply.toLowerCase()
  // 영문 약어·코드(SC, TC, GRS 등)는 답에 꼭 필요한 핵심어라 되풀이로 세지 않는다
  return stemsOf(original).filter((w) => !/^[a-z0-9]+$/.test(w) && r.includes(w))
}

const REWRITE_RULES = `당신은 회사 메신저 답장을 다듬는다. 각 답장 초안의 "고칠 점"만 고친다.
규칙: 원문과 겹치는 단어는 꼭 필요한 핵심어 1~2개만 남긴다. 원문이 지시한 내용은 "말씀하신 내용", "해당 건", "요청하신 부분"처럼 받아서 쓴다. 내가 처리할 요청이면 "받았다는 표시 → 처리 약속 한 가지 → 공유 시점" 순서. 뜻·약속·일정·말투(합니다체/해요체)·인사는 바꾸지 않고, 없는 사실을 더하지 않는다. [ ] 자리표시는 그대로 둔다. 1~3문장. 어색한 직역 금지.
출력 JSON: {"options": [{"id": string, "text": string, "easy": string}]}`

// 답장 자동 검사 (모델과 무관하게 코드로 판단)
const TIME_GROUPS: string[][] = [
  ['오늘', '금일', 'eod', '퇴근', '당일'],
  ['내일', '익일', '명일'],
  ['모레'],
  ['이번 주', '금주'],
  ['다음 주', '차주', '다음주'],
  ['월요일'], ['화요일'], ['수요일'], ['목요일'], ['금요일'], ['주말'],
  ['오전'], ['오후'], ['이번 달', '금월'], ['다음 달', '익월'],
]
const TIME_WORDS = /(오늘|금일|eod|퇴근|당일|내일|익일|모레|이번 ?주|금주|다음 ?주|차주|요일|주말|오전|오후|금월|익월|까지|중으로|시까지|\d+ ?시|\d+ ?일)/i
function checkReply(original: string, reply: string, opt: { needsTime?: boolean; info?: string } = {}): string[] {
  const issues: string[] = []
  const src = (original + ' ' + (opt.info ?? '')).toLowerCase()
  const r = reply.toLowerCase()
  const rep = repeated(original, reply)
  if (rep.length > 3) issues.push(`원문 단어 되풀이(${rep.join(', ')}) → 핵심어 1~2개만 남기고 "말씀하신 내용"처럼 받아 쓰기`)
  for (const g of TIME_GROUPS) {
    if (g.some((w) => r.includes(w)) && !g.some((w) => src.includes(w))) {
      issues.push(`원문에 없는 시점(${g.find((w) => r.includes(w))})을 만들어 냄 → 빼거나 원문 기한으로 바꾸기`)
      break
    }
  }
  const nums = (reply.match(/\d+/g) ?? []).filter((n) => !src.includes(n))
  if (nums.length) issues.push(`원문에 없는 숫자(${nums.join(', ')}) → 빼기`)
  if (opt.needsTime && !TIME_WORDS.test(reply)) issues.push('원문 기한이 있는데 공유 시점이 빠짐 → 원문 기한에 맞춰 넣기')
  if (reply.length < 15) issues.push('너무 짧음 → 받았다는 표시와 핵심 문장 두 부분으로')
  if (reply.length > 170) issues.push('너무 김 → 인사 포함 3문장 이내로')
  if ((reply.match(/[.?]\s/g) ?? []).length >= 3) issues.push('문장이 4개 이상 → 인사 포함 3문장 이내로')
  if (/[!！]|[\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/.test(reply)) issues.push('느낌표·이모지 → 빼기')
  return issues
}

function pickText(parsed: any): string {
  if (!parsed || typeof parsed !== 'object') return ''
  for (const k of ['text', 'reply', 'answer', 'message', '답장']) if (typeof parsed[k] === 'string' && parsed[k].trim()) return parsed[k].trim()
  const first = Object.values(parsed).find((v) => typeof v === 'string' && (v as string).trim().length > 5)
  return typeof first === 'string' ? first.trim() : ''
}

const FAIL = { error: '해석을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' }

export async function POST(req: Request) {
  try {
    if (!rateLimit('tone:' + clientIp(req), 10)) {
      return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' }, { status: 429 })
    }
    const body = await req.json()
    const { text, counterpart } = body
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: '메시지를 입력해 주세요.' }, { status: 400 })
    }
    if (text.length > MAX_TEXT) {
      return NextResponse.json({ error: `메시지는 ${MAX_TEXT}자 이내로 입력해 주세요.` }, { status: 400 })
    }

    // 사용자가 입력한 정보로 만드는 답장(일정·답변 내용·사유 등): 입력한 정보만 근거로 생성
    if (body.mode === 'option') {
      const type = TYPES[String(body.messageType)]
      const def = type?.options.find((o) => o.id === body.optionId)
      const info = typeof body.info === 'string' ? body.info.trim() : ''
      if (!def || !def.input) return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 })
      if (!info || info.length > 80) {
        return NextResponse.json({ error: '내용을 80자 이내로 입력해 주세요.' }, { status: 400 })
      }
      const draft = typeof body.draft === 'string' ? body.draft.trim().slice(0, 300) : ''
      const optHits = findTerms(text)
      const prompt = `받은 메시지: ${text}\n대응 방향: ${def.label} (${def.guide})\n사용자 입력 정보: ${info}` + (draft ? `\n기존 초안(말투·인사·구조 유지, [ ] 자리만 입력 정보로 채우기): ${draft}` : '')
      let parsed: any = null
      let reply = ''
      // 형식이 어긋나거나 일시 오류면 한 번 더 시도
      for (let attempt = 0; attempt < 2 && reply.length < 20; attempt++) {
        try {
          parsed = await callOpenAI(INPUT_RULES + glossaryPrompt(optHits), prompt)
        } catch (e) {
          console.error('[tone-check] option parse failed', e)
          parsed = null
        }
        const got = pickText(parsed)
        // 너무 짧은 답장은 한 번 더 받고, 더 긴 쪽을 쓴다
        if (got.length > reply.length) reply = got
      }
      if (!reply) {
        console.error('[tone-check] option empty', JSON.stringify(parsed).slice(0, 300))
        return NextResponse.json({ error: '답장을 만들지 못했어요. 다시 한 번 눌러 주세요.' }, { status: 502 })
      }
      // 입력형 답장도 같은 기준으로 검사하고, 문제가 있으면 한 번 고쳐 쓴다
      const issues = checkReply(text, reply, { info })
      if (issues.length > 0) {
        try {
          const fixed = await callOpenAI(
            REWRITE_RULES,
            `받은 메시지: ${text}\n사용자 입력 정보: ${info}\n- id=${def.id} (${def.label}) 초안: ${reply}\n  고칠 점: ${issues.join(' / ')}`,
          )
          const t = Array.isArray(fixed?.options) && typeof fixed.options[0]?.text === 'string' ? fixed.options[0].text.trim() : ''
          if (t && checkReply(text, t, { info }).length < issues.length) {
            reply = t
            if (typeof fixed.options[0]?.easy === 'string' && fixed.options[0].easy.trim()) parsed = { ...parsed, easy: fixed.options[0].easy }
          }
        } catch (e) {
          console.error('[tone-check] option rewrite failed', e)
        }
      }
      return NextResponse.json({
        text: reply,
        easy: String(parsed?.easy ?? ''),
        terms: withSheet(cleanTerms(parsed?.terms, [reply]), [...optHits, ...findTerms(reply)]),
      })
    }

    const counterpartLabel: string | undefined =
      typeof counterpart === 'string' && ['동료', '상사', '클라이언트'].includes(counterpart) ? counterpart : undefined
    const contextLine = counterpartLabel
      ? `\n참고: 이 메시지는 "${counterpartLabel}"가 보낸 메시지입니다. 관계를 고려해 답장 톤을 보정하세요.`
      : ''
    const hits = findTerms(text)
    const parsed = await callOpenAI(decodeRules() + contextLine + glossaryPrompt(hits), text)
    if (!parsed) return NextResponse.json(FAIL, { status: 502 })
    const messageType: string = typeof parsed.message_type === 'string' && TYPES[parsed.message_type] ? parsed.message_type : 'action_request'
    if (typeof parsed?.easy !== 'string' || !Array.isArray(parsed?.reply_options)) {
      console.error('[tone-check] OpenAI response shape invalid', JSON.stringify(parsed).slice(0, 300))
      return NextResponse.json(FAIL, { status: 502 })
    }
    const options: ReplyOption[] = TYPES[messageType].options.map((def) => {
      const o = parsed.reply_options.find((x: any) => x?.id === def.id) ?? {}
      const needsInput = !!def.input
      const textRaw = typeof o.text === 'string' ? o.text.trim() : ''
      // 모든 방향은 기본 답장(사용자만 아는 부분은 [ ] 자리표시)을 가진다. 입력형은 초안이 비어도 입력으로 만들 수 있어 사용 가능
      const available = needsInput ? o.available !== false || textRaw.length > 0 : o.available !== false && textRaw.length > 0
      const text = available ? textRaw : ''
      const hint = typeof o.input_hint === 'string' ? o.input_hint.trim().slice(0, 40) : ''
      return {
        id: def.id,
        label: def.label,
        available,
        needsInput,
        inputPrompt: def.input?.prompt ?? '',
        placeholder: def.input ? (hint ? `예: ${hint}` : def.input.placeholder) : '',
        note: available ? '' : String(o.note || '추가로 확인할 내용이 명확하게 보이지 않습니다.'),
        text,
        easy: text ? String(o.easy ?? '') : '',
        terms: text ? withSheet(cleanTerms(o.terms, [text]), [...hits, ...findTerms(text)]) : [],
      }
    })
    if (!options.some((o) => o.available)) {
      return NextResponse.json(FAIL, { status: 502 })
    }
    // 자동 검사: 모든 입력에 같은 기준을 적용해 문제 있는 답장만 한 번 고쳐 쓴다
    const situation = parsed.situation && typeof parsed.situation === 'object' ? parsed.situation : {}
    const deadline = typeof situation.deadline === 'string' ? situation.deadline.trim() : ''
    const flagged = options
      .filter((o) => o.text)
      .map((o) => ({ o, issues: checkReply(text, o.text, { needsTime: o.id === 'proceed' && !!deadline }) }))
      .filter((x) => x.issues.length > 0)
    if (flagged.length > 0) {
      try {
        const fixed = await callOpenAI(
          REWRITE_RULES,
          `받은 메시지: ${text}\n원문 기한: ${deadline || '없음'}\n` +
            flagged.map(({ o, issues }) => `- id=${o.id} (${o.label}) 초안: ${o.text}\n  고칠 점: ${issues.join(' / ')}`).join('\n'),
        )
        for (const f of Array.isArray(fixed?.options) ? fixed.options : []) {
          const hit = flagged.find((x) => x.o.id === f?.id)
          const t = typeof f?.text === 'string' ? f.text.trim() : ''
          if (!hit || !t) continue
          const after = checkReply(text, t, { needsTime: hit.o.id === 'proceed' && !!deadline })
          if (after.length < hit.issues.length) {
            hit.o.text = t
            if (typeof f.easy === 'string' && f.easy.trim()) hit.o.easy = f.easy.trim()
            hit.o.terms = withSheet(cleanTerms(hit.o.terms, [t]), [...hits, ...findTerms(t)])
          }
        }
      } catch (e) {
        console.error('[tone-check] rewrite failed', e)
      }
    }
    const checks = Object.fromEntries(options.filter((o) => o.text).map((o) => [o.id, checkReply(text, o.text, { needsTime: o.id === 'proceed' && !!deadline })]))
    const h = parsed.hidden && typeof parsed.hidden === 'object' ? parsed.hidden : {}
    const hs = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')
    const hidden: Hidden | undefined = hs(h.real, 120)
      ? { surface: hs(h.surface, 120), real: hs(h.real, 120), cue: text.includes(hs(h.cue, 80)) ? hs(h.cue, 80) : '', alt: hs(h.alt, 120) }
      : undefined
    const result: ToneCheckResult = {
      interpretation: parsed.easy,
      tags: strs(parsed.tags, 3),
      todos: strs(parsed.todos, 5),
      terms: withSheet(cleanTerms(parsed.terms, [text]), hits),
      messageType,
      options,
      counterpart: counterpartLabel,
      hidden,
    }
    // situation·checks는 화면에 쓰지 않고 품질 점검(자동 테스트)용으로만 내려준다
    return NextResponse.json({ ...result, situation, checks })
  } catch (err) {
    console.error('[tone-check] failed', err)
    return NextResponse.json({ error: '분석에 실패했습니다. 다시 시도해 주세요.' }, { status: 500 })
  }
}
