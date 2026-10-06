// 보고서에 쓸 문서 고르기 (서버 전용) — PLAN 19번, DESIGN.md 4.3 흐름 ② 2단계
// 미리보기(새 보고서 화면)와 초안 만들기(PLAN 20번)가 같은 함수를 써서, 보이는 문서와 실제로 쓰는 문서가 같게 한다.
import "server-only";

import type { DocKind } from "@/lib/documents/document-info";
import { belongsToReport, type Period } from "@/lib/reports/period";
import { getSupabase } from "@/lib/supabase";

export type ReportDocument = {
  id: string;
  fileName: string;
  docKind: DocKind | null;
  writtenDate: string | null;
  period: Period;
};

export type ReportDocuments = {
  /** 보고서에 쓸 문서 (직원이 확인한 것만) */
  documents: ReportDocument[];
  /** 기간은 맞지만 아직 확인하지 않은 문서 수 (설계 검토 I-9: "확인 전 문서 N건" 안내용) */
  pendingCount: number;
};

/** 공사 1건과 보고 기간에 해당하는 문서를 고른다 (대상 기간 기준) */
export async function findReportDocuments(projectId: string, report: Period): Promise<ReportDocuments> {
  // 1차: 대상 기간 시작일이 보고 기간 안에 있는 문서를 DB에서 거른다.
  const { data, error } = await getSupabase()
    .from("documents")
    .select("id, file_name, doc_kind, written_date, period_start, period_end, confirmed")
    .eq("project_id", projectId)
    .gte("period_start", report.start)
    .lte("period_start", report.end)
    .order("period_start")
    .order("written_date");
  if (error) {
    console.error(`[DB 오류] 보고서 문서 고르기: ${error.code}`);
    throw new Error("문서를 불러오지 못했습니다.");
  }

  // 2차: 보고 기간보다 긴 문서(예: 주간 보고서에 월간 문서)를 코드 규칙으로 뺀다.
  const matched = data.filter(
    (d) => d.period_start && d.period_end && belongsToReport({ start: d.period_start, end: d.period_end }, report),
  );

  return {
    documents: matched
      .filter((d) => d.confirmed)
      .map((d) => ({
        id: d.id,
        fileName: d.file_name,
        docKind: d.doc_kind,
        writtenDate: d.written_date,
        period: { start: d.period_start!, end: d.period_end! },
      })),
    pendingCount: matched.filter((d) => !d.confirmed).length,
  };
}
