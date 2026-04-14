-- ============================================================
-- POSTS (커뮤니티 피드 — 필사 사진 + 문장 공유)
-- ============================================================
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  body text not null,
  image_url text,
  likes_count integer default 0,
  created_at timestamptz default now()
);

alter table public.posts enable row level security;

-- 누구나 읽기 가능
create policy "Anyone can read posts"
  on public.posts for select using (true);

-- 본인만 작성
create policy "Users can insert own posts"
  on public.posts for insert with check (auth.uid() = user_id);

-- 본인만 삭제
create policy "Users can delete own posts"
  on public.posts for delete using (auth.uid() = user_id);

create index idx_posts_created_at on public.posts(created_at desc);
create index idx_posts_user_id on public.posts(user_id);

-- Realtime 활성화
alter publication supabase_realtime add table public.posts;
