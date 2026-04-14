# Implementation Plan: 문해력 교정 플랫폼 (Munhaeryeok Platform)

> Source spec: `.omc/specs/deep-interview-munhaeryeok-platform.md`
> Generated: 2026-04-06
> Stack: Next.js 14 (App Router) + Supabase + Tailwind CSS + Vercel

---

## Phase 0: Project Scaffold

**Priority:** FIRST — everything depends on this.
**Estimated effort:** 15 min

### Steps

1. Initialize Next.js 14 project with App Router:
   ```bash
   npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
   ```

2. Install dependencies:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   npm install -D supabase
   ```

3. Create environment file:

**Files to create:**

| File | Purpose |
|------|---------|
| `.env.local` | Supabase URL + anon key + service role key + AI API key |
| `src/lib/supabase/client.ts` | Browser Supabase client (createBrowserClient) |
| `src/lib/supabase/server.ts` | Server Supabase client (createServerClient with cookies) |
| `src/lib/supabase/middleware.ts` | Auth session refresh middleware helper |
| `src/middleware.ts` | Next.js middleware — refresh session + protect routes |
| `src/types/database.ts` | TypeScript types matching Supabase schema |
| `supabase/migrations/00001_initial_schema.sql` | Full DB schema (see Phase 1) |

### `.env.local` template

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

### `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

### `src/middleware.ts`

- Import `createServerClient` from `@supabase/ssr`
- Refresh auth session on every request
- Redirect unauthenticated users from `/dashboard`, `/community`, `/missions` to `/login`
- Allow unauthenticated access to: `/`, `/diagnosis`, `/login`, `/signup`, `/api/*`

---

## Phase 1: Supabase Schema

**Priority:** FIRST (parallel with scaffold)
**Estimated effort:** 20 min
**Dependencies:** Supabase project created

### File: `supabase/migrations/00001_initial_schema.sql`

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  nickname text,
  level integer default 0 check (level >= 0 and level <= 5),
  subscription_status text default 'free' check (subscription_status in ('free', 'subscriber')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can read own profile"
  on public.users for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

-- Trigger: auto-create user row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- CONTENTS
-- ============================================================
create table public.contents (
  id uuid default uuid_generate_v4() primary key,
  level integer not null check (level >= 1 and level <= 5),
  type text not null check (type in ('article', 'transcription')),
  title text not null,
  body text not null,
  vocabulary_hints jsonb default '[]'::jsonb,
  source text default 'admin' check (source in ('ai', 'admin')),
  created_at timestamptz default now()
);

alter table public.contents enable row level security;

create policy "Authenticated users can read contents"
  on public.contents for select using (auth.role() = 'authenticated');
create policy "Public can read contents (for diagnosis preview)"
  on public.contents for select using (true);

-- ============================================================
-- TRANSCRIPTION_MISSIONS
-- ============================================================
create table public.transcription_missions (
  id uuid default uuid_generate_v4() primary key,
  content_id uuid references public.contents(id) on delete cascade,
  target_sentence text not null,
  category text not null check (category in ('쿠션어', '업무메일', '공문서', '일반')),
  mission_date date default current_date,
  created_at timestamptz default now()
);

alter table public.transcription_missions enable row level security;

create policy "Authenticated users can read missions"
  on public.transcription_missions for select using (auth.role() = 'authenticated');

-- Index for daily mission lookup
create index idx_missions_date on public.transcription_missions(mission_date);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
create table public.submissions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  mission_id uuid references public.transcription_missions(id) on delete cascade not null,
  typed_text text not null,
  submitted_at timestamptz default now(),
  unique(user_id, mission_id)
);

alter table public.submissions enable row level security;

create policy "Users can read own submissions"
  on public.submissions for select using (auth.uid() = user_id);
create policy "Users can insert own submissions"
  on public.submissions for insert with check (auth.uid() = user_id);
-- Subscribers can read all submissions (community feed)
create policy "Subscribers can read all submissions"
  on public.submissions for select using (
    exists (
      select 1 from public.users
      where id = auth.uid() and subscription_status = 'subscriber'
    )
  );

