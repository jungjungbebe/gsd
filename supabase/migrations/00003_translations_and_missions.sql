-- ============================================================
-- TRANSLATIONS (번역기 기록)
-- ============================================================
create table public.translations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  input_text text not null,
  output_text text not null,
  relation text not null,
  purpose text not null,
  formality text not null,
  likes integer default 0,
  dislikes integer default 0,
  created_at timestamptz default now()
);

alter table public.translations enable row level security;

create policy "Anyone can read translations"
  on public.translations for select using (true);
create policy "Authenticated users can insert translations"
  on public.translations for insert with check (auth.uid() = user_id);

create index idx_translations_user on public.translations(user_id);
create index idx_translations_created on public.translations(created_at desc);

-- ============================================================
-- TRANSLATION_VOTES (번역 좋아요/싫어요)
-- ============================================================
create table public.translation_votes (
  id uuid default gen_random_uuid() primary key,
  translation_id uuid references public.translations(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  vote text not null check (vote in ('like', 'dislike')),
  created_at timestamptz default now(),
  unique(translation_id, user_id)
);

alter table public.translation_votes enable row level security;

create policy "Anyone can read votes"
  on public.translation_votes for select using (true);
create policy "Authenticated users can insert votes"
  on public.translation_votes for insert with check (auth.uid() = user_id);
create policy "Users can update own votes"
  on public.translation_votes for update using (auth.uid() = user_id);

create index idx_votes_translation on public.translation_votes(translation_id);

-- ============================================================
-- MISSIONS (미션 기록)
-- ============================================================
create table public.missions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  translation_id uuid references public.translations(id) on delete set null,
  mission_type text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

alter table public.missions enable row level security;

create policy "Users can read own missions"
  on public.missions for select using (auth.uid() = user_id);
create policy "Authenticated users can insert missions"
  on public.missions for insert with check (auth.uid() = user_id);
create policy "Users can update own missions"
  on public.missions for update using (auth.uid() = user_id);

create index idx_missions_user on public.missions(user_id);
create index idx_missions_created on public.missions(created_at desc);
