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
  id uuid default gen_random_uuid() primary key,
  level integer not null check (level >= 1 and level <= 5),
  type text not null check (type in ('article', 'transcription')),
  title text not null,
  body text not null,
  vocabulary_hints jsonb default '[]'::jsonb,
  source text default 'admin' check (source in ('ai', 'admin')),
  created_at timestamptz default now()
);

alter table public.contents enable row level security;

create policy "Anyone can read contents"
  on public.contents for select using (true);

-- ============================================================
-- TRANSCRIPTION_MISSIONS
-- ============================================================
create table public.transcription_missions (
  id uuid default gen_random_uuid() primary key,
  content_id uuid references public.contents(id) on delete set null,
  target_sentence text not null,
  category text not null check (category in ('쿠션어', '업무메일', '공문서', '일반')),
  mission_date date default current_date,
  created_at timestamptz default now()
);

alter table public.transcription_missions enable row level security;

create policy "Authenticated users can read missions"
  on public.transcription_missions for select using (auth.role() = 'authenticated');

create index idx_missions_date on public.transcription_missions(mission_date);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
create table public.submissions (
  id uuid default gen_random_uuid() primary key,
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
  id uuid default gen_random_uuid() primary key,
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
  insert into public.streaks (user_id, current_streak, longest_streak, last_completed_at)
  values (new.user_id, 0, 0, null)
  on conflict (user_id) do nothing;

  select * into streak_row from public.streaks where user_id = new.user_id;

  if streak_row.last_completed_at = today then
    return new;
  elsif streak_row.last_completed_at = today - interval '1 day' then
    update public.streaks set
      current_streak = current_streak + 1,
      longest_streak = greatest(longest_streak, current_streak + 1),
      last_completed_at = today
    where user_id = new.user_id;
  else
    update public.streaks set
      current_streak = 1,
      longest_streak = greatest(longest_streak, 1),
      last_completed_at = today
    where user_id = new.user_id;
  end if;

  if (select current_streak from public.streaks where user_id = new.user_id) >= 7 then
    insert into public.badges (user_id, badge_type)
    values (new.user_id, '7day_streak')
    on conflict (user_id, badge_type) do nothing;
  end if;

  -- first_mission badge
  insert into public.badges (user_id, badge_type)
  values (new.user_id, 'first_mission')
  on conflict (user_id, badge_type) do nothing;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_submission_created
  after insert on public.submissions
  for each row execute procedure public.update_streak_on_submission();