-- ============================================================
-- STREAKS
-- ============================================================
create table public.streaks (
  user_id uuid references public.users(id) on delete cascade primary key,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_completed_at date
);

alter table public.streaks enable row level security;

create policy "Users can read own streak"
  on public.streaks for select using (auth.uid() = user_id);
create policy "Users can update own streak"
  on public.streaks for update using (auth.uid() = user_id);

-- ============================================================
-- BADGES
-- ============================================================
create table public.badges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  badge_type text not null check (badge_type in ('7day_streak', '30day_streak', 'first_mission', 'level_up')),
  earned_at timestamptz default now(),
  unique(user_id, badge_type)
);

alter table public.badges enable row level security;

create policy "Users can read own badges"
  on public.badges for select using (auth.uid() = user_id);

-- ============================================================
-- FUNCTION: Update streak on submission
-- ============================================================
create or replace function public.update_streak_on_submission()
returns trigger as $$
declare
  streak_row public.streaks%rowtype;
  today date := current_date;
begin
  -- Get or create streak row
  insert into public.streaks (user_id, current_streak, longest_streak, last_completed_at)
  values (new.user_id, 0, 0, null)
  on conflict (user_id) do nothing;

  select * into streak_row from public.streaks where user_id = new.user_id;

  if streak_row.last_completed_at = today then
    -- Already completed today, no change
    return new;
  elsif streak_row.last_completed_at = today - interval '1 day' then
    -- Consecutive day
    update public.streaks set
      current_streak = current_streak + 1,
      longest_streak = greatest(longest_streak, current_streak + 1),
      last_completed_at = today
    where user_id = new.user_id;
  else
    -- Streak broken, reset to 1
    update public.streaks set
      current_streak = 1,
      longest_streak = greatest(longest_streak, 1),
      last_completed_at = today
    where user_id = new.user_id;
  end if;

  -- Check for 7-day badge
  if (select current_streak from public.streaks where user_id = new.user_id) >= 7 then
    insert into public.badges (user_id, badge_type)
    values (new.user_id, '7day_streak')
    on conflict (user_id, badge_type) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_submission_created
  after insert on public.submissions
  for each row execute procedure public.update_streak_on_submission();
```

### File: `src/types/database.ts`

Define TypeScript types mirroring every table above. Key types:

```typescript
export type Database = {
  public: {
    Tables: {
      users: { Row: UserRow; Insert: UserInsert; Update: UserUpdate }
      contents: { Row: ContentRow; Insert: ContentInsert; Update: ContentUpdate }
      transcription_missions: { Row: MissionRow; Insert: MissionInsert; Update: MissionUpdate }
      submissions: { Row: SubmissionRow; Insert: SubmissionInsert; Update: SubmissionUpdate }
      streaks: { Row: StreakRow; Insert: StreakInsert; Update: StreakUpdate }
      badges: { Row: BadgeRow; Insert: BadgeInsert; Update: BadgeUpdate }
    }
  }
}

