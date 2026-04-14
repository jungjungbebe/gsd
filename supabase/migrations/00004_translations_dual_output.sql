-- translations 테이블에 듀얼 결과 컬럼 추가
alter table public.translations add column if not exists output_cushion text;
alter table public.translations add column if not exists output_practical text;
alter table public.translations add column if not exists score integer default 0;
