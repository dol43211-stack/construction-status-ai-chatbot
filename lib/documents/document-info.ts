// 문서 정보(공사·문서 종류·작성일·대상 기간)의 모양과 검사 규칙 — PLAN 17번
// AI가 돌려준 답을 코드가 한 번 더 검사·보정한다. (DESIGN.md 1장 원칙 2: 꼭 지킬 규칙은 코드가 확인)
// 비밀 값을 다루지 않으므로 서버·화면·시험 어디서든 불러올 수 있다.
import { z } from "zod";

export const DOC_KINDS = ["감리보고서", "업체주간보고서", "업체월간보고서", "감독지시서", "기타"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

/** AI에게 이 모양 그대로 답하라고 요구한다. 모르는 칸은 null. */
export const aiDocumentInfoSchema = z.object({
  project_number: z
    .number()
    .int()
    .nullable()
    .describe("등록된 공사 목록에서 이 문서에 해당하는 공사의 번호(1부터). 목록에 없거나 확실하지 않으면 null"),
  doc_kind: z.enum(DOC_KINDS).nullable().describe("문서 종류. 확실하지 않으면 null"),
  written_date: z.string().nullable().describe("문서 작성일 YYYY-MM-DD. 없으면 null"),
  period_start: z.string().nullable().describe("문서가 다루는 대상 기간의 시작일 YYYY-MM-DD"),
  period_end: z.string().nullable().describe("문서가 다루는 대상 기간의 끝일 YYYY-MM-DD"),
});
export type AiDocumentInfo = z.infer<typeof aiDocumentInfoSchema>;

/** 장부(documents 표)에 저장할 문서 정보 */
export type DocumentInfo = {
  projectId: string | null;
  docKind: DocKind | null;
  writtenDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
};

export const EMPTY_INFO: DocumentInfo = {
  projectId: null,
  docKind: null,
  writtenDate: null,
  periodStart: null,
  periodEnd: null,
};

/** "2026-09-31"처럼 달력에 없는 날짜나 모양이 틀린 값은 null */
export function validDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value ? value : null;
}

/**
 * AI 답을 검사·보정해 장부에 저장할 모양으로 바꾼다.
 * - 공사 번호가 목록 범위를 벗어나면 연결하지 않는다. (AI가 없는 공사를 지어내지 못하게)
 * - 날짜는 달력에 있는 날짜만 받는다.
 * - 대상 기간 끝일이 시작일보다 앞이면 둘 다 버린다.
 * - 하루짜리 문서(감독지시서)는 대상 기간이 없으면 작성일로 채운다. (설계 검토 m-8)
 */
export function normalizeDocumentInfo(ai: AiDocumentInfo, projectIds: string[]): DocumentInfo {
  const n = ai.project_number;
  const projectId = n !== null && n >= 1 && n <= projectIds.length ? projectIds[n - 1] : null;

  const writtenDate = validDate(ai.written_date);
  let periodStart = validDate(ai.period_start);
  let periodEnd = validDate(ai.period_end);

  if (ai.doc_kind === "감독지시서" && writtenDate && !periodStart && !periodEnd) {
    periodStart = periodEnd = writtenDate;
  }
  if (periodStart && !periodEnd) periodEnd = periodStart;
  if (periodEnd && !periodStart) periodStart = periodEnd;
  if (periodStart && periodEnd && periodEnd < periodStart) periodStart = periodEnd = null;

  return { projectId, docKind: ai.doc_kind, writtenDate, periodStart, periodEnd };
}