// Convenience aliases
export type UserRow = { id: string; email: string; nickname: string | null; level: number; subscription_status: 'free' | 'subscriber'; created_at: string; updated_at: string }
export type ContentRow = { id: string; level: number; type: 'article' | 'transcription'; title: string; body: string; vocabulary_hints: VocabularyHint[]; source: 'ai' | 'admin'; created_at: string }
export type VocabularyHint = { word: string; meaning: string; origin?: string }
export type MissionRow = { id: string; content_id: string; target_sentence: string; category: string; mission_date: string; created_at: string }
export type SubmissionRow = { id: string; user_id: string; mission_id: string; typed_text: string; submitted_at: string }
export type StreakRow = { user_id: string; current_streak: number; longest_streak: number; last_completed_at: string | null }
export type BadgeRow = { id: string; user_id: string; badge_type: string; earned_at: string }
```

---

## Phase 2: Auth Pages (Signup + Login)

**Priority:** HIGH — gates all authenticated features
**Dependencies:** Phase 0 + Phase 1
**Estimated effort:** 30 min

### Files to create

| File | Purpose |
|------|---------|
| `src/app/(auth)/login/page.tsx` | Login page with email/password form |
| `src/app/(auth)/signup/page.tsx` | Signup page with email/password form |
| `src/app/(auth)/layout.tsx` | Centered auth layout (no sidebar) |
| `src/app/(auth)/auth-form.tsx` | Shared form component (email + password fields) |
| `src/app/auth/callback/route.ts` | OAuth callback handler (code exchange) |
| `src/components/ui/button.tsx` | Reusable button component |
| `src/components/ui/input.tsx` | Reusable input component |

### Key logic

**`src/app/(auth)/signup/page.tsx`**
- Client component (`'use client'`)
- Form fields: email, password, nickname (optional)
- On submit: `supabase.auth.signUp({ email, password })`
- On success: redirect to `/diagnosis`
- On error: display inline error message

**`src/app/(auth)/login/page.tsx`**
- Client component
- On submit: `supabase.auth.signInWithPassword({ email, password })`
- On success: redirect to `/dashboard`
- On error: display inline error message

**`src/app/auth/callback/route.ts`**
- Server route handler
- Exchange `code` query param for session: `supabase.auth.exchangeCodeForSession(code)`
- Redirect to `/dashboard`

### Supabase queries

```typescript
// Signup
supabase.auth.signUp({ email, password, options: { data: { nickname } } })

// Login
supabase.auth.signInWithPassword({ email, password })

// Logout (used later in navbar)
supabase.auth.signOut()

// Get session (server-side)
supabase.auth.getUser()
```

---

## Phase 3: Global Layout + Navigation

**Priority:** HIGH — shared across all pages
**Dependencies:** Phase 0 + Phase 2
**Estimated effort:** 20 min

### Files to create

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout with html/body, Tailwind, font |
| `src/app/page.tsx` | Landing page — hero + CTA to diagnosis |
| `src/components/layout/navbar.tsx` | Top nav: logo, links, auth state, logout |
| `src/components/layout/footer.tsx` | Simple footer |
| `src/app/globals.css` | Tailwind directives + custom variables |

### Key logic

**`src/components/layout/navbar.tsx`**
- Server component
- Check auth state via `supabase.auth.getUser()`
- If logged in: show Dashboard, Missions, Community, user dropdown with logout
- If not logged in: show Login, Signup buttons
- Mobile: hamburger menu

---

## Phase 4: Diagnosis Tool (5-Question Literacy Quiz)

**Priority:** HIGH — first user touchpoint, works WITHOUT login
**Dependencies:** Phase 0, Phase 3
**Estimated effort:** 45 min

### Files to create

| File | Purpose |
|------|---------|
| `src/app/diagnosis/page.tsx` | Quiz page — multi-step form |
| `src/app/diagnosis/result/page.tsx` | Result page — shows level 1-5 |
| `src/lib/diagnosis/questions.ts` | 5 quiz questions with options + correct answers |
| `src/lib/diagnosis/scoring.ts` | Scoring algorithm: answers → level 1-5 |
| `src/components/diagnosis/question-card.tsx` | Single question display + option selection |
| `src/components/diagnosis/progress-bar.tsx` | Quiz progress indicator |
| `src/components/diagnosis/result-card.tsx` | Level result display with description |

### Key logic

**`src/lib/diagnosis/questions.ts`**
- Export array of 5 questions, each with:
  - `id`, `text` (question stem), `options[]` (4 choices), `correctIndex`, `difficulty` (1-5)
- Questions test: vocabulary comprehension, sentence structure, context inference, formal register, hanja-based terms

**`src/lib/diagnosis/scoring.ts`**
```typescript
export function calculateLevel(answers: number[]): number {
  // Score: correct answers weighted by difficulty
  // Map total score to level 1-5
  // Level 1: 0-20%, Level 2: 21-40%, Level 3: 41-60%, Level 4: 61-80%, Level 5: 81-100%
}
```

**`src/app/diagnosis/page.tsx`**
- Client component with `useState` for current question index + answers
- Step through 5 questions, one at a time
- On final answer: calculate level, store in `searchParams` or `sessionStorage`
- If user is logged in: save level to `users` table
- Redirect to `/diagnosis/result?level=N`

**`src/app/diagnosis/result/page.tsx`**
- Display level with description
- If not logged in: CTA "회원가입하고 맞춤 콘텐츠 시작하기" → `/signup`
- If logged in: CTA "내 레벨 콘텐츠 보기" → `/contents`

### Supabase queries

```typescript
// Save user level (after diagnosis, if logged in)
supabase.from('users').update({ level }).eq('id', userId)
```

---

## Phase 5: Leveled Content Pages (Lv.1~5 Articles with Vocabulary Hints)

**Priority:** MEDIUM-HIGH — core reading experience
**Dependencies:** Phase 1 (schema), Phase 2 (auth), Phase 4 (level assigned)
**Estimated effort:** 60 min

### Files to create

| File | Purpose |
|------|---------|
| `src/app/(protected)/contents/page.tsx` | Content listing — filtered by user's level |
| `src/app/(protected)/contents/[id]/page.tsx` | Single article view with vocabulary hints |
| `src/app/(protected)/layout.tsx` | Protected layout — auth check + sidebar |
| `src/components/content/article-card.tsx` | Content card for listing page |
| `src/components/content/vocabulary-hint.tsx` | Hover tooltip for difficult vocabulary |
| `src/components/content/article-body.tsx` | Article body renderer with inline hints |
| `src/components/content/level-badge.tsx` | Level indicator badge (Lv.1~5) |

### Key logic

**`src/components/content/vocabulary-hint.tsx`**
- Client component
- Wraps a word in a `<span>` with hover/focus event
- On hover: show tooltip with `meaning` and optional `origin`
- Accessible: keyboard focusable, `aria-describedby`
- Tailwind styling: subtle underline on hinted words, tooltip positioned above

**`src/components/content/article-body.tsx`**
- Takes `body: string` and `vocabulary_hints: VocabularyHint[]`
- Parse body text, find each hint word, wrap in `<VocabularyHint>`
- Render non-hinted text as plain paragraphs

**`src/app/(protected)/contents/page.tsx`**
- Server component
- Fetch user's level from `users` table
- Fetch contents matching that level
- Render grid of `<ArticleCard>` components
- Tab filter to browse other levels too (but highlight recommended)

### Supabase queries

```typescript
// Get user level
const { data: user } = await supabase.from('users').select('level').eq('id', userId).single()

