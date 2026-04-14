# Deep Interview Spec: 문해력 교정 플랫폼

## Metadata
- Interview ID: munhaeryeok-platform-2026-04-06
- Rounds: 8
- Final Ambiguity Score: 14.4%
- Type: greenfield
- Generated: 2026-04-06
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.85 | 40% | 0.34 |
| Constraint Clarity | 0.90 | 30% | 0.27 |
| Success Criteria | 0.82 | 30% | 0.25 |
| **Total Clarity** | | | **0.856** |
| **Ambiguity** | | | **14.4%** |

## Goal
사회초년생(2-30대)이 문해력 진단 → 레벨별 독해 훈련 → 필사 미션 수행을 통해 비즈니스 문해력을 향상시키는 커뮤니티 플랫폼. 구독자 기반 커뮤니티로 활동 이력을 공유하고 7일 연속 필사 달성을 핵심 습관 지표로 삼는다.

## Constraints
- **기술 스택**: Next.js + Supabase + Vercel 배포
- **인증**: 로그인/회원가입 필수 (Supabase Auth)
- **콘텐츠 출처**: AI 자동 생성(Claude/GPT API) + 관리자 큐레이션 하이브리드
- **타겟**: 사회초년생 2-30대
- **커뮤니티**: 구독자 기반 (비구독자는 진단+일부 체험만 가능)
- **플랫폼**: 웹 전용 (모바일 반응형 포함)
- **필사 완료 정의**: 제시 문장을 타이핑 제출하면 완료 (정확도 체크 없음)

## Non-Goals
- OCR / 손글씨 사진 업로드 (MVP 제외)
- 실시간 채팅 / DM 기능
- 네이티브 모바일 앱 (iOS/Android)
- 뉴스 기사 자동 크롤링 (저작권 이슈)
- 타이핑 정확도 AI 검증 (MVP 제외)

## Acceptance Criteria
- [ ] 신규 사용자가 회원가입 없이 문해력 진단 테스트(5문항 이상)를 완료하고 레벨(1~5) 결과를 확인할 수 있다
- [ ] 회원가입 후 자신의 레벨에 맞는 독해 콘텐츠(기사/지문) 1개 이상에 접근할 수 있다
- [ ] 레벨별 콘텐츠에서 어려운 어휘(한자어 등)에 마우스를 올리면 즉시 어원 설명이 표시된다
- [ ] 오늘의 필사 미션(업무 쿠션어/표현 1문장)을 타이핑 제출하면 완료 처리된다
- [ ] 7일 연속 필사 완료 시 배지/타이틀이 부여된다
- [ ] 구독자는 커뮤니티 피드에서 다른 사용자의 필사 완료 활동을 볼 수 있다
- [ ] 사용자 대시보드에서 연속 달성 스트릭과 활동 이력을 확인할 수 있다
- [ ] AI가 매일 새로운 필사 미션 문장을 생성하거나 관리자가 큐레이션한 콘텐츠가 노출된다

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 커뮤니티 = 소셜 피드 | 커뮤니티 없이도 가치 있지 않나? | 구독자 기반 활동 피드로 범위 확정 |
| 로그인 불필요 | LocalStorage로 대체 가능? | 7일 연속 측정 위해 로그인 필수로 확정 |
| 필사 = OCR/손글씨 | 구현 복잡도 | 타이핑 제출로 MVP 단순화 |
| 콘텐츠 = 크롤링 | 저작권 이슈 | AI 생성 + 관리자 큐레이션 하이브리드 |

## Technical Context
- **Frontend**: Next.js 14 (App Router)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage)
- **배포**: Vercel
- **AI API**: Claude/GPT API (콘텐츠 자동 생성)
- **스타일링**: Tailwind CSS 권장

