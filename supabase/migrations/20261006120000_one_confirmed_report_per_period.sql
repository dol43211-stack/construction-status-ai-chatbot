-- 같은 공사·같은 기간의 "확정" 보고서는 하나만 (설계 검토 m-9) — PLAN 22번
-- 화면·서버 코드에서도 막지만, 두 사람이 동시에 확정하는 경우까지 데이터베이스가 한 번 더 막는다.
-- 초안(draft)은 이 규칙에 걸리지 않는다.
create unique index reports_one_confirmed_per_period
  on public.reports (project_id, period_type, period_start)
  where status = 'confirmed';