// Get contents by level
const { data: contents } = await supabase
  .from('contents')
  .select('*')
  .eq('level', userLevel)
  .order('created_at', { ascending: false })

// Get single content by ID
const { data: content } = await supabase
  .from('contents')
  .select('*')
  .eq('id', contentId)
  .single()
```

---

## Phase 6: Daily Transcription Mission

**Priority:** HIGH — core habit loop feature
**Dependencies:** Phase 1, Phase 2, Phase 5
**Estimated effort:** 45 min

### Files to create

| File | Purpose |
|------|---------|
| `src/app/(protected)/missions/page.tsx` | Today's mission page |
| `src/components/mission/mission-display.tsx` | Shows target sentence + category |
| `src/components/mission/transcription-input.tsx` | Textarea for user typing + submit button |
| `src/components/mission/completion-banner.tsx` | Success state after submission |
| `src/app/(protected)/missions/history/page.tsx` | Past mission submissions |

### Key logic

**`src/app/(protected)/missions/page.tsx`**
- Server component
- Fetch today's mission: `transcription_missions` where `mission_date = today`
- Check if user already submitted today (join with `submissions`)
- If no mission exists for today: show "오늘의 미션 준비중" message
- Pass data to client components

**`src/components/mission/transcription-input.tsx`**
- Client component (`'use client'`)
- Display `target_sentence` prominently (large, clear font)
- Display `category` as a tag (e.g., "쿠션어")
- Textarea for user input
- Submit button
- On submit: insert into `submissions` table
- After submit: show `<CompletionBanner>` with streak update
- NO accuracy check (per spec: typing = completion)

**`src/components/mission/completion-banner.tsx`**
- Shows confetti/success animation
- Displays updated streak count
- If 7-day streak reached: show badge earned notification

### Supabase queries

```typescript
// Get today's mission
const { data: mission } = await supabase
  .from('transcription_missions')
  .select('*, contents(*)')
  .eq('mission_date', new Date().toISOString().split('T')[0])
  .single()

