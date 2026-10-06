-- 공사관리 현황 AI챗봇: 기본 표 3개와 비공개 파일 보관함 만들기
-- 설계 근거: DESIGN.md 5장 (데이터 구조)

-- ─────────────────────────────────────────────
-- 1. 공사 (projects)
-- ─────────────────────────────────────────────
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,                 -- 공사명 (중복 불가)
  created_at  timestamptz not null default now()    -- 등록 시각
);

-- ─────────────────────────────────────────────
-- 2. 올린 문서 (documents)
-- ─────────────────────────────────────────────
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.projects (id) on delete restrict, -- 연결된 공사 (AI가 못 찾으면 비어 있음)
  file_name     text not null,                                         -- 원래 파일 이름
  file_type     text not null check (file_type in ('pdf', 'hwpx', 'xlsx')),
  storage_path  text not null unique,                                  -- 보관함 안의 파일 위치
  content_hash  text not null unique,                                  -- 파일 지문 (같은 문서 두 번 올리기 방지)
  doc_kind      text check (doc_kind in ('감리보고서', '업체주간보고서', '업체월간보고서', '감독지시서', '기타')),
  written_date  date,                                                  -- 작성일
  period_start  date,                                                  -- 대상 기간 시작일
  period_end    date,                                                  -- 대상 기간 끝일
  text          text not null default '',                              -- 개인정보를 가린 본문 글자
  confirmed     boolean not null default false,                        -- 직원 확인 여부
  created_at    timestamptz not null default now(),
  constraint documents_period_order check (period_end is null or period_start is null or period_end >= period_start)
);

create index documents_project_id_idx   on public.documents (project_id);
create index documents_period_start_idx on public.documents (period_start);

-- ─────────────────────────────────────────────
-- 3. 보고서 (reports)
-- ─────────────────────────────────────────────
create table public.reports (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.projects (id) on delete restrict,
  period_type          text not null check (period_type in ('weekly', 'monthly')),  -- 주간 / 월간
  period_start         date not null,                                              -- 보고 기간 시작일
  period_end           date not null,                                              -- 보고 기간 끝일
  items                jsonb not null default '[]'::jsonb,                         -- 9개 항목 내용
  source_document_ids  uuid[] not null default '{}',                               -- 이 보고서에 쓴 문서들
  status               text not null default 'draft' check (status in ('draft', 'confirmed')),
  confirmed_at         timestamptz,                                                -- 확정 시각
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint reports_period_order check (period_end >= period_start)
);

create index reports_project_period_idx on public.reports (project_id, period_start);

-- 보고서를 고칠 때마다 updated_at(고친 시각)을 자동으로 갱신
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 4. 접근 보안 (DESIGN.md 5.4)
--    행 단위 보안(RLS)을 켜고 공개 규칙은 하나도 두지 않는다.
--    → 브라우저에서 직접 접근 불가, 서버용 키를 쓰는 서버 코드만 접근 가능
-- ─────────────────────────────────────────────
alter table public.projects  enable row level security;
alter table public.documents enable row level security;
alter table public.reports   enable row level security;

-- ─────────────────────────────────────────────
-- 5. 비공개 파일 보관함 (DESIGN.md 5.3)
--    원본 문서만 보관, 파일 1개당 4MB 제한 (PRD 6 범위)
--    보관함 파일에도 공개 규칙을 두지 않으므로 서버 코드만 접근 가능
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 4194304);
