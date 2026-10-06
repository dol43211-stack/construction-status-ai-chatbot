// 질문에 적힌 달로 근거 문서 좁히기 — PLAN 27번
// 질문에 "8월"처럼 달이 있으면, 그 달을 다룬 문서만 AI에게 준다.
// 다른 달 문서가 섞여 있으면 AI가 달을 헷갈려 다른 달 내용을 답하는 일이 있었기 때문이다.
// (예: 누리초 "8월" 사고 질문에 9월 문서의 "건설사고 없음"을 8월 내용처럼 답함)
// 비밀 값을 다루지 않으므로 서버·시험 어디서든 불러올 수 있다.

type Dated = { periodStart: string | null; periodEnd: string | null; writtenDate: string | null };

/** 질문에서 달 찾기: "8월" → 8, "2026년 9월" → {year: 2026, month: 9}. 없으면 null */
export function monthInQuestion(question: string): { year: number | null; month: number } | null {
  const m = /(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월/.exec(question);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year: m[1] ? Number(m[1]) : null, month };
}

/**
 * 질문의 달을 다룬 문서만 남긴다. 질문에 달이 없으면 그대로 둔다.
 * 연도가 없으면, 그 달을 다룬 문서 중 가장 최근 연도를 쓴다.
 */
export function filterByQuestionMonth<T extends Dated>(question: string, docs: T[]): T[] {
  const asked = monthInQuestion(question);
  if (!asked) return docs;

  const startOf = (d: T) => d.periodStart ?? d.writtenDate;
  const endOf = (d: T) => d.periodEnd ?? d.periodStart ?? d.writtenDate;
  const covers = (d: T, year: number) => {
    const s = startOf(d);
    const e = endOf(d);
    if (!s || !e) return false;
    const mm = String(asked.month).padStart(2, "0");
    const last = new Date(Date.UTC(year, asked.month, 0)).getUTCDate();
    return s <= `${year}-${mm}-${last}` && e >= `${year}-${mm}-01`; // 기간이 그 달과 겹친다
  };

  const year =
    asked.year ??
    Math.max(
      ...docs
        .map((d) => startOf(d))
        .filter((s): s is string => !!s)
        .map((s) => Number(s.slice(0, 4)))
        .filter((y) => docs.some((d) => covers(d, y))),
    );
  if (!Number.isFinite(year)) return [];
  return docs.filter((d) => covers(d, year));
}