// Check if already submitted
const { data: existing } = await supabase
  .from('submissions')
  .select('id')
  .eq('user_id', userId)
  .eq('mission_id', missionId)
  .maybeSingle()

// Submit transcription
const { error } = await supabase
  .from('submissions')
  .insert({ user_id: userId, mission_id: missionId, typed_text: text })

// Get updated streak (after submission trigger fires)
const { data: streak } = await supabase
  .from('streaks')
  .select('*')
  .eq('user_id', userId)
  .single()
```

---

## Phase 7: Streak Tracking + Badges

**Priority:** MEDIUM — driven by DB trigger (Phase 1), UI here
**Dependencies:** Phase 1 (trigger), Phase 6 (submissions)
**Estimated effort:** 30 min

### Files to create

| File | Purpose |
|------|---------|
| `src/components/streak/streak-counter.tsx` | Visual streak display (fire icon + count) |
| `src/components/streak/streak-calendar.tsx` | 7-day calendar view showing completed days |
| `src/components/badges/badge-card.tsx` | Single badge display |
| `src/components/badges/badge-grid.tsx` | Grid of all earned badges |
| `src/components/badges/badge-earned-modal.tsx` | Modal shown when new badge earned |
| `src/lib/badges/badge-definitions.ts` | Badge metadata (name, icon, description) |

### Key logic

**`src/lib/badges/badge-definitions.ts`**
```typescript
export const BADGE_DEFINITIONS = {
  'first_mission': { name: '첫 필사', icon: '✏️', description: '첫 번째 필사 미션 완료' },
  '7day_streak': { name: '7일 연속', icon: '🔥', description: '7일 연속 필사 달성' },
  '30day_streak': { name: '30일 연속', icon: '💎', description: '30일 연속 필사 달성' },
  'level_up': { name: '레벨 업', icon: '⬆️', description: '문해력 레벨 상승' },
}
```

**`src/components/streak/streak-calendar.tsx`**
- Client component
- Fetch last 7 days of submissions
- Render 7-column grid: Mon-Sun
- Filled circles for completed days, empty for missed
- Today highlighted

### Supabase queries

```typescript
// Get user's badges
const { data: badges } = await supabase
  .from('badges')
  .select('*')
  .eq('user_id', userId)
  .order('earned_at', { ascending: false })

// Get streak
const { data: streak } = await supabase
  .from('streaks')
  .select('*')
  .eq('user_id', userId)
  .single()

// Get last 7 days of submissions (for calendar)
const { data: recentSubs } = await supabase
  .from('submissions')
  .select('submitted_at')
  .eq('user_id', userId)
  .gte('submitted_at', sevenDaysAgo.toISOString())
  .order('submitted_at', { ascending: true })
```

---

## Phase 8: Community Feed

**Priority:** MEDIUM — subscriber-only feature
**Dependencies:** Phase 2 (auth), Phase 6 (submissions exist)
**Estimated effort:** 30 min

### Files to create

| File | Purpose |
|------|---------|
| `src/app/(protected)/community/page.tsx` | Community feed — subscriber-only |
| `src/components/community/feed-item.tsx` | Single activity card |
| `src/components/community/subscription-gate.tsx` | Paywall/upgrade prompt for free users |
| `src/components/community/feed-filters.tsx` | Filter by: recent, friends, category |

### Key logic

**`src/app/(protected)/community/page.tsx`**
- Server component
- Check user's `subscription_status`
- If `'free'`: render `<SubscriptionGate>` with preview (blurred feed + CTA)
- If `'subscriber'`: fetch and display full feed

**`src/components/community/feed-item.tsx`**
- Shows: user nickname, mission category, completion time, streak count
- Does NOT show the actual typed text (privacy)
- Format: "[닉네임]님이 [카테고리] 필사를 완료했습니다 · [시간]"

**`src/components/community/subscription-gate.tsx`**
- Visual: blurred preview of feed items behind overlay
- CTA button: "구독하고 커뮤니티 참여하기"
- For MVP: link to a subscription info page (actual payment integration deferred)

### Supabase queries

```typescript
// Check subscription status
const { data: user } = await supabase
  .from('users')
  .select('subscription_status')
  .eq('id', userId)
  .single()

