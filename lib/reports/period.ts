// 보고 기간 계산과 문서 고르기 규칙 (DESIGN.md 4.3 흐름 ② 1~2단계) — PLAN 19번
// 비밀 값을 다루지 않으므로 서버·화면·시험 어디서든 불러올 수 있다.
// 날짜는 모두 "YYYY-MM-DD" 글자로 다루고, 계산은 시간대 영향이 없도록 UTC로 한다.

export type PeriodType = "weekly" | "monthly";
export type Period = { start: string; end: string };

const DAY = 24 * 60 * 60 * 1000;
const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
const toText = (d: Date) => d.toISOString().slice(0, 10);

/** 날짜가 속한 주의 월요일~일요일 (주간 보고서) */
export function weekOf(date: string): Period {
  const d = toDate(date);
  const fromMonday = (d.getUTCDay() + 6) % 7; // 월=0 … 일=6
  const monday = new Date(d.getTime() - fromMonday * DAY);
  return { start: toText(monday), end: toText(new Date(monday.getTime() + 6 * DAY)) };
}

/** "2026-09" → 2026-09-01 ~ 2026-09-30 (월간 보고서) */
export function monthOf(yearMonth: string): Period {
  const [y, m] = yearMonth.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${yearMonth}-01`, end: `${yearMonth}-${String(last).padStart(2, "0")}` };
}

/** 고른 조건으로 보고 기간을 정한다. 주간은 아무 날짜, 월간은 "YYYY-MM" */
export function reportPeriod(type: PeriodType, value: string): Period | null {
  if (type === "weekly" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toDate(value).getTime())) {
    return weekOf(value);
  }
  if (type === "monthly" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return monthOf(value);
  return null;
}

/** 기간의 날 수 (시작일과 끝일 포함) */
export const daysIn = (p: Period) => Math.round((toDate(p.end).getTime() - toDate(p.start).getTime()) / DAY) + 1;

/**
 * 이 문서를 이 보고서에 쓸지 — 작성일이 아니라 "문서가 다루는 대상 기간"으로 판단한다.
 * 1) 문서 대상 기간의 시작일이 보고 기간 안에 있고
 * 2) 문서 대상 기간이 보고 기간보다 길지 않아야 한다.
 *    (예: 9월 월간보고서는 9월 첫째 주 주간 보고서에 쓰지 않는다)
 * 예) 10월 3일에 작성된 9월분 월간보고서 → 대상 기간 9월 → 9월 월간 보고서에 들어간다.
 */
export function belongsToReport(doc: Period, report: Period): boolean {
  return doc.start >= report.start && doc.start <= report.end && daysIn(doc) <= daysIn(report);
}

/** 화면 표시용: "2026-09-01 ~ 2026-09-30" / 하루면 "2026-09-18" */
export const formatPeriod = (p: Period) => (p.start === p.end ? p.start : `${p.start} ~ ${p.end}`);
