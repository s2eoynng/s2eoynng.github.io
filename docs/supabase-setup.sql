-- 응원 한마디 (방명록) — Supabase 설정
-- Supabase 대시보드 → SQL Editor → New query 에 붙여넣고 Run.
--
-- 저장 데이터: 글 고유 번호(id), 별명(nickname), 메시지(message), 저장 시각(created_at)
-- 서버 측 검사: 별명 2~12자, 메시지 1~100자 (브라우저 검사와 동일 규칙)
-- 접근 규칙: 누구나 읽기/등록 가능. 수정·삭제는 익명 사용자에게 열지 않음(정책 없음 = 거부).

create table public.entries (
  id         bigint generated always as identity primary key,
  nickname   text not null check (char_length(btrim(nickname)) between 2 and 12),
  message    text not null check (char_length(btrim(message))  between 1 and 100),
  created_at timestamptz not null default now()
);

alter table public.entries enable row level security;

-- 익명(anon) 권한: 읽기(select)와 등록(insert, 두 열만)만 허용. update/delete 권한 없음.
revoke all on public.entries from anon;
grant select on public.entries to anon;
grant insert (nickname, message) on public.entries to anon;

-- 읽기: 누구나 모든 글을 볼 수 있음(즉시 노출)
create policy "anon reads all" on public.entries
  for select to anon using (true);

-- 등록: 누구나 새 글을 넣을 수 있음
create policy "anon inserts" on public.entries
  for insert to anon with check (true);

-- 수정·삭제 정책을 만들지 않음 → anon은 update/delete 불가 (RLS 기본 거부)