// Get community feed (subscriber-only, RLS enforced)
const { data: feed } = await supabase
  .from('submissions')
  .select(`
    id, submitted_at,
    users!inner(nickname),
    transcription_missions!inner(category)
  `)
  .order('submitted_at', { ascending: false })
  .limit(50)
```

---

## Phase 9: User Dashboard

**Priority:** MEDIUM — ties everything together
**Dependencies:** Phase 7 (streaks/badges), Phase 6 (submissions)
**Estimated effort:** 40 min

### Files to create

| File | Purpose |
|------|---------|
| `src/app/(protected)/dashboard/page.tsx` | Main dashboard page |
| `src/components/dashboard/stats-overview.tsx` | Key stats: level, streak, total missions |
| `src/components/dashboard/activity-history.tsx` | Chronological list of past submissions |
| `src/components/dashboard/level-progress.tsx` | Visual level indicator with re-diagnosis CTA |
| `src/components/dashboard/daily-mission-cta.tsx` | Quick link to today's mission |

### Key logic

**`src/app/(protected)/dashboard/page.tsx`**
- Server component
- Parallel data fetching:
  1. User profile (level, subscription_status)
  2. Streak data
  3. Badges
  4. Recent submissions (last 30)
  5. Today's mission status (completed or not)
- Render dashboard sections

**`src/components/dashboard/stats-overview.tsx`**
- 3-4 stat cards in a row:
  - 현재 레벨: Lv.{N}
  - 연속 달성: {streak}일
  - 최장 연속: {longest}일
  - 총 완료: {count}회

**`src/components/dashboard/daily-mission-cta.tsx`**
- If today's mission not completed: prominent "오늘의 필사 하러가기" button
- If completed: "오늘의 필사 완료!" with checkmark

### Supabase queries

```typescript
// Parallel dashboard fetch (server-side)
const [userRes, streakRes, badgesRes, submissionsRes, todayMissionRes] = await Promise.all([
  supabase.from('users').select('*').eq('id', userId).single(),
  supabase.from('streaks').select('*').eq('user_id', userId).single(),
  supabase.from('badges').select('*').eq('user_id', userId),
  supabase.from('submissions')
    .select('*, transcription_missions(target_sentence, category)')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(30),
  supabase.from('submissions')
    .select('id')
    .eq('user_id', userId)
    .gte('submitted_at', todayStart)
    .maybeSingle(),
])
```

---

## Phase 10: AI Content Generation (API Route)

**Priority:** MEDIUM — enables daily fresh missions
**Dependencies:** Phase 1 (schema)
**Estimated effort:** 40 min

### Files to create

| File | Purpose |
|------|---------|
| `src/app/api/generate-mission/route.ts` | POST: generate today's mission sentence via AI |
| `src/app/api/generate-content/route.ts` | POST: generate leveled article via AI |
| `src/lib/ai/prompts.ts` | Prompt templates for mission + content generation |
| `src/lib/ai/openai-client.ts` | OpenAI client wrapper (or Anthropic) |
| `src/app/api/cron/daily-mission/route.ts` | GET: cron endpoint to auto-generate daily mission |

### Key logic

**`src/lib/ai/prompts.ts`**
```typescript
export const MISSION_PROMPT = (category: string) => `
You are a Korean business writing expert.
Generate one natural Korean ${category} sentence suitable for a transcription exercise.
Categories: 쿠션어 (cushion phrases), 업무메일 (business email), 공문서 (official document).
Return JSON: { "sentence": "...", "category": "...", "explanation": "..." }
`