### 핵심 DB 테이블
- `users` — id, email, level, subscription_status, created_at
- `contents` — id, level(1-5), type(article/transcription), body, vocabulary_hints(jsonb), source(ai/admin), created_at
- `transcription_missions` — id, content_id, target_sentence, category(쿠션어/업무메일/공문서)
- `submissions` — id, user_id, mission_id, typed_text, submitted_at
- `streaks` — user_id, current_streak, longest_streak, last_completed_at
- `badges` — id, user_id, badge_type, earned_at

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| User | core domain | email, level, streak_count, subscription_status | has many Submissions, has many Badges |
| DiagnosisTool | supporting | questions[], scoring_algorithm, level_result | belongs to User (result) |
| LeveledContent | core domain | level(1-5), type, body, vocabulary_hints, source | has many TranscriptionMissions |
| TranscriptionMission | core domain | target_sentence, category, difficulty | belongs to LeveledContent |
| TranscriptionSubmission | core domain | typed_text, submitted_at, completed | belongs to User, belongs to TranscriptionMission |
| CommunityFeed | supporting | posts[], subscription_required | aggregates TranscriptionSubmissions |
| ProgressTracker | supporting | streak_count, badges[], completion_history | belongs to User |
| AIContentGenerator | external system | prompt_template, generation_frequency | generates LeveledContent |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 2 | 2 | - | - | N/A |
| 2 | 12 | 10 | 0 | 2 | 17% |
| 3 | 6 | 0 | 4 | 2 | 100% (수렴) |
| 8 | 8 | 2 | 0 | 6 | 88% |

## Interview Transcript
<details>
<summary>Full Q&A (8 rounds)</summary>

### Round 1
**Q:** 사용자가 이 사이트에서 구체적으로 무엇을 하나요?
**A:** 사회초년생(2-30대)을 타겟으로 한 문해력 교정 서비스
**Ambiguity:** 89% (Goal: 0.20, Constraints: 0.15, Criteria: 0.00)

### Round 2
**Q:** 사회초년생들이 이 사이트에서 실제로 무엇을 하게 되나요?
**A:** 레벨형 독해(Lv.1~5) + 어휘 풀이 + AI Q&A + 필사 커뮤니티 + SNS 인증 챌린지 + 번역기 + 진단 도구 (다수의 아이디어 제시)
**Ambiguity:** 72% (Goal: 0.35, Constraints: 0.25, Criteria: 0.20)

### Round 3
**Q:** 만약 오늘 오후에 단 하나의 화면만 만들 수 있다면, 어떤 것인가요?
**A:** 문해력 진단 도구가 기본적으로 내장되어 있으면서 레벨형 독해 커뮤니티 + 필사 커뮤니티 플랫폼
**Ambiguity:** 62% (Goal: 0.60, Constraints: 0.40, Criteria: 0.20)

### Round 4
**Q:** (Contrarian) 커뮤니티 기능 없이도 가치 있나요?
**A:** 측정 가능한 성공 기준으로 7일 연속 필사 완료율 30% / 커뮤니티 기준: 앱 구독자 기준
**Ambiguity:** 43% (Goal: 0.70, Constraints: 0.40, Criteria: 0.55)

### Round 5
**Q:** 콘텐츠 출처는 어디서 오나요?
**A:** AI가 매일 생성 + 관리자가 직접 큐레이션
**Ambiguity:** 34% (Goal: 0.75, Constraints: 0.60, Criteria: 0.60)

### Round 6
**Q:** (Simplifier) MVP에서 로그인이 반드시 필요한가요?
**A:** (번복 후 확정) 필요해
**Ambiguity:** 28% (Goal: 0.78, Constraints: 0.75, Criteria: 0.65)

### Round 7
**Q:** "필사 미션 완료"는 어떻게 판단하나요?
**A:** 타이핑 제출 — 제시 문장을 그대로 타이핑하면 완료
**Ambiguity:** 20.4% (Goal: 0.82, Constraints: 0.78, Criteria: 0.78)

### Round 8
**Q:** 기술 스택 선호도가 있나요?
**A:** Next.js + Supabase + Vercel
**Ambiguity:** 14.4% (Goal: 0.85, Constraints: 0.90, Criteria: 0.82)

</details>
