"use server";
// 보고서 관련 서버 함수 (DESIGN.md 6.2, 설계 검토 m-11 `previewReportDocuments`) — PLAN 19번
import { findReportDocuments, type ReportDocument } from "@/lib/data/report-documents";
import { reportPeriod, type Period, type PeriodType } from "@/lib/reports/period";

export type PreviewResult =
  | { ok: true; period: Period; documents: ReportDocument[]; pendingCount: number }
  | { ok: false; message: string };

/** 고른 공사·기간에 해당하는 문서 미리보기 (새 보고서 3단계) */
export async function previewReportDocuments(
  projectId: string,
  type: PeriodType,
  value: string,
): Promise<PreviewResult> {
  if (!projectId) return { ok: false, message: "공사를 골라주세요." };
  const period = reportPeriod(type, value);
  if (!period) return { ok: false, message: type === "weekly" ? "날짜를 골라주세요." : "연·월을 골라주세요." };

  try {
    const { documents, pendingCount } = await findReportDocuments(projectId, period);
    return { ok: true, period, documents, pendingCount };
  } catch {
    return { ok: false, message: "문서를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." };
  }
}