export const CONTENT_PROMPT = (level: number) => `
You are a Korean literacy education expert.
Generate a reading passage for literacy level ${level}/5.
Level 1: simple vocabulary, short sentences.
Level 5: complex hanja-based terms, long compound sentences.
Include 3-5 difficult vocabulary words with meanings.
Return JSON: {
  "title": "...",
  "body": "...",
  "vocabulary_hints": [{ "word": "...", "meaning": "...", "origin": "..." }]
}
`
```

**`src/app/api/generate-mission/route.ts`**
- Protected: check `SUPABASE_SERVICE_ROLE_KEY` or admin auth
- Call AI API with mission prompt
- Parse response JSON
- Insert into `contents` table (type: 'transcription')
- Insert into `transcription_missions` table with today's date
- Return created mission

**`src/app/api/cron/daily-mission/route.ts`**
- Vercel cron endpoint (add to `vercel.json`)
- Check if today's mission already exists
- If not: call generate-mission logic
- Secured with `CRON_SECRET` header check

### File: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-mission",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Supabase queries

```typescript
// Check if today's mission exists
const { data } = await supabase
  .from('transcription_missions')
  .select('id')
  .eq('mission_date', today)
  .maybeSingle()

// Insert generated content
const { data: content } = await supabase
  .from('contents')
  .insert({
    level: 3,
    type: 'transcription',
    title: generated.title,
    body: generated.sentence,
    vocabulary_hints: [],
    source: 'ai',
  })
  .select()
  .single()

// Insert mission
const { data: mission } = await supabase
  .from('transcription_missions')
  .insert({
    content_id: content.id,
    target_sentence: generated.sentence,
    category: generated.category,
    mission_date: today,
  })
  .select()
  .single()
```

---

## Phase 11: Seed Data + Final Polish

**Priority:** LOW — for demo/testing
**Dependencies:** All above phases
**Estimated effort:** 20 min

### Files to create

| File | Purpose |
|------|---------|
| `supabase/seed.sql` | Seed data: sample contents, missions, vocabulary |
| `src/app/not-found.tsx` | Custom 404 page |
| `src/app/error.tsx` | Global error boundary |
| `src/app/loading.tsx` | Global loading state |

---

## Implementation Order (Dependency Graph)

```
Phase 0 (Scaffold) ──┬──> Phase 2 (Auth) ──> Phase 3 (Layout/Nav)
                      │                            │
Phase 1 (Schema) ─────┤                            ▼
                      │                      Phase 4 (Diagnosis)
                      │                            │
                      ▼                            ▼
                Phase 10 (AI Gen) ──────> Phase 5 (Contents)
                                                   │
                                                   ▼
                                          Phase 6 (Missions)
                                                   │
                                            ┌──────┼──────┐
                                            ▼      ▼      ▼
                                      Phase 7  Phase 8  Phase 9
                                     (Streaks) (Community) (Dashboard)
                                            │      │      │
                                            └──────┼──────┘
                                                   ▼
                                          Phase 11 (Seed + Polish)
```

### Parallelization opportunities for executor agents

| Batch | Phases | Can run in parallel? |
|-------|--------|---------------------|
| 1 | Phase 0 + Phase 1 | YES — scaffold and schema are independent |
| 2 | Phase 2 + Phase 10 | YES — auth pages and AI routes are independent |
| 3 | Phase 3 + Phase 4 | PARTIAL — Phase 3 layout needed for Phase 4 pages |
| 4 | Phase 5 + Phase 6 | SEQUENTIAL — Phase 6 depends on Phase 5 content model |
| 5 | Phase 7 + Phase 8 + Phase 9 | YES — all three are independent leaf features |
| 6 | Phase 11 | LAST — depends on all above |

---

## Complete File Tree

```
gsd/
├── .env.local
├── vercel.json
├── supabase/
│   ├── migrations/
│   │   └── 00001_initial_schema.sql
│   └── seed.sql
├── src/
│   ├── middleware.ts
│   ├── types/
│   │   └── database.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── diagnosis/
│   │   │   ├── questions.ts
│   │   │   └── scoring.ts
│   │   ├── badges/
│   │   │   └── badge-definitions.ts
│   │   └── ai/
│   │       ├── prompts.ts
│   │       └── openai-client.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   └── input.tsx
│   │   ├── layout/
│   │   │   ├── navbar.tsx
│   │   │   └── footer.tsx
│   │   ├── diagnosis/
│   │   │   ├── question-card.tsx
│   │   │   ├── progress-bar.tsx
│   │   │   └── result-card.tsx
│   │   ├── content/
│   │   │   ├── article-card.tsx
│   │   │   ├── article-body.tsx
│   │   │   ├── vocabulary-hint.tsx
│   │   │   └── level-badge.tsx
│   │   ├── mission/
│   │   │   ├── mission-display.tsx
│   │   │   ├── transcription-input.tsx
│   │   │   └── completion-banner.tsx
│   │   ├── streak/
│   │   │   ├── streak-counter.tsx
│   │   │   └── streak-calendar.tsx
│   │   ├── badges/
│   │   │   ├── badge-card.tsx
│   │   │   ├── badge-grid.tsx
│   │   │   └── badge-earned-modal.tsx
│   │   ├── community/
│   │   │   ├── feed-item.tsx
│   │   │   ├── feed-filters.tsx
│   │   │   └── subscription-gate.tsx
│   │   └── dashboard/
│   │       ├── stats-overview.tsx
│   │       ├── activity-history.tsx
│   │       ├── level-progress.tsx
│   │       └── daily-mission-cta.tsx
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── globals.css
│       ├── not-found.tsx
│       ├── error.tsx
│       ├── loading.tsx
│       ├── (auth)/
│       │   ├── layout.tsx
│       │   ├── auth-form.tsx
│       │   ├── login/
│       │   │   └── page.tsx
│       │   └── signup/
│       │       └── page.tsx
│       ├── auth/
│       │   └── callback/
│       │       └── route.ts
│       ├── diagnosis/
│       │   ├── page.tsx
│       │   └── result/
│       │       └── page.tsx
│       ├── (protected)/
│       │   ├── layout.tsx
│       │   ├── contents/
│       │   │   ├── page.tsx
│       │   │   └── [id]/
│       │   │       └── page.tsx
│       │   ├── missions/
│       │   │   ├── page.tsx
│       │   │   └── history/
│       │   │       └── page.tsx
│       │   ├── community/
│       │   │   └── page.tsx
│       │   └── dashboard/
│       │       └── page.tsx
│       └── api/
│           ├── generate-mission/
│           │   └── route.ts
│           ├── generate-content/
│           │   └── route.ts
│           └── cron/
│               └── daily-mission/
│                   └── route.ts
```

---

## Executor Notes

1. **Start Phase 0 + Phase 1 in parallel.** Phase 0 is `create-next-app` + lib files. Phase 1 is the SQL migration file + TypeScript types.

2. **Auth is the critical path.** Nothing beyond diagnosis works without it. Get Phase 2 done immediately after scaffold.

3. **The DB trigger in Phase 1 handles streak logic automatically.** Do NOT implement streak calculation in application code. The `update_streak_on_submission()` Postgres function fires on every `submissions` insert.

4. **Vocabulary hints use JSONB.** Each content row stores `vocabulary_hints` as `[{ word, meaning, origin }]`. The `<ArticleBody>` component parses the body text and wraps matching words.

5. **RLS policies handle community access control.** The `submissions` table has a subscriber-only SELECT policy. No application-level checks needed beyond the UX gate component.

6. **For the AI API, use OpenAI by default** (GPT-4o-mini for cost efficiency). The prompts are in `src/lib/ai/prompts.ts`. If user prefers Anthropic, swap the client — the prompt templates are provider-agnostic.

7. **Vercel cron** for daily mission generation runs at midnight UTC. The endpoint must verify `CRON_SECRET` to prevent unauthorized calls.

8. **Diagnosis works without login.** This is an explicit acceptance criterion. The quiz state lives in React state, and the level result is passed via search params. Only persisted to DB if the user is authenticated.
